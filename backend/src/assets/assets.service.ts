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
import { BulkCreateAssetDto } from './dto/bulk-create-asset.dto';
import { BulkActionDto, BulkUpdateStatusDto, BulkUpdateRoomDto } from './dto/bulk-action.dto';
import { QueryAssetsDto } from './dto/query-assets.dto';
import { UpdateAssetStatusDto } from './dto/update-asset-status.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { removeAccents } from '../utils/string.util';

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
          normalizedSearch: removeAccents(`${dto.assetCode.trim()} ${dto.assetName.trim()} ${dto.description?.trim() || ''}`),
        },
        include: this.assetInclude,
      });

      await tx.assetHistory.create({
        data: {
          assetId: created.id,
          action: 'Tạo mới',
          newStatus: created.status,
          newRoomId: created.roomId,
          note: 'Tạo tài sản mới',
        },
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

  async bulkCreate(currentUser: AuthUser, dto: BulkCreateAssetDto) {
    if (dto.endNumber < dto.startNumber) {
      throw new BadRequestException('Số kết thúc phải lớn hơn hoặc bằng số bắt đầu');
    }

    if (dto.endNumber - dto.startNumber > 100) {
      throw new BadRequestException('Chỉ được tạo tối đa 100 tài sản mỗi lần');
    }

    await this.ensureCategoryExists(dto.categoryId);
    if (dto.roomId) {
      await this.ensureRoomExists(dto.roomId);
    }

    // Prepare codes
    const codesToCreate = [];
    for (let i = dto.startNumber; i <= dto.endNumber; i++) {
      const paddedNum = i < 10 ? `0${i}` : `${i}`;
      codesToCreate.push(`${dto.prefix}${paddedNum}`);
    }

    // Check all uniqueness before transaction
    const existingAssets = await this.prismaService.asset.findMany({
      where: { assetCode: { in: codesToCreate } }
    });
    
    if (existingAssets.length > 0) {
      throw new ConflictException(`Mã tài sản đã tồn tại: ${existingAssets.map(a => a.assetCode).join(', ')}`);
    }

    return this.prismaService.$transaction(async (tx) => {
      const results = [];
      for (let i = dto.startNumber; i <= dto.endNumber; i++) {
        const paddedNum = i < 10 ? `0${i}` : `${i}`;
        const assetCode = `${dto.prefix}${paddedNum}`;

        const created = await tx.asset.create({
          data: {
            categoryId: dto.categoryId,
            roomId: dto.roomId ?? null,
            assetCode: assetCode,
            assetName: dto.assetName.trim(),
            status: AssetStatus.AVAILABLE,
            yearInUse: dto.yearInUse ?? null,
            description: dto.description?.trim() || null,
            normalizedSearch: removeAccents(`${assetCode} ${dto.assetName.trim()} ${dto.description?.trim() || ''}`),
          },
          include: this.assetInclude,
        });

        await tx.assetHistory.create({
          data: {
            assetId: created.id,
            action: 'Tạo hàng loạt',
            newStatus: created.status,
            newRoomId: created.roomId,
            note: 'Tạo hàng loạt',
          },
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

        results.push(created);
      }
      return { items: results, count: results.length };
    }, {
      timeout: 30000, // 30s to allow large bulk creates
      maxWait: 5000,
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
      const normalizedKeyword = removeAccents(keyword);
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
          normalizedSearch: {
            contains: normalizedKeyword,
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
      const finalAssetCode = dto.assetCode?.trim() ?? existing.assetCode;
      const finalAssetName = dto.assetName?.trim() ?? existing.assetName;
      const finalDescription = dto.description !== undefined ? (dto.description?.trim() || '') : (existing.description || '');
      
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
          normalizedSearch: removeAccents(`${finalAssetCode} ${finalAssetName} ${finalDescription}`),
        },
        include: this.assetInclude,
      });

      if (existing.status !== updated.status || existing.roomId !== updated.roomId) {
        await tx.assetHistory.create({
          data: {
            assetId: updated.id,
            action: 'Cập nhật',
            oldStatus: existing.status,
            newStatus: updated.status,
            oldRoomId: existing.roomId,
            newRoomId: updated.roomId,
            note: 'Cập nhật thông tin tài sản',
          },
        });
      }

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
    const existing = await this.ensureAssetExists(id);

    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.asset.update({
        where: { id },
        data: {
          status: dto.status,
        },
        include: this.assetInclude,
      });

      if (existing.status !== updated.status) {
        await tx.assetHistory.create({
          data: {
            assetId: updated.id,
            action: 'Đổi trạng thái',
            oldStatus: existing.status,
            newStatus: updated.status,
            oldRoomId: existing.roomId,
            newRoomId: updated.roomId,
            note: 'Cập nhật trạng thái nhanh',
          },
        });
      }

      return updated;
    });
  }

  async getHistory(id: number) {
    await this.ensureAssetExists(id);
    
    // fetch history
    const histories = await this.prismaService.assetHistory.findMany({
      where: { assetId: id },
      orderBy: { createdAt: 'desc' },
    });

    // fetch rooms to map oldRoom/newRoom names manually
    const roomIds = Array.from(new Set(histories.flatMap(h => [h.oldRoomId, h.newRoomId]).filter(Boolean))) as number[];
    const rooms = await this.prismaService.room.findMany({
      where: { id: { in: roomIds } }
    });
    const roomMap = new Map(rooms.map(r => [r.id, r.roomCode]));

    return histories.map(h => ({
      ...h,
      oldRoomCode: h.oldRoomId ? roomMap.get(h.oldRoomId) : null,
      newRoomCode: h.newRoomId ? roomMap.get(h.newRoomId) : null,
    }));
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

    return { message: 'Xóa tài sản thành công.' };
  }

  async bulkDelete(dto: BulkActionDto) {
    const { assetIds } = dto;
    if (!assetIds.length) return { count: 0 };

    // Check for related records
    const assetsWithRelations = await this.prismaService.asset.findMany({
      where: { id: { in: assetIds } },
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

    const undeletableAssets = assetsWithRelations.filter(
      (a) =>
        a._count.handoverItems > 0 ||
        a._count.inventoryCheckItems > 0 ||
        a._count.damageReports > 0 ||
        a._count.liquidationItems > 0 ||
        a._count.maintenancePlans > 0 ||
        a._count.maintenanceRecords > 0
    );

    if (undeletableAssets.length > 0) {
      throw new BadRequestException(
        `Không thể xóa ${undeletableAssets.length} tài sản vì đã phát sinh nghiệp vụ (bàn giao, báo hỏng...). Vui lòng bỏ chọn các tài sản này.`
      );
    }

    const { count } = await this.prismaService.asset.deleteMany({
      where: { id: { in: assetIds } },
    });

    return { count, message: `Đã xóa thành công ${count} tài sản.` };
  }

  async bulkUpdateStatus(dto: BulkUpdateStatusDto) {
    const { assetIds, status } = dto;
    if (!assetIds.length) return { count: 0 };

    const assets = await this.prismaService.asset.findMany({
      where: { id: { in: assetIds } },
    });

    if (assets.length === 0) return { count: 0 };

    return this.prismaService.$transaction(async (tx) => {
      const { count } = await tx.asset.updateMany({
        where: { id: { in: assetIds } },
        data: { status },
      });

      // Tạo history cho những asset có thay đổi status thực sự
      const historyData = assets
        .filter((a) => a.status !== status)
        .map((a) => ({
          assetId: a.id,
          action: 'Cập nhật hàng loạt',
          oldStatus: a.status,
          newStatus: status,
          oldRoomId: a.roomId,
          newRoomId: a.roomId,
          note: 'Cập nhật trạng thái hàng loạt',
        }));

      if (historyData.length > 0) {
        await tx.assetHistory.createMany({ data: historyData });
      }

      return { count, message: `Đã cập nhật trạng thái cho ${count} tài sản.` };
    });
  }

  async bulkUpdateRoom(dto: BulkUpdateRoomDto) {
    const { assetIds, roomId } = dto;
    if (!assetIds.length) return { count: 0 };

    await this.ensureRoomExists(roomId);

    const assets = await this.prismaService.asset.findMany({
      where: { id: { in: assetIds } },
    });

    if (assets.length === 0) return { count: 0 };

    return this.prismaService.$transaction(async (tx) => {
      const { count } = await tx.asset.updateMany({
        where: { id: { in: assetIds } },
        data: { roomId: roomId ?? null },
      });

      const historyData = assets
        .filter((a) => a.roomId !== (roomId ?? null))
        .map((a) => ({
          assetId: a.id,
          action: 'Chuyển phòng hàng loạt',
          oldStatus: a.status,
          newStatus: a.status,
          oldRoomId: a.roomId,
          newRoomId: roomId ?? null,
          note: 'Chuyển phòng hàng loạt',
        }));

      if (historyData.length > 0) {
        await tx.assetHistory.createMany({ data: historyData });
      }

      return { count, message: `Đã chuyển phòng cho ${count} tài sản.` };
    });
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
