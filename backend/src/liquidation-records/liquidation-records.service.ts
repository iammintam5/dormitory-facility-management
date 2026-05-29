import { AssetStatus, ApprovalStatus, NotificationStatus, Prisma, UserStatus } from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../auth/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLiquidationRecordDto } from './dto/create-liquidation-record.dto';
import { QueryLiquidationRecordsDto } from './dto/query-liquidation-records.dto';
import { LiquidationWorkflowNoteDto } from './dto/liquidation-workflow-note.dto';
import { UpdateCouncilDto } from './dto/update-council.dto';

@Injectable()
export class LiquidationRecordsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(currentUser: AuthUser, dto: CreateLiquidationRecordDto) {
    this.ensureManager(currentUser);
    const asset = await this.ensureAssetExists(dto.assetId);
    await this.ensureNoOpenLiquidation(dto.assetId);

    const liquidationCode = await this.generateLiquidationCode();

    try {
      return await this.prismaService.$transaction(async (tx) => {
        const created = await tx.liquidationRecord.create({
          data: {
            liquidationCode,
            createdBy: currentUser.userId,
            liquidationDate: new Date(dto.liquidationDate),
            status: ApprovalStatus.DRAFT,
            note: dto.note?.trim() || null,
            liquidationItems: {
              create: [
                {
                  assetId: dto.assetId,
                  assetCondition: dto.assetCondition.trim(),
                  reason: dto.reason.trim(),
                  estimatedRemainingValue: dto.estimatedRemainingValue,
                },
              ],
            },
            ...(dto.members && dto.members.length > 0 && {
              councilMembers: {
                create: dto.members.map(m => ({
                  userId: m.userId,
                  roleInCouncil: m.roleInCouncil.trim(),
                })),
              },
            }),
          },
          include: this.liquidationRecordInclude,
        });

        await tx.asset.update({
          where: { id: dto.assetId },
          data: {
            status: AssetStatus.PENDING_LIQUIDATION,
          },
        });

        await this.createAuditLog(tx, {
          userId: currentUser.userId,
          action: 'create',
          tableName: 'liquidation_records',
          recordId: created.id,
          newValue: this.stringifyPayload({
            liquidationCode,
            assetId: dto.assetId,
            status: created.status,
            reason: dto.reason,
          }),
        });

        return created;
      }, { timeout: 15000 });
    } catch (error: any) {
      throw error;
    }
  }

  async findAll(currentUser: AuthUser, query: QueryLiquidationRecordsDto) {
    this.ensureManager(currentUser);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where: Prisma.LiquidationRecordWhereInput = {};
    const assetWhere: Prisma.AssetWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.roomId) {
      assetWhere.roomId = query.roomId;
    }

    if (query.categoryId) {
      assetWhere.categoryId = query.categoryId;
    }

    if (query.keyword?.trim()) {
      const keyword = query.keyword.trim();
      where.OR = [
        { liquidationCode: { contains: keyword, mode: 'insensitive' } },
        { liquidationItems: { some: { reason: { contains: keyword, mode: 'insensitive' } } } },
        { liquidationItems: { some: { assetCondition: { contains: keyword, mode: 'insensitive' } } } },
        { liquidationItems: { some: { asset: { assetCode: { contains: keyword, mode: 'insensitive' } } } } },
        { liquidationItems: { some: { asset: { assetName: { contains: keyword, mode: 'insensitive' } } } } },
      ];
    }

    if (Object.keys(assetWhere).length > 0) {
      where.liquidationItems = { some: { asset: assetWhere } };
    }

    const [items, total] = await Promise.all([
      this.prismaService.liquidationRecord.findMany({
        where,
        include: this.liquidationRecordInclude,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.liquidationRecord.count({ where }),
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
    this.ensureManager(currentUser);
    return this.ensureRecordExists(id);
  }

  async exportRecord(currentUser: AuthUser, id: number) {
    const record = await this.findOne(currentUser, id);
    const asset = record.liquidationItems[0]?.asset;
    return {
      ...record,
      printable: {
        title: 'Bien ban thanh ly tai san',
        generatedAt: new Date().toISOString(),
        assetLabel: asset ? `${asset.assetName} (${asset.assetCode})` : 'N/A',
        createdByLabel: `${record.createdByUser.fullName} (${record.createdByUser.userCode})`,
      },
    };
  }

  async findAssetHistory(currentUser: AuthUser, assetId: number) {
    this.ensureManager(currentUser);
    await this.ensureAssetExists(assetId);

    return this.prismaService.liquidationRecord.findMany({
      where: { liquidationItems: { some: { assetId } } },
      include: this.liquidationRecordInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async submitForApproval(currentUser: AuthUser, id: number, dto: LiquidationWorkflowNoteDto) {
    this.ensureManager(currentUser);
    const record = await this.ensureRecordExists(id);
    if (
      record.status !== ApprovalStatus.DRAFT &&
      record.status !== ApprovalStatus.REJECTED
    ) {
      throw new ConflictException('Chỉ được gửi duyệt biên bản ở trạng thái DRAFT hoặc REJECTED.');
    }

    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.liquidationRecord.update({
        where: { id },
        data: {
          status: ApprovalStatus.PENDING,
          note: dto.note?.trim() ? `${record.note ? `${record.note}\n\n` : ''}${dto.note.trim()}` : record.note,
        },
        include: this.liquidationRecordInclude,
      });

      const admins = await tx.user.findMany({
        where: {
          role: { code: 'ADMIN' },
          status: UserStatus.ACTIVE,
        },
        select: { id: true },
      });

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            title: 'Cần duyệt biên bản thanh lý',
            content: `Biên bản ${updated.liquidationCode} đang chờ phê duyệt.`,
            status: NotificationStatus.UNREAD,
            relatedTable: 'liquidation_records',
            relatedId: updated.id,
          })),
        });
      }

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'submit_approval',
        tableName: 'liquidation_records',
        recordId: id,
        oldValue: this.stringifyPayload({ status: record.status }),
        newValue: this.stringifyPayload({ status: updated.status }),
      });

      return tx.liquidationRecord.findUniqueOrThrow({
        where: { id: updated.id },
        include: this.liquidationRecordInclude,
      });
    });
  }

  async approve(currentUser: AuthUser, id: number, dto: LiquidationWorkflowNoteDto) {
    this.ensureAdmin(currentUser);
    const record = await this.ensureRecordExists(id);
    if (record.status !== ApprovalStatus.PENDING) {
      throw new ConflictException('Chỉ được duyệt biên bản đang chờ phê duyệt.');
    }

    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.liquidationRecord.update({
        where: { id },
        data: {
          status: ApprovalStatus.APPROVED,
          note: dto.note?.trim() ? `${record.note ? `${record.note}\n\n` : ''}${dto.note.trim()}` : record.note,
        },
        include: this.liquidationRecordInclude,
      });

      await this.notifyUsers(tx, [record.createdBy], {
        title: 'Biên bản thanh lý đã được duyệt',
        content: `Biên bản ${updated.liquidationCode} đã được phê duyệt.`,
        relatedId: updated.id,
      });

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'approve',
        tableName: 'liquidation_records',
        recordId: id,
        oldValue: this.stringifyPayload({ status: record.status }),
        newValue: this.stringifyPayload({ status: updated.status }),
      });

      return tx.liquidationRecord.findUniqueOrThrow({
        where: { id: updated.id },
        include: this.liquidationRecordInclude,
      });
    });
  }

  async reject(currentUser: AuthUser, id: number, dto: LiquidationWorkflowNoteDto) {
    this.ensureAdmin(currentUser);
    const record = await this.ensureRecordExists(id);
    if (record.status !== ApprovalStatus.PENDING) {
      throw new ConflictException('Chỉ được từ chối biên bản đang chờ phê duyệt.');
    }

    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.liquidationRecord.update({
        where: { id },
        data: {
          status: ApprovalStatus.REJECTED,
          note: dto.note?.trim() ? `${record.note ? `${record.note}\n\n` : ''}${dto.note.trim()}` : record.note,
        },
        include: this.liquidationRecordInclude,
      });

      const assetId = record.liquidationItems[0]?.assetId;
      if (assetId) {
        await this.restoreAssetIfNoOpenLiquidation(tx, assetId);
      }

      await this.notifyUsers(tx, [record.createdBy], {
        title: 'Biên bản thanh lý bị từ chối',
        content: `Biên bản ${updated.liquidationCode} đã bị từ chối.`,
        relatedId: updated.id,
      });

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'reject',
        tableName: 'liquidation_records',
        recordId: id,
        oldValue: this.stringifyPayload({ status: record.status }),
        newValue: this.stringifyPayload({ status: updated.status }),
      });

      return tx.liquidationRecord.findUniqueOrThrow({
        where: { id: updated.id },
        include: this.liquidationRecordInclude,
      });
    });
  }

  async complete(currentUser: AuthUser, id: number, dto: LiquidationWorkflowNoteDto) {
    this.ensureAdmin(currentUser);
    const record = await this.ensureRecordExists(id);
    if (record.status !== ApprovalStatus.APPROVED) {
      throw new ConflictException('Chỉ được hoàn tất biên bản đã được duyệt.');
    }

    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.liquidationRecord.update({
        where: { id },
        data: {
          status: ApprovalStatus.COMPLETED,
          note: dto.note?.trim() ? `${record.note ? `${record.note}\n\n` : ''}${dto.note.trim()}` : record.note,
        },
        include: this.liquidationRecordInclude,
      });

      const assetId = record.liquidationItems[0]?.assetId;
      if (assetId) {
        await tx.asset.update({
          where: { id: assetId },
          data: {
            status: AssetStatus.LIQUIDATED,
          },
        });
      }

      await this.notifyUsers(tx, [record.createdBy], {
        title: 'Đã hoàn tất thanh lý tài sản',
        content: `Biên bản ${updated.liquidationCode} đã hoàn tất thanh lý.`,
        relatedId: updated.id,
      });

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'complete',
        tableName: 'liquidation_records',
        recordId: id,
        oldValue: this.stringifyPayload({ status: record.status }),
        newValue: this.stringifyPayload({ status: updated.status }),
      });

      return updated;
    });
  }

  async cancel(currentUser: AuthUser, id: number, dto: LiquidationWorkflowNoteDto) {
    this.ensureManager(currentUser);
    const record = await this.ensureRecordExists(id);
    if (
      record.status === ApprovalStatus.COMPLETED ||
      record.status === ApprovalStatus.CANCELLED
    ) {
      throw new ConflictException('Không thể hủy biên bản đã hoàn tất hoặc đã hủy.');
    }

    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.liquidationRecord.update({
        where: { id },
        data: {
          status: ApprovalStatus.CANCELLED,
          note: dto.note?.trim() ? `${record.note ? `${record.note}\n\n` : ''}${dto.note.trim()}` : record.note,
        },
        include: this.liquidationRecordInclude,
      });

      const assetId = record.liquidationItems[0]?.assetId;
      if (assetId) {
        await this.restoreAssetIfNoOpenLiquidation(tx, assetId);
      }

      await this.notifyUsers(tx, [record.createdBy], {
        title: 'Biên bản thanh lý đã bị hủy',
        content: `Biên bản ${updated.liquidationCode} đã bị hủy.`,
        relatedId: updated.id,
      });

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'cancel',
        tableName: 'liquidation_records',
        recordId: id,
        oldValue: this.stringifyPayload({ status: record.status }),
        newValue: this.stringifyPayload({ status: updated.status }),
      });

      return updated;
    });
  }

  async updateCouncil(currentUser: AuthUser, id: number, dto: UpdateCouncilDto) {
    this.ensureManager(currentUser);
    const record = await this.ensureRecordExists(id);
    if (record.status !== ApprovalStatus.DRAFT) {
      throw new ConflictException('Chỉ được cập nhật hội đồng khi đang ở trạng thái DRAFT.');
    }

    return this.prismaService.$transaction(async (tx) => {
      await tx.liquidationCouncilMember.deleteMany({
        where: { liquidationRecordId: id },
      });

      if (dto.members && dto.members.length > 0) {
        await tx.liquidationCouncilMember.createMany({
          data: dto.members.map((member: any) => ({
            liquidationRecordId: id,
            userId: member.userId,
            roleInCouncil: member.roleInCouncil.trim(),
          })),
        });
      }

      return tx.liquidationRecord.findUnique({
        where: { id },
        include: this.liquidationRecordInclude,
      });
    });
  }

  private get liquidationRecordInclude() {
    return {
      liquidationItems: {
        include: {
          asset: {
            include: {
              category: true,
              room: {
                include: {
                  floor: {
                    include: {
                      building: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      createdByUser: {
        include: {
          role: true,
        },
      },
      councilMembers: {
        include: {
          user: {
            include: {
              role: true,
            },
          },
        },
      },
    } satisfies Prisma.LiquidationRecordInclude;
  }

  private ensureManager(currentUser: AuthUser) {
    if (!['ADMIN', 'QL_CSVC'].includes(currentUser.role)) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác thanh lý tài sản.');
    }
  }

  private ensureAdmin(currentUser: AuthUser) {
    if (currentUser.role !== 'ADMIN') {
      throw new ForbiddenException('Chỉ quản trị viên mới được phê duyệt thanh lý.');
    }
  }

  private async ensureAssetExists(assetId: number) {
    const asset = await this.prismaService.asset.findUnique({
      where: { id: assetId },
      include: {
        category: true,
        room: {
          include: {
            floor: {
              include: {
                building: true,
              },
            },
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException('Không tìm thấy tài sản.');
    }

    if (asset.status === AssetStatus.LIQUIDATED) {
      throw new BadRequestException('Tài sản đã thanh lý, không thể tạo biên bản mới.');
    }

    return asset;
  }

  private async ensureRecordExists(id: number) {
    const record = await this.prismaService.liquidationRecord.findUnique({
      where: { id },
      include: this.liquidationRecordInclude,
    });

    if (!record) {
      throw new NotFoundException('Không tìm thấy biên bản thanh lý.');
    }

    return record;
  }

  private async ensureNoOpenLiquidation(assetId: number) {
    const openCount = await this.prismaService.liquidationRecord.count({
      where: {
        liquidationItems: { some: { assetId } },
        status: {
          in: [
            ApprovalStatus.DRAFT,
            ApprovalStatus.PENDING,
            ApprovalStatus.APPROVED,
          ],
        },
      },
    });

    if (openCount > 0) {
      throw new ConflictException('Tài sản đã có biên bản thanh lý đang xử lý.');
    }
  }

  private async restoreAssetIfNoOpenLiquidation(tx: Prisma.TransactionClient, assetId: number) {
    const openCount = await tx.liquidationRecord.count({
      where: {
        liquidationItems: { some: { assetId } },
        status: {
          in: [
            ApprovalStatus.DRAFT,
            ApprovalStatus.PENDING,
            ApprovalStatus.APPROVED,
          ],
        },
      },
    });

    if (openCount === 0) {
      await tx.asset.updateMany({
        where: {
          id: assetId,
          status: AssetStatus.PENDING_LIQUIDATION,
        },
        data: {
          status: AssetStatus.AVAILABLE,
        },
      });
    }
  }

  private async notifyUsers(
    tx: Prisma.TransactionClient,
    userIds: number[],
    payload: { title: string; content: string; relatedId: number },
  ) {
    const uniqueUserIds = Array.from(new Set(userIds));
    if (uniqueUserIds.length === 0) {
      return;
    }

    await tx.notification.createMany({
      data: uniqueUserIds.map((userId) => ({
        userId,
        title: payload.title,
        content: payload.content,
        status: NotificationStatus.UNREAD,
        relatedTable: 'liquidation_records',
        relatedId: payload.relatedId,
      })),
    });
  }

  private async createAuditLog(
    tx: Prisma.TransactionClient,
    payload: {
      userId: number;
      action: string;
      tableName: string;
      recordId: number;
      oldValue?: string | null;
      newValue?: string | null;
    },
  ) {
    await tx.auditLog.create({
      data: {
        userId: payload.userId,
        action: payload.action,
        tableName: payload.tableName,
        recordId: payload.recordId,
        oldValue: payload.oldValue ?? null,
        newValue: payload.newValue ?? null,
      },
    });
  }

  private stringifyPayload(payload: Record<string, unknown>) {
    return JSON.stringify(payload);
  }

  private async generateLiquidationCode() {
    return `QL_BM5_${Date.now()}`;
  }
}
