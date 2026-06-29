import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateCode } from '../common/utils/code-generator';
import { AssetTransitionService } from '../assets/asset-transition.service';
import { AssetStatus, MaintenanceType, MaintenanceResultStatus, MaintenanceOrderStatus, DamageReportStatus, MaintenanceReturnMode, LiquidationStatus } from '@prisma/client';

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

      assetId: r.assetId,
      performedBy: r.performedBy,
      maintenanceDate: r.maintenanceDate instanceof Date ? r.maintenanceDate.toISOString().split('T')[0] : r.maintenanceDate,
      maintenanceType: r.maintenanceType,
      content: r.content,
      resultStatus: r.resultStatus,
      previousAssetStatus: r.previousAssetStatus,
      previousRoomId: r.previousRoomId,
      nextMaintenanceDate: r.nextMaintenanceDate ? (r.nextMaintenanceDate instanceof Date ? r.nextMaintenanceDate.toISOString().split('T')[0] : r.nextMaintenanceDate) : null,
      cost: null,
      materialNote: null,
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
          damageReport: { include: { room: { include: { floor: { include: { building: true } } } } } },
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

      // Validate operation based on current asset status
      this.assetTransitionService.validateOperation(asset.status, 'MAINTENANCE');

      if (asset.status === AssetStatus.LIQUIDATED) {
        throw new BadRequestException('Không thể bảo trì tài sản đã thanh lý');
      }

      // Check if asset already has an active maintenance record
      const activeMaintenance = await tx.maintenanceRecord.findFirst({
        where: { assetId: body.assetId, status: { in: ['PENDING', 'IN_PROGRESS'] } }
      });
      if (activeMaintenance) {
        throw new ConflictException('Tài sản này đang có lệnh bảo trì chưa hoàn tất');
      }

      if (!body.damageReportId) {
        throw new BadRequestException('damageReportId là bắt buộc, không được lập phiếu bảo trì ngoài báo hỏng');
      }

      const dr = await tx.damageReport.findUnique({ where: { id: body.damageReportId } });
      if (!dr) throw new NotFoundException('Phiếu báo hỏng không tồn tại');
      if (dr.assetId !== body.assetId) throw new BadRequestException('Tài sản không khớp với phiếu báo hỏng');
      
      // Only allow creation from APPROVED damage reports
      if (dr.status !== 'APPROVED') {
        throw new BadRequestException(`Chỉ phiếu báo hỏng đã được duyệt (APPROVED) mới được lập lệnh sửa chữa. Trạng thái hiện tại: ${dr.status}`);
      }

      // Only one active maintenance per damage report
      const activeReportMaintenance = await tx.maintenanceRecord.findFirst({
        where: { damageReportId: body.damageReportId, status: { in: ['PENDING', 'IN_PROGRESS'] } }
      });
      if (activeReportMaintenance) {
        throw new ConflictException('Phiếu báo hỏng này đã có lệnh bảo trì đang hoạt động.');
      }

      const rec = await tx.maintenanceRecord.create({
        data: {
          maintenanceCode: code,
          assetId: body.assetId,
          performedBy: userId,
          maintenanceDate: new Date(body.maintenanceDate),
          status: MaintenanceOrderStatus.PENDING,
          maintenanceType: body.maintenanceType,
          content: body.content,
          resultStatus: null, // Always null on creation
          previousAssetStatus: asset.status,
          previousRoomId: asset.roomId,
          planId: body.planId ?? null,
          damageReportId: body.damageReportId ?? null,

          nextMaintenanceDate: body.nextMaintenanceDate ? new Date(body.nextMaintenanceDate) : null,
          cost: null,
          materialNote: null,
          note: body.note ?? null,
        },
        include: {
          asset: { include: { category: true, room: { include: { floor: { include: { building: true } } } } } },
          plan: true,
          performer: true,
          damageReport: { include: { room: { include: { floor: { include: { building: true } } } } } },
        },
      });

      return rec;
    }, { timeout: 30000 });

    return this.mapRecord(record);
  }

  async createDirectCompletedRecord(
    userId: number,
    body: {
      damageReportId: number;
      performedBy?: number;
      maintenanceDate?: string;
      content: string;
      resultStatus: MaintenanceResultStatus;
      cost?: number;
      materialNote?: string;
      note?: string;
    }
  ) {
    const code = generateCode('BT-');

    const record = await this.prisma.$transaction(async (tx) => {
      // 1. Fetch the damage report and its asset
      const dr = await tx.damageReport.findUnique({
        where: { id: body.damageReportId },
        include: { asset: true }
      });
      if (!dr) throw new NotFoundException('Phiếu báo hỏng không tồn tại');
      
      // The damage report must be IN_PROGRESS (meaning it has been approved and is currently under repair)
      if (dr.status !== 'IN_PROGRESS') {
        throw new BadRequestException(`Phiếu báo hỏng phải ở trạng thái đang sửa (IN_PROGRESS) mới có thể nghiệm thu. Trạng thái hiện tại: ${dr.status}`);
      }

      const asset = dr.asset;
      if (!asset) throw new NotFoundException('Tài sản của phiếu báo hỏng không tồn tại');

      // 2. Determine Performer
      const performerId = body.performedBy ?? userId;

      // 3. Create the MaintenanceRecord directly in COMPLETED status
      const rec = await tx.maintenanceRecord.create({
        data: {
          maintenanceCode: code,
          assetId: asset.id,
          performedBy: performerId,
          maintenanceDate: body.maintenanceDate ? new Date(body.maintenanceDate) : new Date(),
          status: MaintenanceOrderStatus.COMPLETED,
          maintenanceType: 'AD_HOC',
          content: body.content,
          resultStatus: body.resultStatus,
          previousAssetStatus: 'IN_USE',
          previousRoomId: dr.roomId,
          damageReportId: dr.id,
          cost: null,
          materialNote: null,
          note: body.note ?? null,
          completedAt: new Date(),
          completedById: userId,
          startedAt: new Date(),
          startedById: userId,
        },
        include: {
          asset: { include: { category: true, room: { include: { floor: { include: { building: true } } } } } },
          plan: true,
          performer: true,
          damageReport: true,
        }
      });

      // 4. Update the DamageReport to COMPLETED
      await tx.damageReport.update({
        where: { id: dr.id },
        data: {
          status: 'COMPLETED',
          resolvedAt: new Date(),
          damageReportLogs: {
            create: {
              action: 'Nghiệm thu bảo trì',
              oldStatus: 'IN_PROGRESS',
              newStatus: 'COMPLETED',
              note: `Đã hoàn tất sửa chữa. Kết quả: ${body.resultStatus === 'GOOD' ? 'Tốt' : 'Đề nghị thanh lý'}.`,
              createdByUserId: userId,
            }
          }
        }
      });

      // 5. Update Asset status and room based on resultStatus
      let nextStatus: AssetStatus;
      let nextRoomId: number | null = null;

      if (body.resultStatus === MaintenanceResultStatus.GOOD) {
        // Default to PREVIOUS_ROOM
        // Verify room still exists
        const room = await tx.room.findUnique({ where: { id: dr.roomId } });
        if (!room) {
          // If the room was deleted, default to warehouse
          nextStatus = AssetStatus.AVAILABLE;
          nextRoomId = null;
        } else {
          nextStatus = AssetStatus.IN_USE;
          nextRoomId = dr.roomId;
        }
      } else {
        // RECOMMEND_LIQUIDATION
        nextStatus = AssetStatus.PENDING_LIQUIDATION;
        nextRoomId = null;
      }

      await this.assetTransitionService.transition(tx, asset.id, nextStatus, {
        action: 'HOÀN_TẤT_BẢO_TRÌ',
        userId,
        newRoomId: nextRoomId,
        note: `Hoàn tất sửa chữa từ phiếu báo hỏng #${dr.reportCode}. Kết quả: ${body.resultStatus}.`,
      });

      return rec;
    }, { timeout: 30000 });

    return this.mapRecord(record);
  }

  async startRecord(id: number, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.maintenanceRecord.findUnique({
        where: { id },
        include: { asset: true, damageReport: true }
      });

      if (!record) {
        throw new NotFoundException('Phiếu sửa chữa không tồn tại.');
      }

      if (record.status !== MaintenanceOrderStatus.PENDING) {
        throw new BadRequestException('Phiếu sửa chữa phải ở trạng thái PENDING trước khi bắt đầu.');
      }

      const asset = record.asset;
      if (record.damageReportId) {
        const dr = record.damageReport;
        if (!dr) throw new NotFoundException('Phiếu báo hỏng không tồn tại');
        if (dr.status !== 'APPROVED') {
          throw new BadRequestException('Phiếu báo hỏng phải ở trạng thái APPROVED mới được bắt đầu sửa chữa.');
        }
        if (asset.status !== AssetStatus.DAMAGED) {
          throw new BadRequestException('Thiết bị phải ở trạng thái DAMAGED mới được bắt đầu sửa chữa.');
        }
      }

      // Transition asset to UNDER_MAINTENANCE and set roomId to null
      await this.assetTransitionService.transition(tx, record.assetId, AssetStatus.UNDER_MAINTENANCE, {
        action: 'BẮT_ĐẦU_BẢO_TRÌ',
        userId,
        newRoomId: null,
        note: `Bắt đầu sửa chữa cho lệnh ${record.maintenanceCode}`,
      });

      // Update DamageReport if exists
      if (record.damageReportId) {
        const updateDr = await tx.damageReport.updateMany({
          where: { id: record.damageReportId, status: 'APPROVED' },
          data: { status: 'IN_PROGRESS', updatedAt: new Date() }
        });
        if (updateDr.count === 0) {
          throw new ConflictException('Trạng thái báo hỏng đã thay đổi.');
        }

        await tx.damageReportLog.create({
          data: {
            damageReportId: record.damageReportId,
            action: 'Bắt đầu sửa chữa',
            oldStatus: 'APPROVED',
            newStatus: 'IN_PROGRESS',
            note: `Bắt đầu sửa chữa theo lệnh ${record.maintenanceCode}`,
            createdByUserId: userId
          }
        });
      }

      // Update MaintenanceRecord
      const updated = await tx.maintenanceRecord.update({
        where: { id },
        data: {
          status: MaintenanceOrderStatus.IN_PROGRESS,
          startedAt: new Date(),
          startedById: userId,
          previousAssetStatus: asset.status,
          previousRoomId: asset.roomId,
          updatedAt: new Date()
        },
        include: {
          asset: { include: { category: true, room: { include: { floor: { include: { building: true } } } } } },
          plan: true,
          performer: true,
          damageReport: { include: { room: { include: { floor: { include: { building: true } } } } } },
        }
      });

      return updated;
    }, { timeout: 30000 }).then((record) => this.mapRecord(record));
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
      returnMode?: MaintenanceReturnMode;
    }
  ) {
    const recordUpdate = await this.prisma.$transaction(async (tx) => {
      const record = await tx.maintenanceRecord.findUnique({
        where: { id },
        include: { asset: true }
      });
      if (!record) throw new NotFoundException('Maintenance record not found');
      if (record.status !== MaintenanceOrderStatus.IN_PROGRESS) {
        throw new BadRequestException('Phiếu sửa chữa phải ở trạng thái IN_PROGRESS trước khi hoàn tất.');
      }

      let returnMode = body.returnMode;
      if (body.resultStatus === MaintenanceResultStatus.GOOD && !returnMode) {
        returnMode = MaintenanceReturnMode.PREVIOUS_ROOM;
      }

      const updateData: any = {
        status: MaintenanceOrderStatus.COMPLETED,
        resultStatus: body.resultStatus,
        returnMode: returnMode ?? null,
        completedAt: new Date(),
        completedById: userId,
        updatedAt: new Date()
      };
      if (body.content !== undefined) updateData.content = body.content;
      if (body.nextMaintenanceDate !== undefined) updateData.nextMaintenanceDate = body.nextMaintenanceDate ? new Date(body.nextMaintenanceDate) : null;
      if (body.note !== undefined) updateData.note = body.note;

      // Check asset state transitions
      let nextStatus: AssetStatus;
      let nextRoomId: number | null = null;

      if (body.resultStatus === MaintenanceResultStatus.GOOD) {
        if (returnMode === MaintenanceReturnMode.PREVIOUS_ROOM) {
          if (!record.previousRoomId) {
            throw new BadRequestException('Không tìm thấy thông tin phòng cũ của thiết bị.');
          }
          // Verify room still exists and is not deleted
          const room = await tx.room.findUnique({ where: { id: record.previousRoomId } });
          if (!room) {
            throw new BadRequestException('Phòng cũ không hợp lệ hoặc đã bị xóa. Vui lòng chọn đưa về kho.');
          }
          nextStatus = AssetStatus.IN_USE;
          nextRoomId = record.previousRoomId;
        } else {
          nextStatus = AssetStatus.AVAILABLE;
          nextRoomId = null;
        }
      } else {
        // RECOMMEND_LIQUIDATION
        nextStatus = AssetStatus.PENDING_LIQUIDATION;
        nextRoomId = null;
      }

      // Transition the asset
      await this.assetTransitionService.transition(tx, record.assetId, nextStatus, {
        action: 'HOÀN_TẤT_BẢO_TRÌ',
        userId,
        newRoomId: nextRoomId,
        note: `Kết quả: ${body.resultStatus}`,
        sourceTable: 'maintenance_records',
        sourceId: record.id
      });

      // Update the MaintenanceRecord itself
      const updatedRec = await tx.maintenanceRecord.update({
        where: { id },
        data: updateData,
        include: {
          asset: { include: { category: true, room: { include: { floor: { include: { building: true } } } } } },
          plan: true,
          performer: true,
          damageReport: { include: { room: { include: { floor: { include: { building: true } } } } } },
        },
      });

      // Update linked DamageReport status to COMPLETED
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

      return updatedRec;
    }, { timeout: 30000 });
    return this.mapRecord(recordUpdate);
  }

  async cancelRecord(
    id: number,
    userId: number,
    body: {
      reason: string;
      nextAssetStatus: 'DAMAGED' | 'PENDING_LIQUIDATION';
    }
  ) {
    if (!body.reason) {
      throw new BadRequestException('Bắt buộc nhập lý do hủy.');
    }
    if (!body.nextAssetStatus || !['DAMAGED', 'PENDING_LIQUIDATION'].includes(body.nextAssetStatus)) {
      throw new BadRequestException('Trạng thái tài sản tiếp theo không hợp lệ.');
    }

    const recordUpdate = await this.prisma.$transaction(async (tx) => {
      const record = await tx.maintenanceRecord.findUnique({
        where: { id },
        include: { asset: true }
      });
      if (!record) throw new NotFoundException('Maintenance record not found');

      if (record.status === MaintenanceOrderStatus.COMPLETED || record.status === MaintenanceOrderStatus.CANCELLED) {
        throw new BadRequestException('Không thể hủy phiếu bảo trì đã hoàn tất hoặc đã hủy');
      }

      const isPending = record.status === MaintenanceOrderStatus.PENDING;

      let targetAssetStatus: AssetStatus;
      let targetReportStatus: DamageReportStatus | null = null;

      if (isPending) {
        targetAssetStatus = AssetStatus.DAMAGED;
      } else {
        if (body.nextAssetStatus === 'DAMAGED') {
          targetAssetStatus = AssetStatus.DAMAGED;
          targetReportStatus = 'APPROVED';
        } else {
          targetAssetStatus = AssetStatus.PENDING_LIQUIDATION;
          targetReportStatus = 'COMPLETED';
        }
      }

      if (record.asset.status !== targetAssetStatus) {
        await this.assetTransitionService.transition(tx, record.assetId, targetAssetStatus, {
          action: 'HỦY_BẢO_TRÌ',
          userId,
          newRoomId: null,
          note: `Hủy lệnh bảo trì: ${body.reason}`,
          sourceTable: 'maintenance_records',
          sourceId: record.id
        });
      }

      if (record.damageReportId && targetReportStatus) {
        await tx.damageReport.updateMany({
          where: { id: record.damageReportId },
          data: { status: targetReportStatus, updatedAt: new Date() }
        });
        await tx.damageReportLog.create({
          data: {
            damageReportId: record.damageReportId,
            action: 'Hủy sửa chữa',
            oldStatus: 'IN_PROGRESS',
            newStatus: targetReportStatus,
            note: `Hủy lệnh bảo trì. Lý do: ${body.reason}`,
            createdByUserId: userId
          }
        });
      }

      if (targetAssetStatus === AssetStatus.PENDING_LIQUIDATION) {
        const activeLiq = await tx.liquidationItem.findFirst({
          where: {
            assetId: record.assetId,
            liquidationRecord: {
              status: { in: [LiquidationStatus.DRAFT, LiquidationStatus.PENDING_APPROVAL, LiquidationStatus.APPROVED] }
            }
          }
        });

        if (!activeLiq) {
          const liqCode = generateCode('TL-');
          await tx.liquidationRecord.create({
            data: {
              liquidationCode: liqCode,
              liquidationDate: new Date(),
              status: LiquidationStatus.DRAFT,
              sourceType: 'MAINTENANCE',
              sourceMaintenanceRecordId: record.id,
              note: `Đề xuất thanh lý từ hủy Lệnh bảo trì ${record.maintenanceCode}`,
              createdBy: userId,
              liquidationItems: {
                create: {
                  assetId: record.assetId,
                  assetCondition: 'Hỏng không sửa được - hủy sửa chữa',
                  reason: body.reason,
                }
              }
            }
          });
        }
      }

      const updated = await tx.maintenanceRecord.update({
        where: { id },
        data: {
          status: MaintenanceOrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledById: userId,
          cancelReason: body.reason,
          updatedAt: new Date()
        },
        include: {
          asset: { include: { category: true, room: { include: { floor: { include: { building: true } } } } } },
          plan: true,
          performer: true,
          damageReport: { include: { room: { include: { floor: { include: { building: true } } } } } },
        }
      });

      return updated;
    }, { timeout: 30000 });

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
      if (body.note !== undefined) updateData.note = body.note;

      const updatedRec = await tx.maintenanceRecord.update({
        where: { id },
        data: updateData,
        include: {
          asset: { include: { category: true, room: { include: { floor: { include: { building: true } } } } } },
          plan: true,
          performer: true,
          damageReport: { include: { room: { include: { floor: { include: { building: true } } } } } },
        },
      });

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
