import { IsString, IsEnum, IsOptional, IsBoolean, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthMode } from '@prisma/client';

export class SsoConfigDto {
  @ApiProperty()
  @IsString()
  clientId: string;

  @ApiProperty()
  @IsString()
  clientSecret: string;

  @ApiProperty()
  @IsString()
  issuer: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  discoveryUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scopes?: string;
}

export class ThemeSettingsDto {
  @ApiProperty({ enum: ['dark', 'light'] })
  @IsString()
  mode: 'dark' | 'light';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customCss?: string;
}

export class UpdateConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional({ enum: AuthMode })
  @IsOptional()
  @IsEnum(AuthMode)
  authMode?: AuthMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowPublicRegistration?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iconSourceUrl?: string;

  @ApiPropertyOptional({ type: SsoConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SsoConfigDto)
  ssoProviderConfig?: SsoConfigDto;

  @ApiPropertyOptional({ type: ThemeSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ThemeSettingsDto)
  themeSettings?: ThemeSettingsDto;
}

export class PublicConfigResponseDto {
  @ApiProperty()
  appTitle: string;

  @ApiProperty({ enum: AuthMode })
  authMode: AuthMode;

  @ApiProperty()
  allowPublicRegistration: boolean;

  @ApiProperty()
  iconSourceUrl: string;

  @ApiPropertyOptional()
  themeSettings?: ThemeSettingsDto;

  @ApiPropertyOptional()
  ssoIssuer?: string; // Only expose issuer for SSO redirect, not secrets
}
