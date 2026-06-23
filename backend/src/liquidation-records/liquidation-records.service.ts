import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const WORKFLOW: Record<string, string> = {
  'submit-approval': 'PENDING_APPROVAL',
  approve: 'APPROVED',
  reject: 'REJECTED',
  complete: 'COMPLETED',
  cancel: 'CANCELLED',
};

@Injectable()
export class LiquidationRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: { page: number; pageSize: number; status?: string; keyword?: string }) {
    const { page, pageSize, status, keyword } = params;
    const where: any = {};
    if (status) where.status = status;
    if (keyword) {
      where.OR = [
        { liquidationCode: { contains: keyword, mode: 'insensitive' } },
        { note: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [total, records] = await Promise.all([
      this.prisma.liquidationRecord.count({ where }),
      this.prisma.liquidationRecord.findMany({
        where,
        include: {
          creator: true,
          liquidationItems: { include: { asset: { include: { category: true, room: { include: { floor: { include: { building: true } } } } } } } },
          councilMembers: { include: { user: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = records.map((r) => ({
      id: r.id,
      liquidationCode: r.liquidationCode,
      createdBy: r.createdBy,
      liquidationDate: r.liquidationDate.toISOString().split('T')[0],
      status: r.status,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt?.toISOString() ?? null,
      liquidationItems: r.liquidationItems.map((li) => ({
        id: li.id,
        liquidationRecordId: li.liquidationRecordId,
        assetId: li.assetId,
        assetCondition: li.assetCondition,
        reason: li.reason,
        estimatedRemainingValue: li.estimatedRemainingValue ? Number(li.estimatedRemainingValue) : null,
        asset: li.asset,
      })),
      createdByUser: {
        id: r.creator.id,
        fullName: r.creator.fullName,
        userCode: r.creator.userCode,
      },
      councilMembers: r.councilMembers,
    }));

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

  async findOne(id: number) {
    const record = await this.prisma.liquidationRecord.findUnique({
      where: { id },
      include: {
        creator: true,
        liquidationItems: { include: { asset: { include: { category: true, room: true } } } },
        councilMembers: { include: { user: true } },
      },
    });
    if (!record) throw new NotFoundException('Liquidation record not found');
    return record;
  }

  async update(id: number, body: { liquidationDate?: string; note?: string }) {
    const record = await this.prisma.liquidationRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Liquidation record not found');
    if (record.status !== 'DRAFT') throw new BadRequestException('Cannot update a non-draft liquidation record');

    return this.prisma.liquidationRecord.update({
      where: { id },
      data: {
        ...(body.liquidationDate !== undefined && { liquidationDate: new Date(body.liquidationDate) }),
        ...(body.note !== undefined && { note: body.note }),
      },
      include: {
        creator: true,
        liquidationItems: { include: { asset: { include: { category: true, room: true } } } },
        councilMembers: { include: { user: true } },
      },
    });
  }

  async create(
    userId: number,
    body: {
      assetId: number;
      liquidationDate: string;
      assetCondition: string;
      reason: string;
      estimatedRemainingValue?: number;
      note?: string;
    },
  ) {
    const count = await this.prisma.liquidationRecord.count();
    const code = `TL-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const record = await this.prisma.liquidationRecord.create({
      data: {
        liquidationCode: code,
        createdBy: userId,
        liquidationDate: new Date(body.liquidationDate),
        note: body.note ?? null,
        status: 'DRAFT',
        liquidationItems: {
          create: {
            assetId: body.assetId,
            assetCondition: body.assetCondition,
            reason: body.reason,
            estimatedRemainingValue: body.estimatedRemainingValue ?? null,
          },
        },
      },
      include: {
        creator: true,
        liquidationItems: { include: { asset: true } },
      },
    });

    await this.prisma.asset.update({
      where: { id: body.assetId },
      data: { status: 'PENDING_LIQUIDATION' },
    });

    return record;
  }

  async transition(id: number, action: string, userId: number) {
    const record = await this.prisma.liquidationRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Liquidation record not found');

    const newStatus = WORKFLOW[action];
    if (!newStatus) throw new NotFoundException(`Invalid action: ${action}`);

    const updated = await this.prisma.liquidationRecord.update({
      where: { id },
      data: { status: newStatus as any },
      include: {
        creator: true,
        liquidationItems: { include: { asset: { include: { category: true } } } },
        councilMembers: { include: { user: true } },
      },
    });

    if (action === 'complete') {
      const assetIds = updated.liquidationItems.map((li) => li.assetId);
      await this.prisma.asset.updateMany({
        where: { id: { in: assetIds } },
        data: { status: 'LIQUIDATED' },
      });
    }

    if (action === 'reject') {
      const assetIds = updated.liquidationItems.map((li) => li.assetId);
      await this.prisma.asset.updateMany({
        where: { id: { in: assetIds } },
        data: { status: 'IN_USE' },
      });
    }

    return updated;
  }

  async exportData(id: number) {
    const record = await this.findOne(id);
    const asset = record.liquidationItems[0]?.asset;
    return {
      ...record,
      printable: {
        title: 'Biên bản thanh lý tài sản',
        generatedAt: new Date().toISOString(),
        assetLabel: asset ? `${asset.assetCode} - ${asset.assetName}` : '--',
        createdByLabel: record.creator?.fullName ?? '--',
      },
    };
  }
}
