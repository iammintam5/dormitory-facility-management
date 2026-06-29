import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateCode } from '../common/utils/code-generator';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AssetTransitionService } from '../assets/asset-transition.service';
import { AssetStatus } from '@prisma/client';

const WORKFLOW_MAP: Record<string, { newStatus: string; action: string }> = {
  review: { newStatus: 'REVIEWING', action: 'Tiếp nhận' },
  approve: { newStatus: 'IN_PROGRESS', action: 'Duyệt' },
  reject: { newStatus: 'REJECTED', action: 'Từ chối' },
  cancel: { newStatus: 'CANCELLED', action: 'Hủy phiếu' },
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ['review', 'approve', 'reject', 'cancel'],
  REVIEWING: ['approve', 'reject'],
  APPROVED: ['cancel'],
  IN_PROGRESS: ['cancel'],
  REJECTED: [],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class DamageReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly assetTransitionService: AssetTransitionService,
  ) {}

  async findAll(params: {
    userId: number;
    role: string;
    page: number;
    pageSize: number;
    status?: string;
  }) {
    const { userId, role, page, pageSize, status } = params;
    const where: any = {};

    if (role === 'STUDENT') {
      where.reporterId = userId;
    }
    if (status) {
      where.status = status;
    }

    const [total, reports] = await Promise.all([
      this.prisma.damageReport.count({ where }),
      this.prisma.damageReport.findMany({
        where,
        include: {
          reporter: { include: { role: true } },
          asset: { include: { category: true } },
          room: { include: { floor: { include: { building: true } } } },
          damageReportLogs: {
            include: { createdByUser: { include: { role: true } } },
            orderBy: { createdAt: 'asc' },
          },
          maintenanceRecords: {
            where: { status: 'IN_PROGRESS' },
            select: { id: true, maintenanceCode: true }
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = reports.map((r) => ({
      id: r.id,
      reportCode: r.reportCode,
      reporterId: r.reporterId,
      assetId: r.assetId,
      roomId: r.roomId,
      description: r.description,
      location: r.location ?? '',
      priority: r.priority,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt?.toISOString() ?? null,
      reporter: r.reporter
        ? {
            id: r.reporter.id,
            fullName: r.reporter.fullName,
            userCode: r.reporter.userCode,
            email: r.reporter.email,
            phone: r.reporter.phone,
            status: r.reporter.status,
            createdAt: r.reporter.createdAt.toISOString(),
            role: r.reporter.role,
          }
        : undefined,
      asset: r.asset
        ? {
            id: r.asset.id,
            categoryId: r.asset.categoryId,
            assetCode: r.asset.assetCode,
            assetName: r.asset.assetName,
            status: r.asset.status,
            description: r.asset.description,
            createdAt: r.asset.createdAt.toISOString(),
            category: r.asset.category,
          }
        : undefined,
      room: r.room
        ? {
            id: r.room.id,
            floorId: r.room.floorId,
            roomCode: r.room.roomCode,
            capacity: r.room.capacity,
            floor: r.room.floor,
          }
        : undefined,
      damageReportLogs: r.damageReportLogs.map((l) => ({
        id: l.id,
        action: l.action,
        oldStatus: l.oldStatus,
        newStatus: l.newStatus,
        note: l.note,
        createdAt: l.createdAt.toISOString(),
        createdByUser: l.createdByUser
          ? {
              id: l.createdByUser.id,
              fullName: l.createdByUser.fullName,
              userCode: l.createdByUser.userCode,
              status: l.createdByUser.status,
              createdAt: l.createdByUser.createdAt.toISOString(),
              role: l.createdByUser.role,
            }
          : undefined,
      })),
      maintenanceRecords: r.maintenanceRecords || [],
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

  async findOne(id: number, userId?: number, role?: string) {
    const report = await this.prisma.damageReport.findUnique({
      where: { id },
      include: {
        reporter: { include: { role: true } },
        asset: { include: { category: true } },
        room: { include: { floor: { include: { building: true } } } },
        damageReportLogs: {
          include: { createdByUser: { include: { role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        maintenanceRecords: {
          where: { status: 'IN_PROGRESS' },
          select: { id: true, maintenanceCode: true }
        },
      },
    });
    if (!report) throw new NotFoundException('Damage report not found');

    if (role === 'STUDENT' && report.reporterId !== userId) {
      throw new NotFoundException('Damage report not found');
    }

    return {
      id: report.id,
      reportCode: report.reportCode,
      reporterId: report.reporterId,
      assetId: report.assetId,
      roomId: report.roomId,
      description: report.description,
      location: report.location ?? '',
      priority: report.priority,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt?.toISOString() ?? null,
      reporter: report.reporter,
      asset: report.asset,
      room: report.room,
      damageReportLogs: report.damageReportLogs,
      maintenanceRecords: report.maintenanceRecords || [],
    };
  }

  async create(
    userId: number,
    body: { assetId?: number; roomId?: number; description: string; priority: string },
  ) {
    if (!body.assetId) {
      throw new BadRequestException('assetId là bắt buộc');
    }

    const assignment = await this.prisma.roomStudentAssignment.findFirst({
      where: { studentId: userId, isActive: true },
    });
    if (!assignment) {
      throw new BadRequestException('Sinh viên chưa được phân phòng');
    }

    const asset = await this.prisma.asset.findUnique({ where: { id: body.assetId } });
    if (!asset) throw new NotFoundException('Tài sản không tồn tại');

    this.assetTransitionService.validateOperation(asset.status, 'DAMAGE_REPORT');

    if (asset.roomId !== assignment.roomId) {
      throw new BadRequestException('Tài sản không thuộc phòng hiện tại của sinh viên');
    }

    const existingReport = await this.prisma.damageReport.findFirst({
      where: { assetId: body.assetId, status: { in: ['SUBMITTED', 'REVIEWING', 'APPROVED', 'IN_PROGRESS'] } }
    });
    if (existingReport) {
      throw new BadRequestException('Tài sản này đang có phiếu báo hỏng chưa hoàn tất');
    }

    const roomId = assignment.roomId;

    const reportCode = generateCode('BH-');

    const report = await this.prisma.damageReport.create({
      data: {
        reportCode,
        description: body.description,
        priority: body.priority as any,
        status: 'SUBMITTED',
        reporterId: userId,
        assetId: body.assetId,
        roomId: roomId,
        location: `${roomId}`,
        damageReportLogs: {
          create: {
            action: 'Tạo phiếu',
            newStatus: 'SUBMITTED',
            note: 'Sinh viên gửi phiếu báo hỏng.',
            createdByUserId: userId,
          },
        },
      },
      include: {
        reporter: true,
        asset: { include: { category: true } },
        room: { include: { floor: { include: { building: true } } } },
        damageReportLogs: { include: { createdByUser: true } },
      },
    });

    // Audit log
    await this.auditLogsService.create({
      userId,
      action: 'CREATE_DAMAGE_REPORT',
      tableName: 'damage_reports',
      recordId: report.id,
      content: `Tạo phiếu báo hỏng ${reportCode}`,
      newValue: JSON.stringify({ assetId: body.assetId, roomId: roomId, priority: body.priority }),
    });

    return report;
  }

  async update(
    id: number,
    userId: number,
    body: {
      assetId?: number;
      roomId?: number;
      description?: string;
      priority?: string;
    },
  ) {
    const report = await this.prisma.damageReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Damage report not found');
    if (report.reporterId !== userId) {
      throw new NotFoundException('Damage report not found');
    }

    // Only allow update if status is SUBMITTED
    if (report.status !== 'SUBMITTED') {
      throw new BadRequestException('Cannot update a report that has been processed');
    }

    const updateData: any = {};
    const changes: string[] = [];

    if (body.description !== undefined && body.description !== report.description) {
      updateData.description = body.description;
      changes.push('mô tả');
    }
    if (body.priority !== undefined && body.priority !== report.priority) {
      updateData.priority = body.priority;
      changes.push('mức độ ưu tiên');
    }
    if (body.assetId !== undefined && body.assetId !== report.assetId) {
      // FIX 11: Validate the new asset belongs to the student's current room
      const assignment = await this.prisma.roomStudentAssignment.findFirst({
        where: { studentId: userId, isActive: true },
      });
      if (!assignment) {
        throw new BadRequestException('Sinh viên chưa được phân phòng');
      }

      const newAsset = await this.prisma.asset.findUnique({ where: { id: body.assetId } });
      if (!newAsset) {
        throw new NotFoundException('Tài sản mới không tồn tại');
      }

      if (newAsset.roomId !== assignment.roomId) {
        throw new BadRequestException('Tài sản mới không thuộc phòng hiện tại của sinh viên');
      }

      updateData.assetId = body.assetId;
      changes.push('tài sản');
    }
    if (body.roomId !== undefined && body.roomId !== report.roomId) {
      // Ignore roomId updates from students - room is auto-set from assignment
    }

    if (Object.keys(updateData).length === 0) {
      return this.findOne(id, userId, 'STUDENT');
    }

    const updated = await this.prisma.damageReport.update({
      where: { id },
      data: {
        ...updateData,
        damageReportLogs: {
          create: {
            action: 'Cập nhật phiếu',
            oldStatus: report.status as any,
            newStatus: report.status as any,
            note: `Cập nhật: ${changes.join(', ')}`,
            createdByUserId: userId,
          },
        },
      },
      include: {
        reporter: { include: { role: true } },
        asset: { include: { category: true } },
        room: { include: { floor: { include: { building: true } } } },
        damageReportLogs: {
          include: { createdByUser: { include: { role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        maintenanceRecords: {
          where: { status: 'IN_PROGRESS' },
          select: { id: true, maintenanceCode: true }
        },
      },
    });

    // Audit log
    await this.auditLogsService.create({
      userId,
      action: 'UPDATE_DAMAGE_REPORT',
      tableName: 'damage_reports',
      recordId: id,
      content: `Cập nhật phiếu báo hỏng #${id}: ${changes.join(', ')}`,
      oldValue: JSON.stringify({ status: report.status, description: report.description }),
      newValue: JSON.stringify(updateData),
    });

    return updated;
  }
  async transition(id: number, action: string, userId: number, payload?: { reason?: string; role?: string }) {
    const report = await this.prisma.damageReport.findUnique({
      where: { id },
      include: { asset: true },
    });
    if (!report) throw new NotFoundException('Damage report not found');

    const role = payload?.role ?? 'MANAGER';

    if (action === 'cancel') {
      if (role === 'STUDENT') {
        if (report.reporterId !== userId) {
          throw new NotFoundException('Damage report not found');
        }
        if (report.status !== 'SUBMITTED') {
          throw new BadRequestException('Sinh viên chỉ có thể hủy phiếu của chính mình khi trạng thái là SUBMITTED.');
        }
      } else {
        if (!payload?.reason) {
          throw new BadRequestException('Quản lý hủy phiếu sau duyệt bắt buộc phải nhập lý do hủy.');
        }
      }
    }

    if (action === 'reject') {
      if (!payload?.reason) {
        throw new BadRequestException('Từ chối báo hỏng bắt buộc phải nhập lý do từ chối.');
      }
    }

    const allowed = VALID_TRANSITIONS[report.status] ?? [];
    if (!allowed.includes(action)) {
      throw new BadRequestException(`Không thể thực hiện hành động ${action} khi phiếu ở trạng thái ${report.status}`);
    }

    const workflow = WORKFLOW_MAP[action];
    if (!workflow) throw new BadRequestException(`Hành động không hợp lệ: ${action}`);

    const expectedStatus = report.status;

    return this.prisma.$transaction(async (tx) => {
      // 1. Update asset status if approving or cancelling
      if (action === 'approve') {
        await this.assetTransitionService.transition(tx, report.assetId, 'UNDER_MAINTENANCE', {
          action: 'DUYỆT_BÁO_HỎNG',
          userId,
          newRoomId: null,
          note: `Duyệt báo hỏng #${report.reportCode}. Thiết bị chuyển sang bảo trì.`,
        });
      } else if (action === 'cancel') {
        const hasActiveRoom = !!report.roomId;
        const targetStatus = hasActiveRoom ? 'IN_USE' : 'AVAILABLE';
        await this.assetTransitionService.transition(tx, report.assetId, targetStatus as any, {
          action: 'HUY_BÁO_HỎNG',
          userId,
          newRoomId: report.roomId || null,
          note: `Hủy báo hỏng #${report.reportCode}. Khôi phục trạng thái tài sản.`,
        });
      }

      // 2. Set tracking fields
      const updateData: any = {
        status: workflow.newStatus as any,
        updatedAt: new Date(),
      };

      if (action === 'review') {
        updateData.reviewedAt = new Date();
        updateData.reviewedById = userId;
      } else if (action === 'approve') {
        updateData.approvedAt = new Date();
        updateData.approvedById = userId;
        // Tự động set reviewed nếu duyệt thẳng từ SUBMITTED
        if (report.status === 'SUBMITTED') {
          updateData.reviewedAt = new Date();
          updateData.reviewedById = userId;
        }
      } else if (action === 'reject') {
        updateData.rejectedAt = new Date();
        updateData.rejectedById = userId;
        updateData.rejectReason = payload?.reason;
      } else if (action === 'cancel') {
        updateData.cancelledAt = new Date();
        updateData.cancelledById = userId;
        updateData.cancelReason = payload?.reason ?? 'Hủy phiếu báo hỏng';
      }

      const updateResult = await tx.damageReport.updateMany({
        where: { id, status: expectedStatus as any },
        data: updateData,
      });

      if (updateResult.count === 0) {
        throw new ConflictException(
          `Xung đột trạng thái: Phiếu báo hỏng #${id} đã bị thay đổi bởi giao dịch khác.`
        );
      }

      // Fetch updated report for return
      const updatedReport = await tx.damageReport.findUnique({
        where: { id },
        include: {
          reporter: { include: { role: true } },
          asset: { include: { category: true } },
          room: { include: { floor: { include: { building: true } } } },
          damageReportLogs: {
            include: { createdByUser: { include: { role: true } } },
            orderBy: { createdAt: 'asc' as const },
          },
          maintenanceRecords: {
            where: { status: 'IN_PROGRESS' },
            select: { id: true, maintenanceCode: true }
          },
        },
      });

      // Status log – inside transaction
      await tx.damageReportLog.create({
        data: {
          action: workflow.action,
          oldStatus: report.status as any,
          newStatus: workflow.newStatus as any,
          note: payload?.reason ?? `${workflow.action} bởi người dùng #${userId}`,
          createdByUserId: userId,
          damageReportId: id,
        },
      });

      // When rejected, just create history entry
      if (action === 'reject' && report.assetId) {
        await tx.assetHistory.create({
          data: {
            assetId: report.assetId,
            action: 'TỪ_CHỐI_BÁO_HỎNG',
            newStatus: report.asset?.status,
            note: `Từ chối báo hỏng #${report.reportCode}. Lý do: ${payload?.reason}`,
            performedById: userId,
          },
        });
      }

      // Audit log – inside transaction for atomicity
      await this.auditLogsService.createWithTx(tx, {
        userId,
        action: workflow.action.toUpperCase().replace(/ /g, '_'),
        tableName: 'damage_reports',
        recordId: id,
        content: `${workflow.action} phiếu báo hỏng #${id} (${report.reportCode}): ${report.status} → ${workflow.newStatus}`,
        oldValue: report.status,
        newValue: workflow.newStatus,
      });

      // Bắn Notification cho sinh viên (reporter)
      if (report.reporterId) {
        await tx.notification.create({
          data: {
            userId: report.reporterId,
            title: `Cập nhật báo hỏng ${report.reportCode}`,
            content: `Phiếu báo hỏng của bạn đã được ${workflow.action.toLowerCase()}. Trạng thái mới: ${workflow.newStatus}`,
            relatedTable: 'damage_reports',
            relatedId: id,
          }
        });
      }

      return updatedReport;
    }, { timeout: 30000 });
  }
}
