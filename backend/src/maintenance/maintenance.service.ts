import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateCode } from '../common/utils/code-generator';
import { AssetTransitionService } from '../assets/asset-transition.service';
import { AssetStatus, MaintenanceType, MaintenanceResultStatus } from '@prisma/client';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetTransitionService: AssetTransitionService
  ) {}

  private mapPlan(r: any) {
    return {
      id: r.id,
      assetId: r.assetId,
      createdBy: r.createdBy,
      cycleMonths: r.cycleMonths,
      nextDueDate: r.nextDueDate instanceof Date ? r.nextDueDate.toISOString().split('T')[0] : r.nextDueDate,
      isActive: r.isActive,
      note: r.note,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      updatedAt: r.updatedAt ? (r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt) : null,
      asset: r.asset,
      createdByUser: r.creator,
      maintenanceRecords: r.maintenanceRecords,
    };
  }

  private mapRecord(r: any) {
    return {
      id: r.id,
      maintenanceCode: r.maintenanceCode,
      planId: r.planId,
      assetId: r.assetId,
      performedBy: r.performedBy,
      maintenanceDate: r.maintenanceDate instanceof Date ? r.maintenanceDate.toISOString().split('T')[0] : r.maintenanceDate,
      maintenanceType: r.maintenanceType,
      content: r.content,
      resultStatus: r.resultStatus,
      nextMaintenanceDate: r.nextMaintenanceDate ? (r.nextMaintenanceDate instanceof Date ? r.nextMaintenanceDate.toISOString().split('T')[0] : r.nextMaintenanceDate) : null,
      cost: r.cost ? Number(r.cost) : null,
      materialNote: r.materialNote,
      note: r.note,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      updatedAt: r.updatedAt ? (r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt) : null,
      asset: r.asset,
      plan: r.plan,
      performedByUser: r.performer,
    };
  }

  async getPlans() {
    const plans = await this.prisma.maintenancePlan.findMany({
      include: {
        asset: { include: { category: true } },
        creator: true,
        maintenanceRecords: true,
      },
      orderBy: { nextDueDate: 'asc' },
    });
    return plans.map((p) => this.mapPlan(p));
  }

  async getRecords(params: { page: number; pageSize: number }) {
    const { page, pageSize } = params;
    const [total, records] = await Promise.all([
      this.prisma.maintenanceRecord.count(),
      this.prisma.maintenanceRecord.findMany({
        include: {
          asset: { include: { category: true, room: { include: { floor: { include: { building: true } } } } } },
          plan: true,
          performer: true,
        },
        orderBy: { maintenanceDate: 'desc' },
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

  async createRecord(
    userId: number,
    body: {
      planId?: number;
      assetId: number;
      maintenanceDate: string;
      maintenanceType: MaintenanceType;
      content: string;
      resultStatus: MaintenanceResultStatus;
      nextMaintenanceDate?: string;
      cost?: number;
      materialNote?: string;
      note?: string;
    },
  ) {
    const code = generateCode('BT-');

    const record = await this.prisma.$transaction(async (tx) => {
      const rec = await tx.maintenanceRecord.create({
        data: {
          maintenanceCode: code,
          assetId: body.assetId,
          performedBy: userId,
          maintenanceDate: new Date(body.maintenanceDate),
          maintenanceType: body.maintenanceType,
          content: body.content,
          resultStatus: body.resultStatus,
          planId: body.planId ?? null,
          nextMaintenanceDate: body.nextMaintenanceDate ? new Date(body.nextMaintenanceDate) : null,
          cost: body.cost ?? null,
          materialNote: body.materialNote ?? null,
          note: body.note ?? null,
        },
        include: {
          asset: { include: { category: true, room: { include: { floor: { include: { building: true } } } } } },
          plan: true,
          performer: true,
        },
      });

      let nextStatus: AssetStatus | null = null;
      if (body.resultStatus === 'NEED_REPAIR') nextStatus = AssetStatus.UNDER_MAINTENANCE;
      else if (body.resultStatus === 'RECOMMEND_LIQUIDATION') nextStatus = AssetStatus.DAMAGED;
      else if (body.resultStatus === 'GOOD' || body.resultStatus === 'NEED_MONITORING') {
        const asset = await tx.asset.findUnique({ where: { id: body.assetId } });
        nextStatus = asset?.roomId ? AssetStatus.IN_USE : AssetStatus.AVAILABLE;
      }

      if (nextStatus) {
        await this.assetTransitionService.transition(tx, body.assetId, nextStatus, {
          action: 'BẢO_TRÌ',
          userId,
          note: `Bảo trì: ${body.resultStatus}`,
        });
      }

      return rec;
    });

    return this.mapRecord(record);
  }

  async updateRecord(
    id: number,
    userId: number,
    body: {
      maintenanceDate?: string;
      maintenanceType?: MaintenanceType;
      content?: string;
      resultStatus?: MaintenanceResultStatus;
      nextMaintenanceDate?: string;
      cost?: number;
      materialNote?: string;
      note?: string;
    },
  ) {
    const record = await this.prisma.maintenanceRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Maintenance record not found');

    const updateData: any = {};
    if (body.maintenanceDate !== undefined) updateData.maintenanceDate = new Date(body.maintenanceDate);
    if (body.maintenanceType !== undefined) updateData.maintenanceType = body.maintenanceType;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.resultStatus !== undefined) updateData.resultStatus = body.resultStatus;
    if (body.nextMaintenanceDate !== undefined) updateData.nextMaintenanceDate = body.nextMaintenanceDate ? new Date(body.nextMaintenanceDate) : null;
    if (body.cost !== undefined) updateData.cost = body.cost;
    if (body.materialNote !== undefined) updateData.materialNote = body.materialNote;
    if (body.note !== undefined) updateData.note = body.note;

    const recordUpdate = await this.prisma.$transaction(async (tx) => {
      const updatedRec = await tx.maintenanceRecord.update({
        where: { id },
        data: updateData,
        include: {
          asset: { include: { category: true, room: { include: { floor: { include: { building: true } } } } } },
          plan: true,
          performer: true,
        },
      });

      if (body.resultStatus && body.resultStatus !== record.resultStatus) {
        let nextStatus: AssetStatus | null = null;
        if (body.resultStatus === 'NEED_REPAIR') nextStatus = AssetStatus.UNDER_MAINTENANCE;
        else if (body.resultStatus === 'RECOMMEND_LIQUIDATION') nextStatus = AssetStatus.DAMAGED;
        else if (body.resultStatus === 'GOOD' || body.resultStatus === 'NEED_MONITORING') {
          const asset = await tx.asset.findUnique({ where: { id: record.assetId } });
          nextStatus = asset?.roomId ? AssetStatus.IN_USE : AssetStatus.AVAILABLE;
        }

        if (nextStatus) {
          await this.assetTransitionService.transition(tx, record.assetId, nextStatus, {
            action: 'CẬP_NHẬT_BẢO_TRÌ',
            userId,
            note: `Cập nhật bảo trì: ${body.resultStatus}`,
          });
        }
      }
      return updatedRec;
    });

    return this.mapRecord(recordUpdate);
  }

  async getDashboardSummary() {
    const [totalPlans, totalRecords] = await Promise.all([
      this.prisma.maintenancePlan.count({ where: { isActive: true } }),
      this.prisma.maintenanceRecord.count(),
    ]);

    const overdue = await this.prisma.maintenancePlan.count({
      where: { isActive: true, nextDueDate: { lt: new Date() } },
    });

    const dueSoon = await this.prisma.maintenancePlan.count({
      where: {
        isActive: true,
        nextDueDate: { gte: new Date(), lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      },
    });

    return { overdueCount: overdue, dueSoonCount: dueSoon, activePlans: totalPlans, totalRecords };
  }

  async getHistory(assetId: number) {
    const records = await this.prisma.maintenanceRecord.findMany({
      where: { assetId },
      include: {
        asset: true,
        performer: true,
        plan: true,
      },
      orderBy: { maintenanceDate: 'desc' },
    });
    return records.map((r) => this.mapRecord(r));
  }
}
