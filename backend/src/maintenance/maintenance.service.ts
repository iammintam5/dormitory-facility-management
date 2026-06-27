import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

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
      maintenanceType: string;
      content: string;
      resultStatus: string;
      nextMaintenanceDate?: string;
      cost?: number;
      materialNote?: string;
      note?: string;
    },
  ) {
    const count = await this.prisma.maintenanceRecord.count();
    const code = `BT-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const record = await this.prisma.maintenanceRecord.create({
      data: {
        maintenanceCode: code,
        assetId: body.assetId,
        performedBy: userId,
        maintenanceDate: new Date(body.maintenanceDate),
        maintenanceType: body.maintenanceType as any,
        content: body.content,
        resultStatus: body.resultStatus as any,
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

    return this.mapRecord(record);
  }

  async updateRecord(
    id: number,
    body: {
      maintenanceDate?: string;
      maintenanceType?: string;
      content?: string;
      resultStatus?: string;
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

    const updated = await this.prisma.maintenanceRecord.update({
      where: { id },
      data: updateData,
      include: {
        asset: { include: { category: true, room: { include: { floor: { include: { building: true } } } } } },
        plan: true,
        performer: true,
      },
    });
    return this.mapRecord(updated);
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
