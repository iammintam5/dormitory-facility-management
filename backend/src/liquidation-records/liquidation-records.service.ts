import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateCode } from '../common/utils/code-generator';

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

    return {
      items: records.map((r) => this.mapRecord(r)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  private mapRecord(r: any) {
    return {
      id: r.id,
      liquidationCode: r.liquidationCode,
      createdBy: r.createdBy,
      liquidationDate: r.liquidationDate instanceof Date ? r.liquidationDate.toISOString().split('T')[0] : r.liquidationDate,
      status: r.status,
      note: r.note,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      updatedAt: r.updatedAt ? (r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt) : null,
      liquidationItems: (r.liquidationItems ?? []).map((li: any) => ({
        id: li.id,
        liquidationRecordId: li.liquidationRecordId,
        assetId: li.assetId,
        assetCondition: li.assetCondition,
        reason: li.reason,
        estimatedRemainingValue: li.estimatedRemainingValue ? Number(li.estimatedRemainingValue) : null,
        asset: li.asset,
      })),
      createdByUser: r.creator ? {
        id: r.creator.id,
        fullName: r.creator.fullName,
        userCode: r.creator.userCode,
      } : undefined,
      councilMembers: r.councilMembers,
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
    return this.mapRecord(record);
  }

  async update(id: number, body: { liquidationDate?: string; note?: string }) {
    const record = await this.prisma.liquidationRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Liquidation record not found');
    if (record.status !== 'DRAFT') throw new BadRequestException('Cannot update a non-draft liquidation record');

    const updated = await this.prisma.liquidationRecord.update({
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
    return this.mapRecord(updated);
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
    const code = generateCode('TL-');

    const record = await this.prisma.$transaction(async (tx) => {
      // Update asset status to PENDING_LIQUIDATION
      await tx.asset.update({
        where: { id: body.assetId },
        data: { status: 'PENDING_LIQUIDATION' },
      });

      await tx.assetHistory.create({
        data: {
          assetId: body.assetId,
          action: 'CHỜ_THANH_LÝ',
          newStatus: 'PENDING_LIQUIDATION',
          note: 'Đưa vào danh sách thanh lý',
        },
      });

      // Create liquidation record
      return tx.liquidationRecord.create({
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
    });

    return this.mapRecord(record);
  }

  async transition(id: number, action: string, userId: number) {
    const record = await this.prisma.liquidationRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Liquidation record not found');

    const newStatus = WORKFLOW[action];
    if (!newStatus) throw new NotFoundException(`Invalid action: ${action}`);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedRecord = await tx.liquidationRecord.update({
        where: { id },
        data: { status: newStatus as any },
        include: {
          creator: true,
          liquidationItems: { include: { asset: { include: { category: true } } } },
          councilMembers: { include: { user: true } },
        },
      });

      const assetIds = updatedRecord.liquidationItems.map((li: any) => li.assetId);

      if (action === 'complete') {
        await tx.asset.updateMany({
          where: { id: { in: assetIds } },
          data: { status: 'LIQUIDATED' },
        });

        for (const assetId of assetIds) {
          await tx.assetHistory.create({
            data: {
              assetId,
              action: 'ĐÃ_THANH_LÝ',
              newStatus: 'LIQUIDATED',
              note: `Hoàn tất thanh lý theo hồ sơ #${updatedRecord.liquidationCode}`,
            },
          });
        }
      }

      if (action === 'reject') {
        await tx.asset.updateMany({
          where: { id: { in: assetIds } },
          data: { status: 'IN_USE' },
        });

        for (const assetId of assetIds) {
          await tx.assetHistory.create({
            data: {
              assetId,
              action: 'HỦY_THANH_LÝ',
              newStatus: 'IN_USE',
              note: `Hủy thanh lý theo hồ sơ #${updatedRecord.liquidationCode}`,
            },
          });
        }
      }

      return updatedRecord;
    });

    return this.mapRecord(updated);
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
        createdByLabel: record.createdByUser?.fullName ?? '--',
      },
    };
  }
}
