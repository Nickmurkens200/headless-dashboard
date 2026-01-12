import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigurationService } from './configuration.service';
import { UpdateConfigDto, PublicConfigResponseDto } from './configuration.dto';
import { Public, Roles } from '../common/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Configuration')
@Controller('config')
export class ConfigurationController {
  constructor(private configService: ConfigurationService) {}

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Get public configuration (no auth required)' })
  async getPublicConfig(): Promise<PublicConfigResponseDto> {
    return this.configService.getPublicConfig();
  }

  @Get('auth')
  @Public()
  @ApiOperation({ summary: 'Get auth configuration for login flow' })
  async getAuthConfig() {
    const config = await this.configService.getPublicConfig();
    return {
      authMode: config.authMode,
      allowPublicRegistration: config.allowPublicRegistration,
      ssoIssuer: config.ssoIssuer,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get full configuration (admin only)' })
  async getFullConfig() {
    return this.configService.getConfig();
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update configuration (admin only)' })
  async updateConfig(@Body() dto: UpdateConfigDto) {
    return this.configService.updateConfig(dto);
  }
}
