import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { Issuer, Client, generators } from 'openid-client';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigurationService } from '../configuration/configuration.service';
import { LoginDto, RegisterDto, TokenResponseDto } from './auth.dto';
import { AuthMode, User } from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private oidcClient: Client | null = null;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private configurationService: ConfigurationService,
  ) {}

  async validateLocalUser(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await argon2.verify(user.passwordHash, password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return user;
  }

  async login(dto: LoginDto, userAgent?: string, ip?: string): Promise<TokenResponseDto> {
    const authMode = await this.configurationService.getAuthMode();
    
    if (authMode === AuthMode.NONE) {
      throw new ForbiddenException('Authentication is disabled');
    }

    if (authMode === AuthMode.SSO) {
      throw new ForbiddenException('Only SSO authentication is enabled');
    }

    const user = await this.validateLocalUser(dto.email, dto.password);
    return this.generateTokens(user, userAgent, ip);
  }

  async register(dto: RegisterDto): Promise<TokenResponseDto> {
    const config = await this.configurationService.getConfig();
    
    if (!config.allowPublicRegistration) {
      throw new ForbiddenException('Public registration is disabled');
    }

    if (config.authMode === AuthMode.NONE || config.authMode === AuthMode.SSO) {
      throw new ForbiddenException('Local registration is not available');
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          ...(dto.username ? [{ username: dto.username }] : []),
        ],
      },
    });

    if (existing) {
      throw new BadRequestException('User already exists');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        displayName: dto.displayName,
        passwordHash,
        role: 'USER',
      },
    });

    return this.generateTokens(user);
  }

  async generateTokens(user: User, userAgent?: string, ip?: string): Promise<TokenResponseDto> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        userAgent,
        ipAddress: ip,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      user: {
        id: user.id,
        email: user.email,
        username: user.username || undefined,
        displayName: user.displayName || undefined,
        role: user.role,
      },
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokenResponseDto> {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await this.prisma.session.delete({ where: { id: session.id } });
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!session.user.isActive) {
      throw new UnauthorizedException('User account is disabled');
    }

    // Delete old session
    await this.prisma.session.delete({ where: { id: session.id } });

    // Generate new tokens
    return this.generateTokens(session.user, session.userAgent || undefined, session.ipAddress || undefined);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { refreshToken },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { userId },
    });
  }

  // OIDC/SSO Methods
  async getOidcClient(): Promise<Client> {
    if (this.oidcClient) {
      return this.oidcClient;
    }

    const ssoConfig = await this.configurationService.getSsoConfig();
    if (!ssoConfig) {
      throw new BadRequestException('SSO not configured');
    }

    const discoveryUrl = ssoConfig.discoveryUrl || `${ssoConfig.issuer}/.well-known/openid-configuration`;
    const issuer = await Issuer.discover(discoveryUrl);

    this.oidcClient = new issuer.Client({
      client_id: ssoConfig.clientId,
      client_secret: ssoConfig.clientSecret,
      redirect_uris: [`${this.configService.get('API_BASE_URL')}/api/auth/sso/callback`],
      response_types: ['code'],
    });

    return this.oidcClient;
  }

  async getSsoAuthUrl(state?: string): Promise<string> {
    const client = await this.getOidcClient();
    const ssoConfig = await this.configurationService.getSsoConfig();
    
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);

    const url = client.authorizationUrl({
      scope: ssoConfig?.scopes || 'openid profile email',
      state: state || generators.state(),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return url;
  }

  async handleSsoCallback(code: string, state?: string): Promise<TokenResponseDto> {
    const client = await this.getOidcClient();
    
    const tokenSet = await client.callback(
      `${this.configService.get('API_BASE_URL')}/api/auth/sso/callback`,
      { code, state },
    );

    const userinfo = await client.userinfo(tokenSet.access_token!);

    // Find or create user
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { ssoSubject: userinfo.sub },
          { email: userinfo.email as string },
        ],
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: userinfo.email as string,
          displayName: (userinfo.name as string) || (userinfo.preferred_username as string),
          ssoSubject: userinfo.sub,
          ssoProvider: 'oidc',
          role: 'USER',
        },
      });
    } else if (!user.ssoSubject) {
      // Link existing user to SSO
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          ssoSubject: userinfo.sub,
          ssoProvider: 'oidc',
        },
      });
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokens(user);
  }

  invalidateOidcClient(): void {
    this.oidcClient = null;
  }
}
