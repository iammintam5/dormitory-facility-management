import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, AssetStatus } from '@prisma/client';
import { AuthUser } from '../auth/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { QueryAssetsDto } from './dto/query-assets.dto';
import { UpdateAssetStatusDto } from './dto/update-asset-status.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(currentUser: AuthUser, dto: CreateAssetDto) {
    await this.ensureCategoryExists(dto.categoryId);
    await this.ensureRoomExists(dto.roomId);
    await this.ensureAssetCodeUnique(dto.assetCode);

    return this.prismaService.$transaction(async (tx) => {
      const created = await tx.asset.create({
        data: {
          categoryId: dto.categoryId,
          roomId: dto.roomId ?? null,
          assetCode: dto.assetCode.trim(),
          assetName: dto.assetName.trim(),
          status: dto.status ?? AssetStatus.AVAILABLE,
          yearInUse: dto.yearInUse ?? null,
          description: dto.description?.trim() || null,
        },
        include: this.assetInclude,
      });

      await tx.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'create',
          tableName: 'assets',
          recordId: created.id,
          newValue: JSON.stringify({
            assetCode: created.assetCode,
            assetName: created.assetName,
            status: created.status,
            categoryId: created.categoryId,
            roomId: created.roomId,
          }),
        },
      });

      return created;
    });
  }

  async findAll(query: QueryAssetsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where: Prisma.AssetWhereInput = {};

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.roomId) {
      where.roomId = query.roomId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.keyword?.trim()) {
      const keyword = query.keyword.trim();
      where.OR = [
        {
          assetCode: {
            contains: keyword,
            mode: 'insensitive',
          },
        },
        {
          assetName: {
            contains: keyword,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: keyword,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prismaService.asset.findMany({
        where,
        include: this.assetInclude,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prismaService.asset.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  async findOne(id: number) {
    const asset = await this.prismaService.asset.findUnique({
      where: { id },
      include: {
        ...this.assetInclude,
        _count: {
          select: {
            handoverItems: true,
            inventoryCheckItems: true,
            damageReports: true,
            liquidationItems: true,
            maintenancePlans: true,
            maintenanceRecords: true,
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException('Khong tim thay tai san.');
    }

    return asset;
  }

  async update(currentUser: AuthUser, id: number, dto: UpdateAssetDto) {
    const existing = await this.ensureAssetExists(id);

    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    await this.ensureRoomExists(dto.roomId);
    await this.ensureAssetCodeUnique(dto.assetCode, id);

    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.asset.update({
        where: { id },
        data: {
          categoryId: dto.categoryId,
          roomId: dto.roomId === undefined ? undefined : dto.roomId ?? null,
          assetCode: dto.assetCode?.trim(),
          assetName: dto.assetName?.trim(),
          status: dto.status,
          yearInUse: dto.yearInUse === undefined ? undefined : dto.yearInUse,
          description: dto.description === undefined ? undefined : dto.description?.trim() || null,
        },
        include: this.assetInclude,
      });

      await tx.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'update',
          tableName: 'assets',
          recordId: updated.id,
          oldValue: JSON.stringify({
            assetCode: existing.assetCode,
            assetName: existing.assetName,
            status: existing.status,
            categoryId: existing.categoryId,
            roomId: existing.roomId,
          }),
          newValue: JSON.stringify({
            assetCode: updated.assetCode,
            assetName: updated.assetName,
            status: updated.status,
            categoryId: updated.categoryId,
            roomId: updated.roomId,
          }),
        },
      });

      return updated;
    });
  }

  async updateStatus(id: number, dto: UpdateAssetStatusDto) {
    await this.ensureAssetExists(id);

    return this.prismaService.asset.update({
      where: { id },
      data: {
        status: dto.status,
      },
      include: this.assetInclude,
    });
  }

  async remove(id: number) {
    await this.ensureAssetExists(id);

    const relatedCounts = await this.prismaService.asset.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            handoverItems: true,
            inventoryCheckItems: true,
            damageReports: true,
            liquidationItems: true,
            maintenancePlans: true,
            maintenanceRecords: true,
          },
        },
      },
    });

    if (!relatedCounts) {
      throw new NotFoundException('Khong tim thay tai san.');
    }

    const hasRelatedBusiness =
      relatedCounts._count.handoverItems > 0 ||
      relatedCounts._count.inventoryCheckItems > 0 ||
      relatedCounts._count.damageReports > 0 ||
      relatedCounts._count.liquidationItems > 0 ||
      relatedCounts._count.maintenancePlans > 0 ||
      relatedCounts._count.maintenanceRecords > 0;

    if (hasRelatedBusiness) {
      throw new BadRequestException(
        'Khong the xoa cung tai san khi da phat sinh nghiep vu lien quan.',
      );
    }

    await this.prismaService.asset.delete({
      where: { id },
    });

    return { message: 'Xoa tai san thanh cong.' };
  }

  private get assetInclude() {
    return {
      category: true,
      room: {
        include: {
          floor: {
            include: {
              building: true,
            },
          },
        },
      },
    } satisfies Prisma.AssetInclude;
  }

  private async ensureAssetExists(id: number) {
    const asset = await this.prismaService.asset.findUnique({
      where: { id },
    });

    if (!asset) {
      throw new NotFoundException('Khong tim thay tai san.');
    }

    return asset;
  }

  private async ensureCategoryExists(categoryId: number) {
    const category = await this.prismaService.assetCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new BadRequestException('Loai tai san khong ton tai.');
    }
  }

  private async ensureRoomExists(roomId?: number | null) {
    if (!roomId) {
      return;
    }

    const room = await this.prismaService.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new BadRequestException('Phong khong ton tai.');
    }
  }

  private async ensureAssetCodeUnique(assetCode?: string, excludeId?: number) {
    if (!assetCode?.trim()) {
      return;
    }

    const asset = await this.prismaService.asset.findFirst({
      where: {
        assetCode: assetCode.trim(),
        NOT: excludeId ? { id: excludeId } : undefined,
      },
    });

    if (asset) {
      throw new ConflictException('Ma tai san da ton tai.');
    }
  }
}
