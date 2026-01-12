import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Category } from '@prisma/client';

export interface CreateCategoryDto {
  name: string;
  icon?: string;
  sortOrder?: number;
  isPublic?: boolean;
}

export interface UpdateCategoryDto {
  name?: string;
  icon?: string;
  sortOrder?: number;
  isPublic?: boolean;
}

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(isAuthenticated: boolean): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: isAuthenticated ? {} : { isPublic: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const existing = await this.prisma.category.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException('Category with this name already exists');
    }

    const maxSort = await this.prisma.category.aggregate({
      _max: { sortOrder: true },
    });

    return this.prisma.category.create({
      data: {
        name: dto.name,
        icon: dto.icon,
        sortOrder: dto.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
        isPublic: dto.isPublic ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const existing = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    if (dto.name && dto.name !== existing.name) {
      const nameConflict = await this.prisma.category.findUnique({
        where: { name: dto.name },
      });
      if (nameConflict) {
        throw new BadRequestException('Category with this name already exists');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    // Move services in this category to 'Default'
    await this.prisma.service.updateMany({
      where: { category: existing.name },
      data: { category: 'Default' },
    });

    await this.prisma.category.delete({
      where: { id },
    });
  }

  async reorder(categoryIds: string[]): Promise<Category[]> {
    const updates = categoryIds.map((id, index) =>
      this.prisma.category.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );

    await this.prisma.$transaction(updates);
    return this.findAll(true);
  }
}
