import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetCategoryDto } from './dto/create-asset-category.dto';
import { UpdateAssetCategoryDto } from './dto/update-asset-category.dto';

@Injectable()
export class AssetCategoriesService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(dto: CreateAssetCategoryDto) {
    await this.ensureCodeUnique(dto.code);

    return this.prismaService.assetCategory.create({
      data: {
        code: dto.code.trim(),
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        maintenanceCycleMonths: dto.maintenanceCycleMonths ?? null,
      },
    });
  }

  findAll() {
    return this.prismaService.assetCategory.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const category = await this.prismaService.assetCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assets: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Khong tim thay loai tai san.');
    }

    return category;
  }

  async update(id: number, dto: UpdateAssetCategoryDto) {
    await this.ensureExists(id);
    await this.ensureCodeUnique(dto.code, id);

    return this.prismaService.assetCategory.update({
      where: { id },
      data: {
        code: dto.code?.trim(),
        name: dto.name?.trim(),
        description: dto.description === undefined ? undefined : dto.description?.trim() || null,
        maintenanceCycleMonths:
          dto.maintenanceCycleMonths === undefined ? undefined : dto.maintenanceCycleMonths,
      },
    });
  }

  async remove(id: number) {
    await this.ensureExists(id);

    const assetCount = await this.prismaService.asset.count({
      where: { categoryId: id },
    });

    if (assetCount > 0) {
      throw new BadRequestException('Khong the xoa loai tai san khi da co tai san lien ket.');
    }

    await this.prismaService.assetCategory.delete({
      where: { id },
    });

    return { message: 'Xoa loai tai san thanh cong.' };
  }

  private async ensureExists(id: number) {
    const category = await this.prismaService.assetCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Khong tim thay loai tai san.');
    }

    return category;
  }

  private async ensureCodeUnique(code?: string, excludeId?: number) {
    if (!code?.trim()) {
      return;
    }

    const category = await this.prismaService.assetCategory.findFirst({
      where: {
        code: code.trim(),
        NOT: excludeId ? { id: excludeId } : undefined,
      },
    });

    if (category) {
      throw new ConflictException('Ma loai tai san da ton tai.');
    }
  }
}
