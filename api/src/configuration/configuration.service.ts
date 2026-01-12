import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateConfigDto, PublicConfigResponseDto, SsoConfigDto } from './configuration.dto';
import { GlobalConfig, AuthMode } from '@prisma/client';

@Injectable()
export class ConfigurationService implements OnModuleInit {
  private cachedConfig: GlobalConfig | null = null;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // Ensure global config exists on startup
    await this.ensureConfigExists();
  }

  private async ensureConfigExists(): Promise<GlobalConfig> {
    let config = await this.prisma.globalConfig.findUnique({
      where: { id: 'global' },
    });

    if (!config) {
      config = await this.prisma.globalConfig.create({
        data: {
          id: 'global',
          appTitle: 'My Dashboard',
          authMode: AuthMode.NONE,
          iconSourceUrl: 'https://cdn.jsdelivr.net/gh/selfhst/icons/png/',
          themeSettings: {
            mode: 'dark',
            primaryColor: '#6366f1',
            customCss: '',
          },
        },
      });
    }

    this.cachedConfig = config;
    return config;
  }

  async getConfig(): Promise<GlobalConfig> {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }
    return this.ensureConfigExists();
  }

  async getPublicConfig(): Promise<PublicConfigResponseDto> {
    const config = await this.getConfig();
    const ssoConfig = config.ssoProviderConfig as SsoConfigDto | null;

    return {
      appTitle: config.appTitle,
      authMode: config.authMode,
      allowPublicRegistration: config.allowPublicRegistration,
      iconSourceUrl: config.iconSourceUrl,
      themeSettings: config.themeSettings as any,
      ssoIssuer: ssoConfig?.issuer,
    };
  }

  async updateConfig(dto: UpdateConfigDto): Promise<GlobalConfig> {
    const config = await this.prisma.globalConfig.update({
      where: { id: 'global' },
      data: {
        ...(dto.appTitle !== undefined && { appTitle: dto.appTitle }),
        ...(dto.baseUrl !== undefined && { baseUrl: dto.baseUrl }),
        ...(dto.authMode !== undefined && { authMode: dto.authMode }),
        ...(dto.allowPublicRegistration !== undefined && { allowPublicRegistration: dto.allowPublicRegistration }),
        ...(dto.iconSourceUrl !== undefined && { iconSourceUrl: dto.iconSourceUrl }),
        ...(dto.ssoProviderConfig !== undefined && { ssoProviderConfig: dto.ssoProviderConfig }),
        ...(dto.themeSettings !== undefined && { themeSettings: dto.themeSettings }),
      },
    });

    this.cachedConfig = config;
    return config;
  }

  async getAuthMode(): Promise<AuthMode> {
    const config = await this.getConfig();
    return config.authMode;
  }

  async getSsoConfig(): Promise<SsoConfigDto | null> {
    const config = await this.getConfig();
    return config.ssoProviderConfig as SsoConfigDto | null;
  }

  invalidateCache(): void {
    this.cachedConfig = null;
  }
}
