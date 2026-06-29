import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssetCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const categories = await this.prisma.assetCategory.findMany({
      include: { _count: { select: { assets: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return categories.map((c) => ({
      id: String(c.id),
      code: c.code,
      name: c.name,
      description: c.description,
      unit: null as string | null,
      _count: c._count,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  async create(payload: { code: string; name: string; description?: string | null; unit?: string | null }) {
    const existing = await this.prisma.assetCategory.findUnique({ where: { code: payload.code } });
    if (existing) throw new ConflictException('Category code already exists');

    const cat = await this.prisma.assetCategory.create({
      data: {
        code: payload.code,
        name: payload.name,
        description: payload.description ?? null,
      },
    });
    return {
      id: String(cat.id),
      code: cat.code,
      name: cat.name,
      description: cat.description,
      unit: null as string | null,
      _count: { assets: 0 },
      createdAt: cat.createdAt.toISOString(),
      updatedAt: cat.updatedAt.toISOString(),
    };
  }

  async update(
    id: number,
    payload: { code?: string; name?: string; description?: string | null; unit?: string | null },
  ) {
    const cat = await this.prisma.assetCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');

    const data: any = {};
    if (payload.code !== undefined) data.code = payload.code;
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.description !== undefined) data.description = payload.description;

    const updated = await this.prisma.assetCategory.update({
      where: { id },
      data,
      include: { _count: { select: { assets: true } } },
    });
    return {
      id: String(updated.id),
      code: updated.code,
      name: updated.name,
      description: updated.description,
      unit: null as string | null,
      _count: updated._count,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async delete(id: number) {
    const cat = await this.prisma.assetCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');

    const assetsCount = await this.prisma.asset.count({ where: { categoryId: id } });
    if (assetsCount > 0) {
      throw new ConflictException('Cannot delete category with existing assets');
    }

    await this.prisma.assetCategory.delete({ where: { id } });
    return { message: 'Deleted' };
  }
}
