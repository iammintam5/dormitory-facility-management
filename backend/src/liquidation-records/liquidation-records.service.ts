import { Injectable, BadRequestException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateCode } from '../common/utils/code-generator';
import { AssetTransitionService } from '../assets/asset-transition.service';
import { AssetStatus, LiquidationStatus, Prisma } from '@prisma/client';

const VALID_TRANSITIONS: Record<LiquidationStatus, LiquidationStatus[]> = {
  [LiquidationStatus.DRAFT]: [LiquidationStatus.PENDING_APPROVAL, LiquidationStatus.CANCELLED],
  [LiquidationStatus.PENDING_APPROVAL]: [LiquidationStatus.APPROVED, LiquidationStatus.REJECTED, LiquidationStatus.CANCELLED],
  [LiquidationStatus.APPROVED]: [LiquidationStatus.COMPLETED],
  [LiquidationStatus.REJECTED]: [LiquidationStatus.DRAFT],
  [LiquidationStatus.COMPLETED]: [],
  [LiquidationStatus.CANCELLED]: [],
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
      sourceType: r.sourceType,
      sourceMaintenanceRecordId: r.sourceMaintenanceRecordId,
      sourceInventoryItemId: r.sourceInventoryItemId,
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
    if (record.status !== LiquidationStatus.DRAFT) throw new BadRequestException('Cannot update a non-draft liquidation record');

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
      sourceType?: any;
      sourceMaintenanceRecordId?: number;
      sourceInventoryItemId?: number;
    },
  ) {
    const code = generateCode('TL-');

    // FIX 6.1: DRAFT does NOT change asset status - only creates the record
    // FIX 6.2: Check duplicate active liquidation for this asset
    return this.prisma.$transaction(async (tx) => {
      // Check if asset already has an active liquidation record (DRAFT, PENDING_APPROVAL, APPROVED)
      const activeLiquidations = await tx.liquidationItem.findFirst({
        where: {
          assetId: body.assetId,
          liquidationRecord: {
            status: {
              in: [LiquidationStatus.DRAFT, LiquidationStatus.PENDING_APPROVAL, LiquidationStatus.APPROVED],
            },
          },
        },
        include: {
          liquidationRecord: { select: { liquidationCode: true, status: true } },
        },
      });

      if (activeLiquidations) {
        throw new ConflictException(
          `Tài sản đã có trong hồ sơ thanh lý đang mở: ${activeLiquidations.liquidationRecord.liquidationCode} (${activeLiquidations.liquidationRecord.status})`
        );
      }

      // Create liquidation record (DRAFT) - no asset status change
      return tx.liquidationRecord.create({
        data: {
          liquidationCode: code,
          createdBy: userId,
          liquidationDate: new Date(body.liquidationDate),
          note: body.note ?? null,
          status: LiquidationStatus.DRAFT,
          sourceType: body.sourceType ?? 'MANUAL',
          sourceMaintenanceRecordId: body.sourceMaintenanceRecordId ?? null,
          sourceInventoryItemId: body.sourceInventoryItemId ?? null,
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
    }).then((record) => this.mapRecord(record));
  }

  async transition(id: number, action: string, userId: number) {
    // Read the record using a transaction to avoid race conditions
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.liquidationRecord.findUnique({
        where: { id },
        include: {
          liquidationItems: { include: { asset: { select: { id: true, status: true, roomId: true } } } },
          creator: { select: { id: true } },
        },
      });
      if (!record) throw new NotFoundException('Liquidation record not found');

      // Map action to new status
      const newStatus = this.actionToNewStatus(action);
      if (!newStatus) throw new BadRequestException(`Invalid action: ${action}`);

      // Validate transition matrix
      const currentStatus = record.status as LiquidationStatus;
      if (!VALID_TRANSITIONS[currentStatus]?.includes(newStatus)) {
        throw new ConflictException(
          `Không thể chuyển trạng thái thanh lý từ ${currentStatus} sang ${newStatus}`
        );
      }

      // FIX 6.5: Separation of duties - creator cannot approve own record
      if (action === 'approve' && record.creator.id === userId) {
        throw new ForbiddenException('Người tạo hồ sơ không thể tự duyệt thanh lý.');
      }

      const assetIds = record.liquidationItems.map((li: any) => li.assetId);

      // --- DRAFT -> PENDING_APPROVAL (submit) ---
      if (action === 'submit-approval') {
        if (record.liquidationItems.length === 0) {
          throw new BadRequestException('Hồ sơ thanh lý phải có ít nhất một tài sản.');
        }

        // Check each asset exists and is not already liquidated
        for (const li of record.liquidationItems) {
          const asset = li.asset;
          if (!asset) {
            throw new NotFoundException(`Tài sản ID ${li.assetId} không tồn tại.`);
          }
          if (asset.status === AssetStatus.LIQUIDATED) {
            throw new ConflictException(`Tài sản đã được thanh lý trước đó.`);
          }

          // Check asset not in another active liquidation
          const otherLiquidation = await tx.liquidationItem.findFirst({
            where: {
              assetId: li.assetId,
              liquidationRecordId: { not: id },
              liquidationRecord: {
                status: {
                  in: [LiquidationStatus.DRAFT, LiquidationStatus.PENDING_APPROVAL, LiquidationStatus.APPROVED],
                },
              },
            },
          });
          if (otherLiquidation) {
            throw new ConflictException(`Tài sản đang nằm trong hồ sơ thanh lý khác.`);
          }
        }

        // Conditional update on record
        const updatedRecord = await this.conditionalUpdate(tx, id, currentStatus, newStatus);
        if (!updatedRecord) {
          throw new ConflictException('Xung đột dữ liệu: Hồ sơ thanh lý đã bị thay đổi bởi giao dịch khác.');
        }

        // Lock assets: transition to PENDING_LIQUIDATION
        for (const li of record.liquidationItems) {
          await this.assetTransitionService.transition(tx, li.assetId, AssetStatus.PENDING_LIQUIDATION, {
            action: 'CHỜ_THANH_LÝ',
            userId,
            note: `Đưa vào danh sách thanh lý theo hồ sơ #${record.liquidationCode}`,
          });
        }

        return this.mapRecord(updatedRecord);
      }

      // --- PENDING_APPROVAL -> APPROVED ---
      if (action === 'approve') {
        const updatedRecord = await this.conditionalUpdate(tx, id, currentStatus, newStatus);
        if (!updatedRecord) {
          throw new ConflictException('Xung đột dữ liệu: Hồ sơ thanh lý đã bị thay đổi bởi giao dịch khác.');
        }
        return this.mapRecord(updatedRecord);
      }

      // --- PENDING_APPROVAL -> REJECTED ---
      if (action === 'reject') {
        const updatedRecord = await this.conditionalUpdate(tx, id, currentStatus, newStatus);
        if (!updatedRecord) {
          throw new ConflictException('Xung đột dữ liệu: Hồ sơ thanh lý đã bị thay đổi bởi giao dịch khác.');
        }

        // FIX 6.3: Restore assets to their previous status and room
        for (const li of record.liquidationItems) {
          // Find the last history entry before PENDING_LIQUIDATION
          const lastHistory = await tx.assetHistory.findFirst({
            where: { assetId: li.assetId, action: 'CHỜ_THANH_LÝ' },
            orderBy: { createdAt: 'desc' },
          });
          const revertStatus = (lastHistory?.oldStatus ?? AssetStatus.AVAILABLE) as AssetStatus;
          const revertRoomId = lastHistory?.oldRoomId ?? null;

          await this.assetTransitionService.transition(tx, li.assetId, revertStatus, {
            action: 'RESTORE_FROM_LIQUIDATION',
            userId,
            newRoomId: revertRoomId,
            note: `Từ chối thanh lý theo hồ sơ #${updatedRecord.liquidationCode} - khôi phục trạng thái ${revertStatus}`,
          });
        }

        return this.mapRecord(updatedRecord);
      }

      // --- APPROVED -> COMPLETED ---
      if (action === 'complete') {
        // Verify all items still exist and haven't been modified by other transactions
        for (const li of record.liquidationItems) {
          const asset = await tx.asset.findUnique({ where: { id: li.assetId } });
          if (!asset) {
            throw new NotFoundException(`Tài sản ID ${li.assetId} không còn tồn tại.`);
          }
        }

        const updatedRecord = await this.conditionalUpdate(tx, id, currentStatus, newStatus);
        if (!updatedRecord) {
          throw new ConflictException('Xung đột dữ liệu: Hồ sơ thanh lý đã bị thay đổi bởi giao dịch khác.');
        }

        // FIX 6.7: Complete - transition ALL assets to LIQUIDATED with roomId = null
        for (const li of record.liquidationItems) {
          await this.assetTransitionService.transition(tx, li.assetId, AssetStatus.LIQUIDATED, {
            action: 'ĐÃ_THANH_LÝ',
            userId,
            newRoomId: null,
            note: `Hoàn tất thanh lý theo hồ sơ #${updatedRecord.liquidationCode}`,
          });
        }

        return this.mapRecord(updatedRecord);
      }

      // --- DRAFT -> CANCELLED ---
      if (action === 'cancel') {
        const updatedRecord = await this.conditionalUpdate(tx, id, currentStatus, newStatus);
        if (!updatedRecord) {
          throw new ConflictException('Xung đột dữ liệu: Hồ sơ thanh lý đã bị thay đổi bởi giao dịch khác.');
        }

        // If assets were previously locked (PENDING_LIQUIDATION), restore them
        for (const li of record.liquidationItems) {
          if (li.asset?.status === AssetStatus.PENDING_LIQUIDATION) {
            const lastHistory = await tx.assetHistory.findFirst({
              where: { assetId: li.assetId, action: 'CHỜ_THANH_LÝ' },
              orderBy: { createdAt: 'desc' },
            });
            const revertStatus = (lastHistory?.oldStatus ?? AssetStatus.AVAILABLE) as AssetStatus;
            const revertRoomId = lastHistory?.oldRoomId ?? null;

            await this.assetTransitionService.transition(tx, li.assetId, revertStatus, {
              action: 'RESTORE_FROM_LIQUIDATION',
              userId,
              newRoomId: revertRoomId,
              note: `Hủy hồ sơ thanh lý #${updatedRecord.liquidationCode} - khôi phục trạng thái ${revertStatus}`,
            });
          }
        }

        return this.mapRecord(updatedRecord);
      }

      // --- REJECTED -> DRAFT ---
      if (action === 'reopen') {
        const updatedRecord = await this.conditionalUpdate(tx, id, currentStatus, newStatus);
        if (!updatedRecord) {
          throw new ConflictException('Xung đột dữ liệu: Hồ sơ thanh lý đã bị thay đổi bởi giao dịch khác.');
        }
        return this.mapRecord(updatedRecord);
      }

      throw new BadRequestException(`Invalid action: ${action}`);
    });
  }

  private actionToNewStatus(action: string): LiquidationStatus | null {
    const map: Record<string, LiquidationStatus> = {
      'submit-approval': LiquidationStatus.PENDING_APPROVAL,
      'approve': LiquidationStatus.APPROVED,
      'reject': LiquidationStatus.REJECTED,
      'complete': LiquidationStatus.COMPLETED,
      'cancel': LiquidationStatus.CANCELLED,
      'reopen': LiquidationStatus.DRAFT,
    };
    return map[action] ?? null;
  }

  private async conditionalUpdate(
    tx: Prisma.TransactionClient,
    id: number,
    expectedStatus: LiquidationStatus,
    newStatus: LiquidationStatus,
  ) {
    // Use updateMany with expected status to get conditional update
    const result = await tx.liquidationRecord.updateMany({
      where: {
        id,
        status: expectedStatus,
      },
      data: { status: newStatus },
    });

    if (result.count === 0) return null;

    // Fetch updated record
    return tx.liquidationRecord.findUnique({
      where: { id },
      include: {
        creator: true,
        liquidationItems: { include: { asset: { include: { category: true } } } },
        councilMembers: { include: { user: true } },
      },
    });
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
