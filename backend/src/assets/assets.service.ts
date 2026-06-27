import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssetStatus } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

const statusLabels: Record<string, string> = {
  AVAILABLE: 'Sẵn sàng',
  IN_USE: 'Đang sử dụng',
  UNDER_MAINTENANCE: 'Đang bảo trì',
  DAMAGED: 'Hỏng',
  PENDING_LIQUIDATION: 'Chờ thanh lý',
  LIQUIDATED: 'Đã thanh lý',
};

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(params: {
    page: number;
    pageSize: number;
    keyword?: string;
    categoryId?: number;
    buildingId?: number;
    roomId?: number;
    status?: string;
  }) {
    const { page, pageSize, keyword, categoryId, buildingId, roomId, status } = params;
    const where: any = {};

    if (keyword) {
      where.OR = [
        { assetCode: { contains: keyword, mode: 'insensitive' } },
        { assetName: { contains: keyword, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (roomId) where.roomId = roomId;
    if (status) where.status = status;
    if (buildingId) {
      where.room = { floor: { buildingId } };
    }

    const [total, assets] = await Promise.all([
      this.prisma.asset.count({ where }),
      this.prisma.asset.findMany({
        where,
        include: {
          category: true,
          room: { include: { floor: { include: { building: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = assets.map((a) => {
      const room = a.room;
      const floor = room?.floor;
      const building = floor?.building;
      return {
        id: String(a.id),
        assetCode: a.assetCode,
        assetName: a.assetName,
        categoryCode: a.category?.code ?? '',
        categoryName: a.category?.name ?? '',
        buildingCode: building?.code ?? null,
        buildingName: building?.name ?? null,
        roomCode: room?.roomCode ?? null,
        roomName: room?.roomCode ?? null,
        supplierCode: null as string | null,
        supplierName: null as string | null,
        status: a.status,
        statusLabel: statusLabels[a.status] ?? a.status,
        condition: a.status === 'DAMAGED' ? 'DAMAGED' : a.status === 'UNDER_MAINTENANCE' ? 'NEED_CHECK' : 'GOOD',
        conditionLabel: a.status === 'DAMAGED' ? 'Hỏng' : a.status === 'UNDER_MAINTENANCE' ? 'Cần kiểm tra' : 'Tốt',
        purchaseCost: null as string | null,
        purchaseDate: null as string | null,
        warrantyExpiryDate: null as string | null,
        serialNumber: null as string | null,
        description: a.description ?? null,
        notes: null as string | null,
        createdAt: a.createdAt.toISOString(),
      };
    });

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async create(payload: any, userId: number = 0) {
    if (!payload.categoryId) {
      throw new BadRequestException('categoryId is required');
    }
    const categoryId = parseInt(String(payload.categoryId), 10);
    if (isNaN(categoryId)) {
      throw new BadRequestException('Invalid categoryId');
    }
    const roomId = payload.roomId ? parseInt(String(payload.roomId), 10) : null;
    const asset = await this.prisma.asset.create({
      data: {
        assetCode: payload.assetCode,
        assetName: payload.assetName,
        categoryId,
        roomId,
        status: payload.status ?? 'AVAILABLE',
        description: payload.description ?? null,
        yearInUse: payload.purchaseDate ? new Date(payload.purchaseDate).getFullYear() : new Date().getFullYear(),
      },
      include: {
        category: true,
        room: { include: { floor: { include: { building: true } } } },
      },
    });

    // Audit log
    await this.auditLogsService.create({
      userId,
      action: 'CREATE_ASSET',
      tableName: 'assets',
      recordId: asset.id,
      content: `Tạo tài sản mới: ${asset.assetCode} - ${asset.assetName}`,
      newValue: JSON.stringify({ assetCode: asset.assetCode, categoryId, roomId }),
    });

    return this.formatAsset(asset);
  }

  async bulkCreate(payload: any, userId: number = 0) {
    const { prefix, startNumber, endNumber, assetName, description, status } = payload;
    if (!payload.categoryId) {
      throw new BadRequestException('categoryId is required');
    }
    const categoryId = parseInt(String(payload.categoryId), 10);
    if (isNaN(categoryId)) {
      throw new BadRequestException('Invalid categoryId');
    }
    const roomId = payload.roomId ? parseInt(String(payload.roomId), 10) : null;
    const assetsData: Array<{
      assetCode: string;
      assetName: string;
      categoryId: number;
      roomId: number | null;
      status: AssetStatus;
      description: string | null;
      yearInUse: number;
    }> = [];
    for (let i = startNumber; i <= endNumber; i++) {
      const code = `${prefix}${String(i).padStart(2, '0')}`;
      assetsData.push({
        assetCode: code,
        assetName: `${assetName} ${code}`,
        categoryId,
        roomId,
        status: (status ?? 'AVAILABLE') as AssetStatus,
        description: description ?? null,
        yearInUse: new Date().getFullYear(),
      });
    }

    await this.prisma.asset.createMany({ data: assetsData });

    // Audit log for bulk create
    await this.auditLogsService.create({
      userId,
      action: 'BULK_CREATE_ASSET',
      tableName: 'assets',
      content: `Tạo hàng loạt ${assetsData.length} tài sản (prefix: ${prefix}, từ ${startNumber} đến ${endNumber})`,
      newValue: JSON.stringify({ prefix, startNumber, endNumber, count: assetsData.length }),
    });

    return { count: assetsData.length };
  }

  async update(id: number, payload: any, userId: number = 0) {
    const existing = await this.prisma.asset.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Asset not found');

    if (payload.status !== undefined || payload.roomId !== undefined) {
      throw new BadRequestException('Không thể cập nhật trạng thái (status) hoặc vị trí (roomId) qua chức năng sửa thông tin cơ bản. Vui lòng sử dụng luồng nghiệp vụ.');
    }

    const data: any = {};
    if (payload.assetCode !== undefined) data.assetCode = payload.assetCode;
    if (payload.assetName !== undefined) data.assetName = payload.assetName;
    if (payload.description !== undefined) data.description = payload.description;
    if (payload.categoryId !== undefined) data.categoryId = parseInt(payload.categoryId, 10);

    const asset = await this.prisma.asset.update({
      where: { id },
      data,
      include: {
        category: true,
        room: { include: { floor: { include: { building: true } } } },
      },
    });

    // Audit log
    await this.auditLogsService.create({
      userId,
      action: 'UPDATE_ASSET',
      tableName: 'assets',
      recordId: id,
      content: `Cập nhật thông tin cơ bản tài sản #${id} (${existing.assetCode})`,
      oldValue: JSON.stringify({ assetName: existing.assetName, description: existing.description }),
      newValue: JSON.stringify(data),
    });

    return this.formatAsset(asset);
  }

  async delete(id: number, userId: number = 0) {
    const existing = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        damageReports: { take: 1 },
        maintenanceRecords: { take: 1 },
        maintenancePlans: { take: 1 },
        inventoryCheckItems: { take: 1 },
        liquidationItems: { take: 1 },
        receiptItems: { take: 1 },
        assetHistories: { take: 1 },
      },
    });
    if (!existing) throw new NotFoundException('Asset not found');

    // Soft delete: if asset has business history, mark as LIQUIDATED instead of deleting
    const hasHistory =
      existing.damageReports.length > 0 ||
      existing.maintenanceRecords.length > 0 ||
      existing.maintenancePlans.length > 0 ||
      existing.inventoryCheckItems.length > 0 ||
      existing.liquidationItems.length > 0 ||
      existing.receiptItems.length > 0 ||
      existing.assetHistories.length > 0;

    if (hasHistory) {
      await this.prisma.$transaction(async (tx) => {
        await tx.asset.update({
          where: { id },
          data: {
            status: 'LIQUIDATED',
            roomId: null,
            description: existing.description
              ? `${existing.description} (Đã xóa mềm)`
              : 'Đã xóa mềm',
          },
        });

        await tx.assetHistory.create({
          data: {
            assetId: id,
            action: 'XÓA_MỀM',
            oldStatus: existing.status,
            newStatus: 'LIQUIDATED',
            note: 'Xóa mềm tài sản (có lịch sử nghiệp vụ)',
          },
        });
      });

      // Audit log
      await this.auditLogsService.create({
        userId,
        action: 'SOFT_DELETE_ASSET',
        tableName: 'assets',
        recordId: id,
        content: `Xóa mềm tài sản #${id} (${existing.assetCode}) - có lịch sử nghiệp vụ`,
        oldValue: JSON.stringify({ status: existing.status, assetCode: existing.assetCode }),
      });

      return { message: 'Asset soft-deleted (has business history)' };
    }

    await this.prisma.asset.delete({ where: { id } });

    // Audit log
    await this.auditLogsService.create({
      userId,
      action: 'DELETE_ASSET',
      tableName: 'assets',
      recordId: id,
      content: `Xóa cứng tài sản #${id} (${existing.assetCode}) - không có lịch sử`,
    });

    return { message: 'Deleted' };
  }

  async getHistory(id: number) {
    const history = await this.prisma.assetHistory.findMany({
      where: { assetId: id },
      orderBy: { createdAt: 'desc' },
    });
    return history.map((h) => ({
      action: h.action,
      actionLabel: h.action,
      oldStatus: h.oldStatus ?? null,
      oldStatusLabel: h.oldStatus ? (statusLabels[h.oldStatus] ?? h.oldStatus) : null,
      newStatus: h.newStatus ?? null,
      newStatusLabel: h.newStatus ? (statusLabels[h.newStatus] ?? h.newStatus) : null,
      content: h.note ?? '',
      createdAt: h.createdAt.toISOString(),
    }));
  }

  private formatAsset(a: any) {
    const room = a.room;
    const floor = room?.floor;
    const building = floor?.building;
    return {
      id: String(a.id),
      assetCode: a.assetCode,
      assetName: a.assetName,
      categoryCode: a.category?.code ?? '',
      categoryName: a.category?.name ?? '',
      buildingCode: building?.code ?? null,
      buildingName: building?.name ?? null,
      roomCode: room?.roomCode ?? null,
      roomName: room?.roomCode ?? null,
      supplierCode: null as string | null,
      supplierName: null as string | null,
      status: a.status,
      statusLabel: statusLabels[a.status] ?? a.status,
      condition: a.status === 'DAMAGED' ? 'DAMAGED' : a.status === 'UNDER_MAINTENANCE' ? 'NEED_CHECK' : 'GOOD',
      conditionLabel: a.status === 'DAMAGED' ? 'Hỏng' : a.status === 'UNDER_MAINTENANCE' ? 'Cần kiểm tra' : 'Tốt',
      purchaseCost: null as string | null,
      purchaseDate: null as string | null,
      warrantyExpiryDate: null as string | null,
      serialNumber: null as string | null,
      description: a.description ?? null,
      notes: null as string | null,
      createdAt: a.createdAt.toISOString(),
    };
  }
}
