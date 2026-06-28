import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateCode } from '../common/utils/code-generator';
import { AssetTransitionService } from '../assets/asset-transition.service';
import { AssetStatus, MaintenanceType, MaintenanceResultStatus, MaintenanceOrderStatus, DamageReportStatus } from '@prisma/client';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetTransitionService: AssetTransitionService
  ) { }

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
      status: r.status,
      planId: r.planId,
      damageReportId: r.damageReportId,
      inventoryItemId: r.inventoryItemId,
      assetId: r.assetId,
      performedBy: r.performedBy,
      maintenanceDate: r.maintenanceDate instanceof Date ? r.maintenanceDate.toISOString().split('T')[0] : r.maintenanceDate,
      maintenanceType: r.maintenanceType,
      content: r.content,
      resultStatus: r.resultStatus,
      previousAssetStatus: r.previousAssetStatus,
      previousRoomId: r.previousRoomId,
      nextMaintenanceDate: r.nextMaintenanceDate ? (r.nextMaintenanceDate instanceof Date ? r.nextMaintenanceDate.toISOString().split('T')[0] : r.nextMaintenanceDate) : null,
      cost: r.cost ? Number(r.cost) : null,
      materialNote: r.materialNote,
      note: r.note,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      updatedAt: r.updatedAt ? (r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt) : null,
      asset: r.asset,
      plan: r.plan,
      performedByUser: r.performer,
      damageReport: r.damageReport,
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

  async getRecords(params: { page: number; pageSize: number; status?: string }) {
    const { page, pageSize, status } = params;
    const where: any = {};
    if (status) where.status = status;

    const [total, records] = await Promise.all([
      this.prisma.maintenanceRecord.count({ where }),
      this.prisma.maintenanceRecord.findMany({
        where,
        include: {
          asset: { include: { category: true, room: { include: { floor: { include: { building: true } } } } } },
          plan: true,
          performer: true,
          damageReport: true,
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

  async createRecord(
    userId: number,
    body: {
      planId?: number;
      damageReportId?: number;
      inventoryItemId?: number;
      assetId: number;
      maintenanceDate: string;
      maintenanceType: MaintenanceType;
      content: string;
      resultStatus?: MaintenanceResultStatus;
      nextMaintenanceDate?: string;
      cost?: number;
      materialNote?: string;
      note?: string;
    },
  ) {
    const code = generateCode('BT-');

    const record = await this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.findUnique({ where: { id: body.assetId } });
      if (!asset) throw new NotFoundException('Tài sản không tồn tại');
      if (asset.status === AssetStatus.LIQUIDATED) {
        throw new BadRequestException('Không thể bảo trì tài sản đã thanh lý');
      }

      const activeMaintenance = await tx.maintenanceRecord.findFirst({
        where: { assetId: body.assetId, status: { in: ['PENDING', 'IN_PROGRESS'] } }
      });
      if (activeMaintenance) {
        throw new ConflictException('Tài sản này đang có lệnh bảo trì chưa hoàn tất');
      }

      let expectedReportStatus: DamageReportStatus | undefined;
      if (body.damageReportId) {
        const dr = await tx.damageReport.findUnique({ where: { id: body.damageReportId } });
        if (!dr) throw new NotFoundException('Phiếu báo hỏng không tồn tại');
        if (dr.assetId !== body.assetId) throw new BadRequestException('Tài sản không khớp với phiếu báo hỏng');
        if (dr.status === 'REJECTED' || dr.status === 'CANCELLED' || dr.status === 'COMPLETED') {
          throw new BadRequestException(`Không thể tạo lệnh bảo trì từ báo hỏng trạng thái ${dr.status}`);
        }
        expectedReportStatus = dr.status;
      }

      if (body.inventoryItemId) {
        const item = await tx.inventoryCheckItem.findUnique({ where: { id: body.inventoryItemId } });
        if (!item) throw new NotFoundException('Sai lệch kiểm kê không tồn tại');
        if (item.assetId !== body.assetId) throw new BadRequestException('Tài sản không khớp với sai lệch');
      }

      const rec = await tx.maintenanceRecord.create({
        data: {
          maintenanceCode: code,
          assetId: body.assetId,
          performedBy: userId,
          maintenanceDate: new Date(body.maintenanceDate),
          status: MaintenanceOrderStatus.IN_PROGRESS,
          maintenanceType: body.maintenanceType,
          content: body.content,
          resultStatus: body.resultStatus ?? null,
          previousAssetStatus: asset.status,
          previousRoomId: asset.roomId,
          planId: body.planId ?? null,
          damageReportId: body.damageReportId ?? null,
          inventoryItemId: body.inventoryItemId ?? null,
          nextMaintenanceDate: body.nextMaintenanceDate ? new Date(body.nextMaintenanceDate) : null,
          cost: body.cost ?? null,
          materialNote: body.materialNote ?? null,
          note: body.note ?? null,
        },
        include: {
          asset: { include: { category: true, room: { include: { floor: { include: { building: true } } } } } },
          plan: true,
          performer: true,
          damageReport: true,
        },
      });

      if (body.damageReportId && expectedReportStatus) {
        const updateResult = await tx.damageReport.updateMany({
          where: { id: body.damageReportId, status: expectedReportStatus },
          data: { status: 'IN_PROGRESS', updatedAt: new Date() }
        });
        if (updateResult.count === 0) {
          throw new ConflictException('Phiếu báo hỏng đã bị thay đổi bởi giao dịch khác');
        }
        await tx.damageReportLog.create({
          data: {
            damageReportId: body.damageReportId,
            action: 'Bắt đầu sửa chữa',
            oldStatus: expectedReportStatus,
            newStatus: 'IN_PROGRESS',
            note: `Đã tạo lệnh bảo trì: ${code}`,
            createdByUserId: userId
          }
        });
      }

      if (body.inventoryItemId) {
        await tx.inventoryCheckItem.update({
          where: { id: body.inventoryItemId },
          data: {
            resolutionStatus: 'IN_PROGRESS',
            resolutionType: 'MAINTENANCE',
            resolutionReferenceId: rec.id
          }
        });
      }

      if (asset.status !== AssetStatus.UNDER_MAINTENANCE) {
        await this.assetTransitionService.transition(tx, body.assetId, AssetStatus.UNDER_MAINTENANCE, {
          action: 'BẮT_ĐẦU_BẢO_TRÌ',
          userId,
          note: `Lệnh bảo trì: ${code}`,
          sourceTable: 'maintenance_records',
          sourceId: rec.id
        });
      }

      return rec;
    });

    return this.mapRecord(record);
  }

  async completeRecord(
    id: number,
    userId: number,
    body: {
      resultStatus: MaintenanceResultStatus;
      content?: string;
      nextMaintenanceDate?: string;
      cost?: number;
      materialNote?: string;
      note?: string;
    }
  ) {
    const recordUpdate = await this.prisma.$transaction(async (tx) => {
      const record = await tx.maintenanceRecord.findUnique({
        where: { id },
        include: { asset: true }
      });
      if (!record) throw new NotFoundException('Maintenance record not found');
      if (record.status !== 'IN_PROGRESS') {
        throw new BadRequestException('Chỉ có thể hoàn tất lệnh bảo trì đang IN_PROGRESS');
      }

      const updateData: any = {
        status: MaintenanceOrderStatus.COMPLETED,
        resultStatus: body.resultStatus,
        updatedAt: new Date()
      };
      if (body.content !== undefined) updateData.content = body.content;
      if (body.nextMaintenanceDate !== undefined) updateData.nextMaintenanceDate = body.nextMaintenanceDate ? new Date(body.nextMaintenanceDate) : null;
      if (body.cost !== undefined) updateData.cost = body.cost;
      if (body.materialNote !== undefined) updateData.materialNote = body.materialNote;
      if (body.note !== undefined) updateData.note = body.note;

      const updatedRec = await tx.maintenanceRecord.update({
        where: { id },
        data: updateData,
        include: {
          asset: { include: { category: true, room: { include: { floor: { include: { building: true } } } } } },
          plan: true,
          performer: true,
          damageReport: true,
        },
      });

      let nextStatus: AssetStatus | null = null;
      if (body.resultStatus === 'RECOMMEND_LIQUIDATION') {
        nextStatus = AssetStatus.DAMAGED;
      } else if (body.resultStatus === 'GOOD') {
        nextStatus = record.previousAssetStatus ?? AssetStatus.IN_USE;
      }

      if (nextStatus && nextStatus !== record.asset.status) {
        await this.assetTransitionService.transition(tx, record.assetId, nextStatus, {
          action: 'HOÀN_TẤT_BẢO_TRÌ',
          userId,
          note: `Kết quả: ${body.resultStatus}`,
          sourceTable: 'maintenance_records',
          sourceId: record.id
        });
      }

      if (record.damageReportId) {
        const dr = await tx.damageReport.findUnique({ where: { id: record.damageReportId } });
        if (dr && dr.status === 'IN_PROGRESS') {
          await tx.damageReport.updateMany({
            where: { id: record.damageReportId, status: 'IN_PROGRESS' },
            data: { status: 'COMPLETED', updatedAt: new Date() }
          });
          await tx.damageReportLog.create({
            data: {
              damageReportId: record.damageReportId,
              action: 'Hoàn tất bảo trì',
              oldStatus: 'IN_PROGRESS',
              newStatus: 'COMPLETED',
              note: `Kết quả: ${body.resultStatus}`,
              createdByUserId: userId
            }
          });
        }
      }

      if (record.inventoryItemId) {
        await tx.inventoryCheckItem.update({
          where: { id: record.inventoryItemId },
          data: {
            resolutionStatus: 'RESOLVED',
            resolvedById: userId,
            resolvedAt: new Date(),
            note: `Đã bảo trì xong, kết quả: ${body.resultStatus}`
          }
        });
      }

      if (body.resultStatus === 'RECOMMEND_LIQUIDATION') {
        const activeLiq = await tx.liquidationItem.findFirst({
          where: { assetId: record.assetId, liquidationRecord: { status: { in: ['DRAFT', 'PENDING_APPROVAL'] } } }
        });
        if (!activeLiq) {
          const liqCode = generateCode('TL-');
          await tx.liquidationRecord.create({
            data: {
              liquidationCode: liqCode,
              liquidationDate: new Date(),
              status: 'DRAFT',
              sourceType: 'MAINTENANCE',
              sourceMaintenanceRecordId: record.id,
              note: `Đề xuất thanh lý từ Lệnh bảo trì ${record.maintenanceCode}`,
              createdBy: userId,
              liquidationItems: {
                create: {
                  assetId: record.assetId,
                  assetCondition: 'Hỏng nặng không thể sửa',
                  reason: body.note || 'Theo đề xuất của bộ phận bảo trì',
                }
              }
            }
          });
        }
      }

      return updatedRec;
    });
    return this.mapRecord(recordUpdate);
  }

  async updateRecord(id: number, userId: number, body: any) {
    const recordUpdate = await this.prisma.$transaction(async (tx) => {
      const record = await tx.maintenanceRecord.findUnique({ where: { id } });
      if (!record) throw new NotFoundException('Maintenance record not found');

      if (record.status === 'COMPLETED' || record.status === 'CANCELLED') {
        throw new BadRequestException('Không thể cập nhật phiếu bảo trì đã hoàn tất hoặc đã hủy');
      }

      const updateData: any = {};

      // Khóa mõm: Không cho phép đổi ngày/loại bảo trì nếu phiếu đã tạo
      // (Vì frontend truyền xuống có thể chứa các trường này, ta bỏ qua)

      if (body.content !== undefined) updateData.content = body.content;
      if (body.nextMaintenanceDate !== undefined) updateData.nextMaintenanceDate = body.nextMaintenanceDate ? new Date(body.nextMaintenanceDate) : null;
      if (body.cost !== undefined) updateData.cost = body.cost;
      if (body.materialNote !== undefined) updateData.materialNote = body.materialNote;
      if (body.note !== undefined) updateData.note = body.note;

      const updatedRec = await tx.maintenanceRecord.update({
        where: { id },
        data: updateData,
        include: {
          asset: { include: { category: true, room: { include: { floor: { include: { building: true } } } } } },
          plan: true,
          performer: true,
          damageReport: true,
        },
      });

      // Audit Log cho chi phí
      if (body.cost !== undefined && Number(record.cost) !== Number(body.cost)) {
        await tx.auditLog.create({
          data: {
            userId: userId,
            action: 'Cập nhật chi phí bảo trì',
            tableName: 'maintenance_records',
            recordId: record.id,
            content: `Cập nhật chi phí từ ${record.cost ?? 0}đ thành ${body.cost}đ`,
            oldValue: record.cost ? record.cost.toString() : '0',
            newValue: body.cost.toString()
          }
        });
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
        damageReport: true,
      },
      orderBy: { maintenanceDate: 'desc' },
    });
    return records.map((r) => this.mapRecord(r));
  }
}
