import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateCode } from '../common/utils/code-generator';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AssetTransitionService } from '../assets/asset-transition.service';
import { AssetStatus } from '@prisma/client';

const WORKFLOW_MAP: Record<string, { newStatus: string; action: string }> = {
  accept: { newStatus: 'REVIEWING', action: 'Tiếp nhận' },
  reject: { newStatus: 'REJECTED', action: 'Từ chối' },
  'start-processing': { newStatus: 'IN_PROGRESS', action: 'Bắt đầu xử lý' },
  complete: { newStatus: 'COMPLETED', action: 'Hoàn thành' },
  cancel: { newStatus: 'CANCELLED', action: 'Hủy phiếu' },
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ['accept', 'reject', 'cancel'],
  REVIEWING: ['start-processing', 'reject'],
  IN_PROGRESS: ['complete'],
  APPROVED: ['start-processing'],
  REJECTED: [],
  COMPLETED: [],
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

    if (asset.roomId !== assignment.roomId) {
      throw new BadRequestException('Tài sản không thuộc phòng hiện tại của sinh viên');
    }

    const existingReport = await this.prisma.damageReport.findFirst({
      where: { assetId: body.assetId, status: { in: ['SUBMITTED', 'REVIEWING', 'IN_PROGRESS'] } }
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
      updateData.assetId = body.assetId;
      changes.push('tài sản');
    }
    if (body.roomId !== undefined && body.roomId !== report.roomId) {
      // Allow if body.roomId matches report.roomId, else ignore it or reject
      // We will ignore updating roomId for student.
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

  async transition(id: number, action: string, userId: number) {
    const report = await this.prisma.damageReport.findUnique({
      where: { id },
      include: { asset: true },
    });
    if (!report) throw new NotFoundException('Damage report not found');

    if (action === 'cancel' && report.reporterId !== userId) {
      throw new NotFoundException('Damage report not found');
    }

    const allowed = VALID_TRANSITIONS[report.status] ?? [];
    if (!allowed.includes(action)) {
      throw new BadRequestException(`Cannot ${action} a report with status ${report.status}`);
    }

    const workflow = WORKFLOW_MAP[action];
    if (!workflow) throw new BadRequestException(`Invalid action: ${action}`);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedReport = await tx.damageReport.update({
        where: { id },
        data: {
          status: workflow.newStatus as any,
          ...(action === 'complete' ? { updatedAt: new Date() } : {}),
        },
        include: {
          reporter: { include: { role: true } },
          asset: { include: { category: true } },
          room: { include: { floor: { include: { building: true } } } },
          damageReportLogs: {
            include: { createdByUser: { include: { role: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      await tx.damageReportLog.create({
        data: {
          action: workflow.action,
          oldStatus: report.status as any,
          newStatus: workflow.newStatus as any,
          note: `${workflow.action} bởi người dùng #${userId}`,
          createdByUserId: userId,
          damageReportId: id,
        },
      });

      // When processing starts, set asset to UNDER_MAINTENANCE
      if (action === 'start-processing' && report.assetId) {
        await this.assetTransitionService.transition(tx, report.assetId, AssetStatus.UNDER_MAINTENANCE, {
          action: 'BẮT_ĐẦU_SỬA_CHỮA',
          userId,
          note: `Bắt đầu sửa chữa theo báo hỏng #${report.reportCode}`,
        });
      }

      // When completed, set asset back to IN_USE
      if (action === 'complete' && report.assetId) {
        await this.assetTransitionService.transition(tx, report.assetId, AssetStatus.IN_USE, {
          action: 'KẾT_THÚC_BÁO_HỎNG',
          userId,
          note: `Hoàn thành báo hỏng #${report.reportCode}`,
        });
      }

      // When rejected, just create history entry, since status didn't change (still DAMAGED or IN_USE)
      if (action === 'reject' && report.assetId) {
        await tx.assetHistory.create({
          data: {
            assetId: report.assetId,
            action: 'TỪ_CHỐI_BÁO_HỎNG',
            newStatus: report.asset?.status,
            note: `Từ chối báo hỏng #${report.reportCode}`,
          },
        });
      }

      return updatedReport;
    });

    // Audit log
    await this.auditLogsService.create({
      userId,
      action: workflow.action.toUpperCase().replace(/ /g, '_'),
      tableName: 'damage_reports',
      recordId: id,
      content: `${workflow.action} phiếu báo hỏng #${id} (${report.reportCode}): ${report.status} → ${workflow.newStatus}`,
      oldValue: report.status,
      newValue: workflow.newStatus,
    });

    return updated;
  }
}
