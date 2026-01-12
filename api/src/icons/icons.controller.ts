import { Controller, Get, Param, Query, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { IconsService } from './icons.service';
import { Public } from '../common/decorators';

@ApiTags('Icons')
@Controller('icons')
export class IconsController {
  constructor(private iconsService: IconsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all available icons' })
  async getAllIcons() {
    return this.iconsService.getIconsList();
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search icons by name or slug' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (default 20)' })
  async searchIcons(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ) {
    return this.iconsService.searchIcons(query, limit || 20);
  }

  @Get('proxy/:slug')
  @Public()
  @ApiOperation({ summary: 'Proxy icon from CDN (for CORS issues)' })
  async proxyIcon(@Param('slug') slug: string, @Res() res: Response) {
    try {
      const { buffer, contentType } = await this.iconsService.proxyIcon(slug);
      
      res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      });
      
      return res.send(buffer);
    } catch (error: any) {
      return res.status(error.status || HttpStatus.NOT_FOUND).json({
        message: error.message || 'Icon not found',
      });
    }
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Get icon info by slug' })
  async getIconBySlug(@Param('slug') slug: string) {
    const icon = await this.iconsService.getIconBySlug(slug);
    if (!icon) {
      return { error: 'Icon not found' };
    }
    return icon;
  }
}
