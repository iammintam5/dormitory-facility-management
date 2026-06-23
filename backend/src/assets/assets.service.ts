import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssetStatus } from '@prisma/client';

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
  constructor(private readonly prisma: PrismaService) {}

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

  async create(payload: any) {
    const categoryId = payload.categoryId ? parseInt(String(payload.categoryId), 10) : 1;
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

    return this.formatAsset(asset);
  }

  async bulkCreate(payload: any) {
    const { prefix, startNumber, endNumber, assetName, description, status } = payload;
    const categoryId = payload.categoryId ? parseInt(String(payload.categoryId), 10) : 1;
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
    return { count: assetsData.length };
  }

  async update(id: number, payload: any) {
    const existing = await this.prisma.asset.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Asset not found');

    const data: any = {};
    if (payload.assetCode !== undefined) data.assetCode = payload.assetCode;
    if (payload.assetName !== undefined) data.assetName = payload.assetName;
    if (payload.status !== undefined) data.status = payload.status;
    if (payload.description !== undefined) data.description = payload.description;
    if (payload.categoryId !== undefined) data.categoryId = parseInt(payload.categoryId, 10);
    if (payload.roomId !== undefined) data.roomId = payload.roomId ? parseInt(payload.roomId, 10) : null;

    if (data.status && data.status !== existing.status) {
      await this.prisma.assetHistory.create({
        data: {
          assetId: id,
          action: data.status === 'UNDER_MAINTENANCE' ? 'BẢO_TRÌ' : 'CHUYỂN_TRẠNG_THÁI',
          oldStatus: existing.status,
          newStatus: data.status,
          note: `Chuyển từ ${existing.status} sang ${data.status}`,
        },
      });
    }

    const asset = await this.prisma.asset.update({
      where: { id },
      data,
      include: {
        category: true,
        room: { include: { floor: { include: { building: true } } } },
      },
    });

    return this.formatAsset(asset);
  }

  async delete(id: number) {
    const existing = await this.prisma.asset.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Asset not found');
    await this.prisma.asset.delete({ where: { id } });
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
