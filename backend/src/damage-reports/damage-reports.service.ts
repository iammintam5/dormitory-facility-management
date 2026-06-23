import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const WORKFLOW_MAP: Record<string, { newStatus: string; action: string }> = {
  accept: { newStatus: 'REVIEWING', action: 'Tiếp nhận' },
  reject: { newStatus: 'REJECTED', action: 'Từ chối' },
  'start-processing': { newStatus: 'IN_PROGRESS', action: 'Bắt đầu xử lý' },
  complete: { newStatus: 'COMPLETED', action: 'Hoàn thành' },
  cancel: { newStatus: 'REJECTED', action: 'Hủy phiếu' },
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ['accept', 'reject'],
  REVIEWING: ['start-processing', 'reject'],
  IN_PROGRESS: ['complete'],
  APPROVED: ['start-processing'],
  REJECTED: [],
  COMPLETED: [],
};

@Injectable()
export class DamageReportsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async findOne(id: number) {
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
    const count = await this.prisma.damageReport.count();
    const reportCode = `BH-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const report = await this.prisma.damageReport.create({
      data: {
        reportCode,
        description: body.description,
        priority: body.priority as any,
        status: 'SUBMITTED',
        reporterId: userId,
        assetId: body.assetId ?? 1,
        roomId: body.roomId ?? 1,
        location: `${body.roomId ?? ''}`,
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
      updateData.roomId = body.roomId;
      changes.push('phòng');
    }

    if (Object.keys(updateData).length === 0) {
      return this.findOne(id);
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

    return updated;
  }

  async transition(id: number, action: string, userId: number) {
    const report = await this.prisma.damageReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Damage report not found');

    const allowed = VALID_TRANSITIONS[report.status] ?? [];
    if (!allowed.includes(action)) {
      throw new BadRequestException(`Cannot ${action} a report with status ${report.status}`);
    }

    const workflow = WORKFLOW_MAP[action];
    if (!workflow) throw new BadRequestException(`Invalid action: ${action}`);

    const updated = await this.prisma.damageReport.update({
      where: { id },
      data: {
        status: workflow.newStatus as any,
        damageReportLogs: {
          create: {
            action: workflow.action,
            oldStatus: report.status as any,
            newStatus: workflow.newStatus as any,
            note: `${workflow.action} bởi người dùng #${userId}`,
            createdByUserId: userId,
          },
        },
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

    return updated;
  }
}
