import {
  AssetStatus,
  ApprovalStatus,
  NotificationStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../auth/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHandoverDto } from './dto/create-handover.dto';
import { QueryHandoversDto } from './dto/query-handovers.dto';
import { UpdateHandoverDto } from './dto/update-handover.dto';
import { WorkflowNoteDto } from './dto/workflow-note.dto';
import { MarkReturnedDto } from './dto/mark-returned.dto';

@Injectable()
export class HandoversService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(currentUser: AuthUser, dto: CreateHandoverDto) {
    this.ensureManager(currentUser);

    const room = await this.ensureRoomExists(dto.roomId);
    const student = await this.ensureStudentInRoom(dto.studentId, dto.roomId);
    await this.ensureAssetsBelongToRoom(dto.roomId, dto.items.map((item) => item.assetId));
    await this.ensureDistinctAssets(dto.items.map((item) => item.assetId));
    const handoverCode = await this.generateHandoverCode();

    return this.prismaService.$transaction(async (tx) => {
      const created = await tx.handover.create({
        data: {
          handoverCode,
          roomId: dto.roomId,
          studentId: dto.studentId,
          createdBy: currentUser.userId,
          handoverDate: new Date(dto.handoverDate),
          status: ApprovalStatus.DRAFT,
          note: dto.note?.trim() || null,
          handoverItems: {
            create: dto.items.map((item) => ({
              assetId: item.assetId,
              quantity: item.quantity,
              conditionAtHandover: item.conditionAtHandover.trim(),
              note: item.note?.trim() || null,
            })),
          },
        },
        include: this.handoverDetailInclude,
      });

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'create',
        recordId: created.id,
        newValue: this.stringifyPayload({
          handoverCode: created.handoverCode,
          roomId: created.roomId,
          studentId: created.studentId,
          status: created.status,
          itemCount: created.handoverItems.length,
        }),
      });

      return created;
    });
  }

  async findAll(currentUser: AuthUser, query: QueryHandoversDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where: Prisma.HandoverWhereInput = {};

    if (currentUser.role === 'STUDENT') {
      where.studentId = currentUser.userId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.roomId) {
      where.roomId = query.roomId;
    }

    if (query.studentId) {
      where.studentId = query.studentId;
    }

    if (query.keyword?.trim()) {
      const keyword = query.keyword.trim();
      where.OR = [
        {
          handoverCode: {
            contains: keyword,
            mode: 'insensitive',
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
        {
          student: {
            fullName: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
        },
        {
          student: {
            userCode: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prismaService.handover.findMany({
        where,
        include: this.handoverListInclude,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prismaService.handover.count({ where }),
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
    const handover = await this.prismaService.handover.findUnique({
      where: { id },
      include: this.handoverDetailInclude,
    });

    if (!handover) {
      throw new NotFoundException('Không tìm thấy biên bản bàn giao.');
    }

    this.ensureCanAccess(currentUser, handover.studentId);
    return handover;
  }

  async update(currentUser: AuthUser, id: number, dto: UpdateHandoverDto) {
    this.ensureManager(currentUser);
    const handover = await this.ensureHandoverExists(id);
    this.ensureDraft(handover.status);

    const roomId = dto.roomId ?? handover.roomId;
    const studentId = dto.studentId ?? handover.studentId;

    await this.ensureRoomExists(roomId);
    await this.ensureStudentInRoom(studentId, roomId);

    if (dto.items?.length) {
      await this.ensureAssetsBelongToRoom(roomId, dto.items.map((item) => item.assetId));
      await this.ensureDistinctAssets(dto.items.map((item) => item.assetId));
    }

    return this.prismaService.$transaction(async (tx) => {
      await tx.handover.update({
        where: { id },
        data: {
          roomId,
          studentId,
          handoverDate: dto.handoverDate ? new Date(dto.handoverDate) : undefined,
          note: dto.note === undefined ? undefined : dto.note?.trim() || null,
        },
      });

      if (dto.items) {
        await tx.handoverItem.deleteMany({
          where: { handoverId: id },
        });

        await tx.handoverItem.createMany({
          data: dto.items.map((item) => ({
            handoverId: id,
            assetId: item.assetId,
            quantity: item.quantity,
            conditionAtHandover: item.conditionAtHandover.trim(),
            note: item.note?.trim() || null,
          })),
        });
      }

      const updated = await tx.handover.findUnique({
        where: { id },
        include: this.handoverDetailInclude,
      });

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'update',
        recordId: id,
        oldValue: this.stringifyPayload({
          roomId: handover.roomId,
          studentId: handover.studentId,
          handoverDate: handover.handoverDate,
          note: handover.note,
        }),
        newValue: this.stringifyPayload({
          roomId,
          studentId,
          handoverDate: dto.handoverDate ?? handover.handoverDate,
          note: dto.note ?? handover.note,
          itemCount: dto.items?.length,
        }),
      });

      return updated;
    });
  }

  async sendConfirmation(currentUser: AuthUser, id: number, dto: WorkflowNoteDto) {
    this.ensureManager(currentUser);

    return this.prismaService.$transaction(async (tx) => {
      const handover = await tx.handover.findUnique({
        where: { id },
        include: {
          handoverItems: true,
          room: true,
        },
      });

      if (!handover) {
        throw new NotFoundException('Không tìm thấy biên bản bàn giao.');
      }

      this.ensureDraft(handover.status);

      const updated = await tx.handover.update({
        where: { id },
        data: {
          status: ApprovalStatus.PENDING,
          note: dto.note?.trim() ? dto.note.trim() : handover.note,
        },
        include: this.handoverDetailInclude,
      });

      await this.createNotification(tx, {
        userId: handover.studentId,
        title: 'Có biên bản bàn giao cần xác nhận',
        content: `Biên bản ${handover.handoverCode} đang chờ bạn xác nhận.`,
        relatedId: handover.id,
      });

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'send_confirmation',
        recordId: id,
        oldValue: this.stringifyPayload({ status: handover.status }),
        newValue: this.stringifyPayload({ status: ApprovalStatus.PENDING }),
      });

      return updated;
    });
  }

  async confirm(currentUser: AuthUser, id: number, dto: WorkflowNoteDto) {
    if (currentUser.role !== 'STUDENT') {
      throw new ForbiddenException('Chỉ sinh viên mới được xác nhận biên bản.');
    }

    return this.prismaService.$transaction(async (tx) => {
      const handover = await tx.handover.findUnique({
        where: { id },
        include: {
          handoverItems: {
            include: {
              asset: true,
            },
          },
        },
      });

      if (!handover) {
        throw new NotFoundException('Không tìm thấy biên bản bàn giao.');
      }

      if (handover.studentId !== currentUser.userId) {
        throw new ForbiddenException('Bạn không có quyền xác nhận biên bản này.');
      }

      if (handover.status !== ApprovalStatus.PENDING) {
        throw new ConflictException('Biên bản hiện không ở trạng thái chờ xác nhận.');
      }

      const updated = await tx.handover.update({
        where: { id },
        data: {
          status: ApprovalStatus.APPROVED,
          note: dto.note?.trim() ? dto.note.trim() : handover.note,
        },
        include: this.handoverDetailInclude,
      });

      await Promise.all(
        handover.handoverItems.map((item) =>
          tx.asset.update({
            where: { id: item.assetId },
            data: {
              status: AssetStatus.IN_USE,
            },
          }),
        ),
      );

      await this.createNotification(tx, {
        userId: handover.studentId,
        title: 'Bạn đã xác nhận biên bản bàn giao',
        content: `Biên bản ${handover.handoverCode} đã được xác nhận thành công.`,
        relatedId: handover.id,
      });

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'confirm',
        recordId: id,
        oldValue: this.stringifyPayload({ status: handover.status }),
        newValue: this.stringifyPayload({ status: ApprovalStatus.APPROVED }),
      });

      return updated;
    });
  }

  async cancel(currentUser: AuthUser, id: number, dto: WorkflowNoteDto) {
    this.ensureManager(currentUser);
    const handover = await this.ensureHandoverExists(id);

    if (
      handover.status !== ApprovalStatus.DRAFT &&
      handover.status !== ApprovalStatus.PENDING
    ) {
      throw new ConflictException('Chỉ được hủy biên bản khi còn ở trạng thái draft hoặc chờ xác nhận.');
    }

    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.handover.update({
        where: { id },
        data: {
          status: ApprovalStatus.CANCELLED,
          note: dto.note?.trim() ? dto.note.trim() : handover.note,
        },
        include: this.handoverDetailInclude,
      });

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'cancel',
        recordId: id,
        oldValue: this.stringifyPayload({ status: handover.status }),
        newValue: this.stringifyPayload({ status: ApprovalStatus.CANCELLED }),
      });

      return updated;
    });
  }

  async markReturned(currentUser: AuthUser, id: number, dto: MarkReturnedDto) {
    this.ensureManager(currentUser);
    const handover = await this.prismaService.handover.findUnique({
      where: { id },
      include: {
        handoverItems: true,
      },
    });

    if (!handover) {
      throw new NotFoundException('Không tìm thấy biên bản bàn giao.');
    }

    if (handover.status !== ApprovalStatus.APPROVED) {
      throw new ConflictException('Chỉ được ghi nhận trả tài sản khi biên bản đã xác nhận.');
    }

    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.handover.update({
        where: { id },
        data: {
          status: ApprovalStatus.COMPLETED,
          returnedAt: new Date(),
          note: dto.note?.trim() ? dto.note.trim() : handover.note,
        },
        include: this.handoverDetailInclude,
      });

      // Update conditionAtReturn for HandoverItems and status for Assets
      await Promise.all(
        dto.items.map(async (item) => {
          // find the handoverItem
          const handoverItem = handover.handoverItems.find(hi => hi.assetId === item.assetId);
          if (handoverItem) {
            await tx.handoverItem.update({
              where: { id: handoverItem.id },
              data: { conditionAtReturn: item.conditionAtReturn },
            });
          }
          return tx.asset.update({
            where: { id: item.assetId },
            data: {
              status: item.returnStatus,
            },
          });
        }),
      );

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'mark_returned',
        recordId: id,
        oldValue: this.stringifyPayload({ status: handover.status }),
        newValue: this.stringifyPayload({ status: ApprovalStatus.COMPLETED }),
      });

      return updated;
    });
  }

  async exportData(currentUser: AuthUser, id: number) {
    const handover = await this.findOne(currentUser, id);

    return {
      ...handover,
      printable: {
        title: 'Biên bản bàn giao tài sản',
        generatedAt: new Date().toISOString(),
        roomLabel: `${handover.room.roomCode} - ${handover.room.floor.building.name} / Tầng ${handover.room.floor.floorNumber}`,
        studentLabel: `${handover.student.fullName} (${handover.student.userCode})`,
      },
    };
  }

  async findRoomStudents(roomId: number) {
    await this.ensureRoomExists(roomId);

    const assignments = await this.prismaService.roomStudent.findMany({
      where: {
        roomId,
        isActive: true,
      },
      include: {
        student: {
          include: {
            role: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    return assignments.map((assignment) => assignment.student);
  }

  async findRoomAssets(roomId: number) {
    await this.ensureRoomExists(roomId);

    return this.prismaService.asset.findMany({
      where: { roomId },
      include: {
        category: true,
      },
      orderBy: {
        assetCode: 'asc',
      },
    });
  }

  private get handoverListInclude() {
    return {
      room: {
        include: {
          floor: {
            include: {
              building: true,
            },
          },
        },
      },
      student: {
        include: {
          role: true,
        },
      },
      handoverItems: {
        include: {
          asset: true,
        },
      },
      createdByUser: {
        include: {
          role: true,
        },
      },
    } satisfies Prisma.HandoverInclude;
  }

  private get handoverDetailInclude() {
    return {
      ...this.handoverListInclude,
      handoverItems: {
        include: {
          asset: {
            include: {
              category: true,
            },
          },
        },
      },
    } satisfies Prisma.HandoverInclude;
  }

  private async ensureHandoverExists(id: number) {
    const handover = await this.prismaService.handover.findUnique({
      where: { id },
    });

    if (!handover) {
      throw new NotFoundException('Không tìm thấy biên bản bàn giao.');
    }

    return handover;
  }

  private ensureManager(currentUser: AuthUser) {
    if (!['ADMIN', 'QL_CSVC'].includes(currentUser.role)) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này.');
    }
  }

  private ensureCanAccess(currentUser: AuthUser, studentId: number) {
    if (currentUser.role === 'STUDENT' && currentUser.userId !== studentId) {
      throw new ForbiddenException('Bạn không có quyền xem biên bản này.');
    }
  }

  private ensureDraft(status: ApprovalStatus) {
    if (status !== ApprovalStatus.DRAFT) {
      throw new ConflictException('Chỉ được cập nhật biên bản khi đang ở trạng thái DRAFT.');
    }
  }

  private async ensureRoomExists(roomId: number) {
    const room = await this.prismaService.room.findUnique({
      where: { id: roomId },
      include: {
        floor: {
          include: {
            building: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Không tìm thấy phòng.');
    }

    return room;
  }

  private async ensureStudentInRoom(studentId: number, roomId: number) {
    const assignment = await this.prismaService.roomStudent.findFirst({
      where: {
        studentId,
        roomId,
        isActive: true,
      },
      include: {
        student: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new BadRequestException('Sinh viên hiện không ở phòng đã chọn.');
    }

    if (assignment.student.role.code !== 'STUDENT') {
      throw new BadRequestException('Chỉ có thể lập biên bản cho sinh viên.');
    }

    return assignment.student;
  }

  private async ensureAssetsBelongToRoom(roomId: number, assetIds: number[]) {
    const assets = await this.prismaService.asset.findMany({
      where: {
        id: {
          in: assetIds,
        },
      },
    });

    if (assets.length !== assetIds.length) {
      throw new BadRequestException('Một hoặc nhiều tài sản không tồn tại.');
    }

    const invalidAsset = assets.find((asset) => asset.roomId !== roomId);
    if (invalidAsset) {
      throw new BadRequestException('Chỉ được chọn tài sản thuộc phòng đã chọn.');
    }
  }

  private async ensureDistinctAssets(assetIds: number[]) {
    if (new Set(assetIds).size !== assetIds.length) {
      throw new BadRequestException('Danh sách tài sản trong biên bản không được trùng lặp.');
    }
  }

  private async generateHandoverCode() {
    return `QL_BM1_${Date.now()}`;
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
        relatedTable: 'handovers',
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
        tableName: 'handovers',
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
