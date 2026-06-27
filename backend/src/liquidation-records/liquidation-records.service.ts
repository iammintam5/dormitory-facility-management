import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateCode } from '../common/utils/code-generator';
import { AssetTransitionService } from '../assets/asset-transition.service';
import { AssetStatus } from '@prisma/client';

const WORKFLOW: Record<string, string> = {
  'submit-approval': 'PENDING_APPROVAL',
  approve: 'APPROVED',
  reject: 'REJECTED',
  complete: 'COMPLETED',
  cancel: 'CANCELLED',
};

@Injectable()
export class LiquidationRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetTransitionService: AssetTransitionService,
  ) {}

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
      await this.assetTransitionService.transition(tx, body.assetId, AssetStatus.PENDING_LIQUIDATION, {
        action: 'CHỜ_THANH_LÝ',
        userId,
        note: 'Đưa vào danh sách thanh lý',
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

    const VALID_TRANSITIONS: Record<string, string[]> = {
      'DRAFT': ['PENDING_APPROVAL', 'CANCELLED'],
      'PENDING_APPROVAL': ['APPROVED', 'REJECTED', 'CANCELLED'],
      'APPROVED': ['COMPLETED', 'CANCELLED'],
      'REJECTED': [],
      'COMPLETED': [],
      'CANCELLED': []
    };

    if (!VALID_TRANSITIONS[record.status]?.includes(newStatus)) {
      throw new ConflictException(`Không thể chuyển trạng thái thanh lý từ ${record.status} sang ${newStatus}`);
    }

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
        for (const assetId of assetIds) {
          await this.assetTransitionService.transition(tx, assetId, AssetStatus.LIQUIDATED, {
            action: 'ĐÃ_THANH_LÝ',
            userId,
            newRoomId: null, // ensure removed from room
            note: `Hoàn tất thanh lý theo hồ sơ #${updatedRecord.liquidationCode}`,
          });
        }
      }

      if (action === 'reject') {
        for (const assetId of assetIds) {
          // Find the last status before PENDING_LIQUIDATION to revert
          const lastHistory = await tx.assetHistory.findFirst({
            where: { assetId, action: 'CHỜ_THANH_LÝ' },
            orderBy: { createdAt: 'desc' },
          });
          const revertStatus = (lastHistory?.oldStatus ?? AssetStatus.AVAILABLE) as AssetStatus;

          await this.assetTransitionService.transition(tx, assetId, revertStatus, {
            action: 'HỦY_THANH_LÝ',
            userId,
            note: `Hủy thanh lý theo hồ sơ #${updatedRecord.liquidationCode}`,
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
