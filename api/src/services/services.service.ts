import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigurationService } from '../configuration/configuration.service';
import { CreateServiceDto, UpdateServiceDto, ServiceQueryDto, ReorderServicesDto } from './services.dto';
import { Service, Prisma } from '@prisma/client';

@Injectable()
export class ServicesService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigurationService,
  ) {}

  async findAll(query: ServiceQueryDto, isAuthenticated: boolean): Promise<Service[]> {
    const where: Prisma.ServiceWhereInput = {
      isEnabled: query.isEnabled ?? true,
    };

    // If not authenticated, only show public services
    if (!isAuthenticated) {
      where.isPublic = true;
    } else if (query.isPublic !== undefined) {
      where.isPublic = query.isPublic;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const services = await this.prisma.service.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    // Resolve icon URLs
    const config = await this.configService.getConfig();
    return services.map(service => ({
      ...service,
      iconUrl: this.resolveIconUrl(service, config.iconSourceUrl),
    }));
  }

  async findOne(id: string): Promise<Service> {
    const service = await this.prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const config = await this.configService.getConfig();
    return {
      ...service,
      iconUrl: this.resolveIconUrl(service, config.iconSourceUrl),
    };
  }

  async create(dto: CreateServiceDto): Promise<Service> {
    // Get max sort order for category
    const maxSort = await this.prisma.service.aggregate({
      where: { category: dto.category || 'Default' },
      _max: { sortOrder: true },
    });

    const service = await this.prisma.service.create({
      data: {
        ...dto,
        sortOrder: dto.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
      },
    });

    const config = await this.configService.getConfig();
    return {
      ...service,
      iconUrl: this.resolveIconUrl(service, config.iconSourceUrl),
    };
  }

  async update(id: string, dto: UpdateServiceDto): Promise<Service> {
    const existing = await this.prisma.service.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Service not found');
    }

    const service = await this.prisma.service.update({
      where: { id },
      data: dto,
    });

    const config = await this.configService.getConfig();
    return {
      ...service,
      iconUrl: this.resolveIconUrl(service, config.iconSourceUrl),
    };
  }

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.service.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Service not found');
    }

    await this.prisma.service.delete({
      where: { id },
    });
  }

  async reorder(dto: ReorderServicesDto): Promise<Service[]> {
    const updates = dto.serviceIds.map((id, index) =>
      this.prisma.service.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );

    await this.prisma.$transaction(updates);
    return this.findAll({}, true);
  }

  async checkHealth(id: string): Promise<{ status: string; responseTime?: number }> {
    const service = await this.prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const urlToCheck = service.healthCheckUrl || service.url;
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(urlToCheck, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const responseTime = Date.now() - startTime;
      const status = response.ok ? 'online' : 'offline';

      await this.prisma.service.update({
        where: { id },
        data: {
          lastHealthCheck: new Date(),
          lastHealthStatus: status,
        },
      });

      return { status, responseTime };
    } catch (error) {
      await this.prisma.service.update({
        where: { id },
        data: {
          lastHealthCheck: new Date(),
          lastHealthStatus: 'offline',
        },
      });

      return { status: 'offline' };
    }
  }

  async checkAllHealth(): Promise<Array<{ id: string; status: string; responseTime?: number }>> {
    const services = await this.prisma.service.findMany({
      where: { isEnabled: true },
    });

    const results = await Promise.all(
      services.map(async (service) => {
        const result = await this.checkHealth(service.id);
        return { id: service.id, ...result };
      }),
    );

    return results;
  }

  async getCategories(): Promise<string[]> {
    const services = await this.prisma.service.findMany({
      where: { isEnabled: true },
      select: { category: true },
      distinct: ['category'],
    });

    return services.map(s => s.category).filter(Boolean);
  }

  private resolveIconUrl(service: Service, iconSourceUrl: string): string | null {
    // If iconUrl is already set, use it
    if (service.iconUrl) {
      return service.iconUrl;
    }

    // If iconSlug is set, build URL from source
    if (service.iconSlug) {
      const baseUrl = iconSourceUrl.endsWith('/') ? iconSourceUrl : `${iconSourceUrl}/`;
      return `${baseUrl}${service.iconSlug}.png`;
    }

    return null;
  }
}
