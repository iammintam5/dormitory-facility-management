import {
  AssetStatus,
  DamageReportStatus,
  NotificationStatus,
  Prisma,
  PrismaClient,
  UserStatus,
} from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/types/auth-user.type';
import { CompleteDamageReportDto } from './dto/complete-damage-report.dto';
import { CreateDamageReportDto } from './dto/create-damage-report.dto';
import { QueryDamageReportsDto } from './dto/query-damage-reports.dto';
import { UpdateDamageReportDto } from './dto/update-damage-report.dto';
import { WorkflowNoteDto } from './dto/workflow-note.dto';

@Injectable()
export class DamageReportsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(currentUser: AuthUser, dto: CreateDamageReportDto) {
    const studentRoom = await this.ensureStudentCanReport(currentUser.userId, dto.roomId, dto.assetId);
    const reportCode = await this.generateReportCode();

    const report = await this.prismaService.$transaction(async (tx) => {
      const created = await tx.damageReport.create({
        data: {
          reportCode,
          reporterId: currentUser.userId,
          assetId: dto.assetId,
          roomId: dto.roomId,
          description: dto.description.trim(),
          location: dto.location.trim(),
          status: DamageReportStatus.SUBMITTED,
        },
        include: this.damageReportInclude,
      });

      await this.createDamageLog(tx, {
        reportId: created.id,
        action: 'create',
        newStatus: DamageReportStatus.SUBMITTED,
        createdBy: currentUser.userId,
        note: `Tạo phiếu báo hỏng cho phòng ${studentRoom.room.roomCode}.`,
      });

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'create',
        recordId: created.id,
        newValue: this.stringifyPayload({
          reportCode: created.reportCode,
          assetId: created.assetId,
          roomId: created.roomId,
          status: created.status,
        }),
      });

      const facilityManagers = await tx.user.findMany({
        where: {
          role: { code: 'QL_CSVC' },
          status: UserStatus.ACTIVE,
        },
        select: { id: true },
      });

      if (facilityManagers.length > 0) {
        await tx.notification.createMany({
          data: facilityManagers.map((manager) => ({
            userId: manager.id,
            title: 'Có phiếu báo hỏng mới',
            content: `Sinh viên vừa tạo phiếu báo hỏng ${created.reportCode}.`,
            status: NotificationStatus.UNREAD,
            relatedTable: 'damage_reports',
            relatedId: created.id,
          })),
        });
      }

      return created;
    });

    return report;
  }

  async findAll(currentUser: AuthUser, query: QueryDamageReportsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where: Prisma.DamageReportWhereInput = {};

    if (currentUser.role === 'STUDENT') {
      where.reporterId = currentUser.userId;
    }

    if (query.status) {
      where.status = query.status;
    }


    if (query.roomId) {
      where.roomId = query.roomId;
    }

    if (query.keyword?.trim()) {
      const keyword = query.keyword.trim();
      where.OR = [
        {
          reportCode: {
            contains: keyword,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: keyword,
            mode: 'insensitive',
          },
        },
        {
          asset: {
            assetCode: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
        },
        {
          asset: {
            assetName: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
        },
        {
          room: {
            roomCode: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prismaService.damageReport.findMany({
        where,
        include: this.damageReportInclude,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prismaService.damageReport.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  async findOne(currentUser: AuthUser, id: number) {
    const report = await this.prismaService.damageReport.findUnique({
      where: { id },
      include: this.damageReportDetailInclude,
    });

    if (!report) {
      throw new NotFoundException('Không tìm thấy phiếu báo hỏng.');
    }

    this.ensureCanAccessReport(currentUser, report.reporterId);
    return report;
  }

  async exportData(currentUser: AuthUser, id: number) {
    const report = await this.prismaService.damageReport.findUnique({
      where: { id },
      include: this.damageReportDetailInclude,
    });

    if (!report) {
      throw new NotFoundException('Không tìm thấy phiếu báo hỏng.');
    }

    this.ensureCanAccessReport(currentUser, report.reporterId);

    return {
      ...report,
      printable: {
        title: 'QL_BM4 - Phiếu báo hỏng tài sản',
        generatedAt: new Date().toISOString(),
        reporterLabel: `${report.reporter.fullName} (${report.reporter.userCode})`,
        assetLabel: `${report.asset.assetCode} - ${report.asset.assetName}`,
        roomLabel: report.room.roomCode,
      },
    };
  }

  async update(currentUser: AuthUser, id: number, dto: UpdateDamageReportDto) {
    const report = await this.prismaService.damageReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('Không tìm thấy phiếu báo hỏng.');
    }

    this.ensureStudentOwnsPendingReport(currentUser, report);

    const nextRoomId = dto.roomId ?? report.roomId;
    const nextAssetId = dto.assetId ?? report.assetId;
    await this.ensureStudentCanReport(currentUser.userId, nextRoomId, nextAssetId);

    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.damageReport.update({
        where: { id },
        data: {
          roomId: nextRoomId,
          assetId: nextAssetId,
          description: dto.description === undefined ? undefined : dto.description.trim(),
          location: dto.location === undefined ? undefined : dto.location.trim(),
        },
        include: this.damageReportInclude,
      });

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'update',
        recordId: id,
        oldValue: this.stringifyPayload({
          roomId: report.roomId,
          assetId: report.assetId,
          description: report.description,
          location: report.location,
        }),
        newValue: this.stringifyPayload({
          roomId: updated.roomId,
          assetId: updated.assetId,
          description: updated.description,
          location: updated.location,
        }),
      });

      return updated;
    });
  }

  async accept(currentUser: AuthUser, id: number, dto: WorkflowNoteDto) {
    return this.transitionStatus(currentUser, {
      id,
      action: 'receive',
      allowedStatuses: [DamageReportStatus.SUBMITTED],
      nextStatus: DamageReportStatus.REVIEWING,
      note: dto.note,
      notificationTitle: 'Phiếu báo hỏng đã được tiếp nhận',
      notificationContent: 'Yêu cầu của bạn đã được tiếp nhận và sẽ được xử lý.',
      auditAction: 'accept',
    });
  }

  async reject(currentUser: AuthUser, id: number, dto: WorkflowNoteDto) {
    return this.transitionStatus(currentUser, {
      id,
      action: 'reject',
      allowedStatuses: [DamageReportStatus.SUBMITTED, DamageReportStatus.REVIEWING],
      nextStatus: DamageReportStatus.REJECTED,
      note: dto.note,
      notificationTitle: 'Phiếu báo hỏng đã bị từ chối',
      notificationContent: 'Yêu cầu của bạn đã bị từ chối. Vui lòng xem ghi chú để biết thêm chi tiết.',
      auditAction: 'reject',
    });
  }

  async startProcessing(currentUser: AuthUser, id: number, dto: WorkflowNoteDto) {
    return this.transitionStatus(currentUser, {
      id,
      action: 'processing',
      allowedStatuses: [DamageReportStatus.REVIEWING],
      nextStatus: DamageReportStatus.IN_PROGRESS,
      note: dto.note,
      notificationTitle: 'Phiếu báo hỏng đang được xử lý',
      notificationContent: 'Yêu cầu của bạn đang được bộ phận CSVC xử lý.',
      auditAction: 'start_processing',
    });
  }

  async complete(currentUser: AuthUser, id: number, dto: CompleteDamageReportDto) {
    if (
      dto.assetStatus &&
      dto.assetStatus !== AssetStatus.AVAILABLE &&
      dto.assetStatus !== AssetStatus.UNDER_MAINTENANCE
    ) {
      throw new BadRequestException(
        'Chỉ được cập nhật tài sản sang AVAILABLE hoặc UNDER_MAINTENANCE khi hoàn tất.',
      );
    }

    return this.prismaService.$transaction(async (tx) => {
      const report = await tx.damageReport.findUnique({
        where: { id },
        include: {
          asset: true,
        },
      });

      if (!report) {
        throw new NotFoundException('Không tìm thấy phiếu báo hỏng.');
      }

      this.ensureManagerCanProcess(currentUser);
      this.ensureTransitionAllowed(report.status, [DamageReportStatus.IN_PROGRESS]);

      const updatedReport = await tx.damageReport.update({
        where: { id },
        data: {
          status: DamageReportStatus.COMPLETED,
        },
        include: this.damageReportInclude,
      });

      if (dto.assetStatus) {
        await tx.asset.update({
          where: { id: report.assetId },
          data: {
            status: dto.assetStatus,
          },
        });
      }

      await this.createDamageLog(tx, {
        reportId: id,
        action: 'complete',
        oldStatus: report.status,
        newStatus: DamageReportStatus.COMPLETED,
        createdBy: currentUser.userId,
        note: dto.note,
      });

      await this.createNotification(tx, {
        userId: report.reporterId,
        title: 'Phiếu báo hỏng đã hoàn tất',
        content:
          dto.assetStatus === AssetStatus.UNDER_MAINTENANCE
            ? 'Phiếu báo hỏng đã hoàn tất. Tài sản đã được đưa vào trạng thái bảo trì.'
            : 'Phiếu báo hỏng đã hoàn tất. Tài sản sẵn sàng sử dụng trở lại.',
        relatedId: id,
      });

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'complete',
        recordId: id,
        oldValue: this.stringifyPayload({
          status: report.status,
          assetStatus: report.asset.status,
        }),
        newValue: this.stringifyPayload({
          status: DamageReportStatus.COMPLETED,
          assetStatus: dto.assetStatus ?? report.asset.status,
        }),
      });

      return updatedReport;
    });
  }

  async cancel(currentUser: AuthUser, id: number, dto: WorkflowNoteDto) {
    const report = await this.prismaService.damageReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('Không tìm thấy phiếu báo hỏng.');
    }

    this.ensureStudentOwnsPendingReport(currentUser, report);

    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.damageReport.update({
        where: { id },
        data: {
          status: DamageReportStatus.REJECTED,
        },
        include: this.damageReportInclude,
      });

      await this.createDamageLog(tx, {
        reportId: id,
        action: 'cancel',
        oldStatus: report.status,
        newStatus: DamageReportStatus.REJECTED,
        createdBy: currentUser.userId,
        note: dto.note,
      });

      await this.createNotification(tx, {
        userId: report.reporterId,
        title: 'Phiếu báo hỏng đã được hủy',
        content: 'Phiếu báo hỏng của bạn đã được hủy.',
        relatedId: id,
      });

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'cancel',
        recordId: id,
        oldValue: this.stringifyPayload({ status: report.status }),
        newValue: this.stringifyPayload({ status: DamageReportStatus.REJECTED }),
      });

      return updated;
    });
  }

  async findMyAssets(currentUser: AuthUser) {
    const activeAssignment = await this.prismaService.roomStudent.findFirst({
      where: {
        studentId: currentUser.userId,
        isActive: true,
      },
      include: {
        room: {
          include: {
            floor: {
              include: {
                building: true,
              },
            },
            assets: {
              orderBy: {
                assetCode: 'asc',
              },
            },
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    if (!activeAssignment) {
      return {
        room: null,
        assets: [],
      };
    }

    return {
      room: activeAssignment.room,
      assets: activeAssignment.room.assets,
    };
  }

  private get damageReportInclude() {
    return {
      reporter: {
        include: {
          role: true,
        },
      },
      asset: {
        include: {
          category: true,
        },
      },
      room: {
        include: {
          floor: {
            include: {
              building: true,
            },
          },
        },
      },
    } satisfies Prisma.DamageReportInclude;
  }

  private get damageReportDetailInclude() {
    return {
      ...this.damageReportInclude,
      damageReportLogs: {
        include: {
          createdByUser: {
            include: {
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    } satisfies Prisma.DamageReportInclude;
  }

  private ensureCanAccessReport(currentUser: AuthUser, reporterId: number) {
    if (currentUser.role === 'STUDENT' && reporterId !== currentUser.userId) {
      throw new ForbiddenException('Bạn không có quyền xem phiếu báo hỏng này.');
    }
  }

  private ensureStudentOwnsPendingReport(
    currentUser: AuthUser,
    report: { reporterId: number; status: DamageReportStatus },
  ) {
    if (currentUser.role !== 'STUDENT') {
      throw new ForbiddenException('Chỉ sinh viên mới được thực hiện thao tác này.');
    }

    if (report.reporterId !== currentUser.userId) {
      throw new ForbiddenException('Bạn không có quyền thao tác trên phiếu báo hỏng này.');
    }

    if (report.status !== DamageReportStatus.SUBMITTED) {
      throw new ConflictException('Chỉ được phép chỉnh sửa/hủy phiếu báo hỏng khi đang ở trạng thái "Chờ xử lý" (SV_QĐ2).');
    }
  }

  private ensureManagerCanProcess(currentUser: AuthUser) {
    if (!['ADMIN', 'QL_CSVC'].includes(currentUser.role)) {
      throw new ForbiddenException('Bạn không có quyền xử lý phiếu báo hỏng.');
    }
  }

  private ensureTransitionAllowed(currentStatus: DamageReportStatus, allowedStatuses: DamageReportStatus[]) {
    if (!allowedStatuses.includes(currentStatus)) {
      throw new ConflictException('Không thể thực hiện chuyển trạng thái với phiếu hiện tại.');
    }
  }

  private async transitionStatus(
    currentUser: AuthUser,
    input: {
      id: number;
      action: string;
      allowedStatuses: DamageReportStatus[];
      nextStatus: DamageReportStatus;
      note?: string;
      notificationTitle: string;
      notificationContent: string;
      auditAction: string;
    },
  ) {
    return this.prismaService.$transaction(async (tx) => {
      const report = await tx.damageReport.findUnique({
        where: { id: input.id },
      });

      if (!report) {
        throw new NotFoundException('Không tìm thấy phiếu báo hỏng.');
      }

      this.ensureManagerCanProcess(currentUser);
      this.ensureTransitionAllowed(report.status, input.allowedStatuses);

      const updated = await tx.damageReport.update({
        where: { id: input.id },
        data: {
          status: input.nextStatus,
        },
        include: this.damageReportInclude,
      });

      await this.createDamageLog(tx, {
        reportId: input.id,
        action: input.action,
        oldStatus: report.status,
        newStatus: input.nextStatus,
        createdBy: currentUser.userId,
        note: input.note,
      });

      await this.createNotification(tx, {
        userId: report.reporterId,
        title: input.notificationTitle,
        content: input.notificationContent,
        relatedId: input.id,
      });

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: input.auditAction,
        recordId: input.id,
        oldValue: this.stringifyPayload({ status: report.status }),
        newValue: this.stringifyPayload({ status: input.nextStatus }),
      });

      return updated;
    });
  }

  private async ensureStudentCanReport(studentId: number, roomId: number, assetId: number) {
    const roomStudent = await this.prismaService.roomStudent.findFirst({
      where: {
        studentId,
        roomId,
        isActive: true,
      },
      include: {
        room: true,
      },
    });

    if (!roomStudent) {
      throw new ForbiddenException('Sinh viên chỉ được báo hỏng tài sản thuộc phòng mình.');
    }

    const asset = await this.prismaService.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset || asset.roomId !== roomId) {
      throw new BadRequestException('Tài sản không thuộc phòng đã chọn.');
    }

    return roomStudent;
  }

  private async generateReportCode() {
    return `QL_BM4_${Date.now()}`;
  }

  private async createDamageLog(
    tx: Prisma.TransactionClient,
    input: {
      reportId: number;
      action: string;
      oldStatus?: DamageReportStatus;
      newStatus?: DamageReportStatus;
      note?: string;
      createdBy: number;
    },
  ) {
    await tx.damageReportLog.create({
      data: {
        reportId: input.reportId,
        action: input.action,
        oldStatus: input.oldStatus,
        newStatus: input.newStatus,
        note: input.note?.trim() || null,
        createdBy: input.createdBy,
      },
    });
  }

  private async createNotification(
    tx: Prisma.TransactionClient,
    input: {
      userId: number;
      title: string;
      content: string;
      relatedId: number;
    },
  ) {
    await tx.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        content: input.content,
        status: NotificationStatus.UNREAD,
        relatedTable: 'damage_reports',
        relatedId: input.relatedId,
      },
    });
  }

  private async createAuditLog(
    tx: Prisma.TransactionClient,
    input: {
      userId: number;
      action: string;
      recordId: number;
      oldValue?: string | null;
      newValue?: string | null;
    },
  ) {
    await tx.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        tableName: 'damage_reports',
        recordId: input.recordId,
        oldValue: input.oldValue ?? null,
        newValue: input.newValue ?? null,
      },
    });
  }

  private stringifyPayload(value: Record<string, unknown>) {
    return JSON.stringify(value);
  }
}
