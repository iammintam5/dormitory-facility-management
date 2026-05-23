import {
  AssetStatus,
  DamageReportStatus,
  ApprovalStatus,
  MaintenanceResultStatus,
  MaintenanceType,
  NotificationStatus,
  Prisma,
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
import { CreateDamageReportFromMaintenanceDto } from './dto/create-damage-report-from-maintenance.dto';
import { CreateLiquidationRecordFromMaintenanceDto } from './dto/create-liquidation-record-from-maintenance.dto';
import { CreateMaintenancePlanDto } from './dto/create-maintenance-plan.dto';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto';
import { QueryDueAssetsDto } from './dto/query-due-assets.dto';
import { QueryMaintenancePlansDto } from './dto/query-maintenance-plans.dto';
import { QueryMaintenanceRecordsDto } from './dto/query-maintenance-records.dto';
import { UpdateMaintenancePlanDto } from './dto/update-maintenance-plan.dto';

@Injectable()
export class MaintenanceService {
  constructor(private readonly prismaService: PrismaService) {}

  async createPlan(currentUser: AuthUser, dto: CreateMaintenancePlanDto) {
    this.ensureManager(currentUser);
    await this.ensureAssetExists(dto.assetId);
    await this.ensureNoActivePlan(dto.assetId);

    return this.prismaService.$transaction(async (tx) => {
      const created = await tx.maintenancePlan.create({
        data: {
          assetId: dto.assetId,
          createdBy: currentUser.userId,
          cycleMonths: dto.cycleMonths,
          nextDueDate: new Date(dto.nextDueDate),
          isActive: dto.isActive ?? true,
          note: dto.note?.trim() || null,
        },
        include: this.maintenancePlanInclude,
      });

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'create',
        tableName: 'maintenance_plans',
        recordId: created.id,
        newValue: this.stringifyPayload({
          assetId: created.assetId,
          cycleMonths: created.cycleMonths,
          nextDueDate: created.nextDueDate,
          isActive: created.isActive,
        }),
      });

      return created;
    });
  }

  async updatePlan(currentUser: AuthUser, id: number, dto: UpdateMaintenancePlanDto) {
    this.ensureManager(currentUser);
    const plan = await this.ensurePlanExists(id);

    if (dto.assetId && dto.assetId !== plan.assetId) {
      await this.ensureAssetExists(dto.assetId);
      await this.ensureNoActivePlan(dto.assetId, id);
    }

    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.maintenancePlan.update({
        where: { id },
        data: {
          assetId: dto.assetId,
          cycleMonths: dto.cycleMonths,
          nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : undefined,
          isActive: dto.isActive,
          note: dto.note === undefined ? undefined : dto.note?.trim() || null,
        },
        include: this.maintenancePlanInclude,
      });

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'update',
        tableName: 'maintenance_plans',
        recordId: id,
        oldValue: this.stringifyPayload({
          assetId: plan.assetId,
          cycleMonths: plan.cycleMonths,
          nextDueDate: plan.nextDueDate,
          isActive: plan.isActive,
        }),
        newValue: this.stringifyPayload({
          assetId: updated.assetId,
          cycleMonths: updated.cycleMonths,
          nextDueDate: updated.nextDueDate,
          isActive: updated.isActive,
        }),
      });

      return updated;
    });
  }

  async findPlans(currentUser: AuthUser, query: QueryMaintenancePlansDto) {
    this.ensureManager(currentUser);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where: Prisma.MaintenancePlanWhereInput = {};

    if (query.assetId) where.assetId = query.assetId;
    if (query.categoryId) where.asset = { categoryId: query.categoryId };
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.keyword?.trim()) {
      const keyword = query.keyword.trim();
      where.OR = [
        { asset: { assetCode: { contains: keyword, mode: 'insensitive' } } },
        { asset: { assetName: { contains: keyword, mode: 'insensitive' } } },
        { note: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prismaService.maintenancePlan.findMany({
        where,
        include: this.maintenancePlanInclude,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { nextDueDate: 'asc' },
      }),
      this.prismaService.maintenancePlan.count({ where }),
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

  async findDueAssets(currentUser: AuthUser, query: QueryDueAssetsDto) {
    this.ensureManager(currentUser);
    const days = query.days ?? 7;
    const today = this.startOfDay(new Date());
    const dueDate = this.addDays(today, days);

    const items = await this.prismaService.maintenancePlan.findMany({
      where: {
        isActive: true,
        nextDueDate: {
          lte: dueDate,
        },
      },
      include: this.maintenancePlanInclude,
      orderBy: { nextDueDate: 'asc' },
    });

    await this.ensureDueNotifications(items);

    return {
      items,
      summary: {
        overdueCount: items.filter((item) => new Date(item.nextDueDate) < today).length,
        dueSoonCount: items.length,
        days,
      },
    };
  }

  async getDashboardSummary(currentUser: AuthUser) {
    this.ensureManager(currentUser);
    const today = this.startOfDay(new Date());
    const dueSoonDate = this.addDays(today, 7);

    const [overdueCount, dueSoonCount, activePlans, recordCount] = await Promise.all([
      this.prismaService.maintenancePlan.count({
        where: {
          isActive: true,
          nextDueDate: {
            lt: today,
          },
        },
      }),
      this.prismaService.maintenancePlan.count({
        where: {
          isActive: true,
          nextDueDate: {
            gte: today,
            lte: dueSoonDate,
          },
        },
      }),
      this.prismaService.maintenancePlan.count({
        where: { isActive: true },
      }),
      this.prismaService.maintenanceRecord.count(),
    ]);

    return {
      overdueCount,
      dueSoonCount,
      activePlans,
      totalRecords: recordCount,
    };
  }

  async createRecord(currentUser: AuthUser, dto: CreateMaintenanceRecordDto) {
    this.ensureManager(currentUser);
    const asset = await this.ensureAssetExists(dto.assetId);
    let plan = null;

    if (dto.planId) {
      plan = await this.ensurePlanExists(dto.planId);
      if (plan.assetId !== dto.assetId) {
        throw new BadRequestException('Ke hoach bao tri khong thuoc tai san da chon.');
      }
    }

    const maintenanceCode = await this.generateMaintenanceCode();
    const assetStatus = this.resolveAssetStatus(dto.resultStatus, dto.assetStatus);
    const nextDueDate = plan
      ? dto.nextMaintenanceDate
        ? new Date(dto.nextMaintenanceDate)
        : this.addMonths(new Date(dto.maintenanceDate), plan.cycleMonths)
      : null;

    return this.prismaService.$transaction(async (tx) => {
      const created = await tx.maintenanceRecord.create({
        data: {
          maintenanceCode,
          planId: dto.planId,
          assetId: dto.assetId,
          performedBy: currentUser.userId,
          maintenanceDate: new Date(dto.maintenanceDate),
          maintenanceType: dto.maintenanceType ?? MaintenanceType.SCHEDULED,
          content: dto.content.trim(),
          resultStatus: dto.resultStatus,
          nextMaintenanceDate: dto.nextMaintenanceDate ? new Date(dto.nextMaintenanceDate) : null,
          cost: dto.cost,
          materialNote: dto.materialNote?.trim() || null,
          note: dto.note?.trim() || null,
        },
        include: this.maintenanceRecordInclude,
      });

      await tx.asset.update({
        where: { id: dto.assetId },
        data: {
          status: assetStatus,
        },
      });

      if (plan && nextDueDate) {
        await tx.maintenancePlan.update({
          where: { id: plan.id },
          data: {
            nextDueDate,
            isActive: true,
          },
        });
      }

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'create',
        tableName: 'maintenance_records',
        recordId: created.id,
        newValue: this.stringifyPayload({
          maintenanceCode: created.maintenanceCode,
          assetId: created.assetId,
          planId: created.planId,
          maintenanceType: created.maintenanceType,
          resultStatus: created.resultStatus,
          assetStatus,
        }),
      });

      return created;
    });
  }

  async findRecords(currentUser: AuthUser, query: QueryMaintenanceRecordsDto) {
    this.ensureManager(currentUser);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where: Prisma.MaintenanceRecordWhereInput = {};

    if (query.assetId) where.assetId = query.assetId;
    if (query.planId) where.planId = query.planId;
    if (query.maintenanceType) where.maintenanceType = query.maintenanceType;
    if (query.resultStatus) where.resultStatus = query.resultStatus;
    if (query.keyword?.trim()) {
      const keyword = query.keyword.trim();
      where.OR = [
        { maintenanceCode: { contains: keyword, mode: 'insensitive' } },
        { content: { contains: keyword, mode: 'insensitive' } },
        { asset: { assetCode: { contains: keyword, mode: 'insensitive' } } },
        { asset: { assetName: { contains: keyword, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prismaService.maintenanceRecord.findMany({
        where,
        include: this.maintenanceRecordInclude,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { maintenanceDate: 'desc' },
      }),
      this.prismaService.maintenanceRecord.count({ where }),
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

  async findRecord(currentUser: AuthUser, id: number) {
    this.ensureManager(currentUser);
    const record = await this.prismaService.maintenanceRecord.findUnique({
      where: { id },
      include: this.maintenanceRecordInclude,
    });
    if (!record) {
      throw new NotFoundException('Khong tim thay phieu bao tri.');
    }
    return record;
  }

  async exportRecord(currentUser: AuthUser, id: number) {
    const record = await this.findRecord(currentUser, id);
    return {
      ...record,
      printable: {
        title: 'Phieu bao tri tai san',
        generatedAt: new Date().toISOString(),
        assetLabel: `${record.asset.assetName} (${record.asset.assetCode})`,
        performedByLabel: `${record.performedByUser.fullName} (${record.performedByUser.userCode})`,
      },
    };
  }

  async findAssetHistory(currentUser: AuthUser, assetId: number) {
    this.ensureManager(currentUser);
    await this.ensureAssetExists(assetId);
    return this.prismaService.maintenanceRecord.findMany({
      where: { assetId },
      include: this.maintenanceRecordInclude,
      orderBy: { maintenanceDate: 'desc' },
    });
  }

  async createDamageReportFromRecord(
    currentUser: AuthUser,
    recordId: number,
    dto: CreateDamageReportFromMaintenanceDto,
  ) {
    this.ensureManager(currentUser);
    const record = await this.ensureRecordExists(recordId);
    if (record.resultStatus !== MaintenanceResultStatus.NEED_REPAIR) {
      throw new ConflictException(
        'Chi duoc tao phieu bao hong khi ket qua bao tri la NEED_REPAIR.',
      );
    }

    if (!record.asset.roomId) {
      throw new BadRequestException('Tai san hien khong gan voi phong hop le.');
    }

    const reportCode = await this.generateDamageReportCode();

    return this.prismaService.$transaction(async (tx) => {
      const created = await tx.damageReport.create({
        data: {
          reportCode,
          reporterId: currentUser.userId,
          assetId: record.assetId,
          roomId: record.asset.roomId!,
          description: dto.description.trim(),
          status: DamageReportStatus.SUBMITTED,
        },
      });

      await tx.damageReportLog.create({
        data: {
          reportId: created.id,
          action: 'create',
          newStatus: DamageReportStatus.SUBMITTED,
          note: `Tao tu phieu bao tri ${record.maintenanceCode}.`,
          createdBy: currentUser.userId,
        },
      });

      await tx.asset.update({
        where: { id: record.assetId },
        data: {
          status: AssetStatus.DAMAGED,
        },
      });

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'create_damage_report',
        tableName: 'maintenance_records',
        recordId,
        newValue: this.stringifyPayload({
          damageReportId: created.id,
          assetId: record.assetId,
        }),
      });

      return created;
    });
  }

  async createLiquidationFromRecord(
    currentUser: AuthUser,
    recordId: number,
    dto: CreateLiquidationRecordFromMaintenanceDto,
  ) {
    this.ensureManager(currentUser);
    const record = await this.ensureRecordExists(recordId);
    if (record.resultStatus !== MaintenanceResultStatus.RECOMMEND_LIQUIDATION) {
      throw new ConflictException(
        'Chi duoc tao bien ban thanh ly khi ket qua bao tri la RECOMMEND_LIQUIDATION.',
      );
    }

    const liquidationCode = await this.generateLiquidationCode();

    return this.prismaService.$transaction(async (tx) => {
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
                assetId: record.assetId,
                assetCondition: dto.assetCondition.trim(),
                reason: dto.reason.trim(),
                estimatedRemainingValue: dto.estimatedRemainingValue,
              },
            ],
          },
        },
        include: {
          liquidationItems: {
            include: {
              asset: {
                include: {
                  category: true,
                },
              },
            },
          },
          createdByUser: {
            include: {
              role: true,
            },
          },
        },
      });

      await tx.asset.update({
        where: { id: record.assetId },
        data: {
          status: AssetStatus.PENDING_LIQUIDATION,
        },
      });

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'create_liquidation_record',
        tableName: 'maintenance_records',
        recordId,
        newValue: this.stringifyPayload({
          liquidationRecordId: created.id,
          assetId: record.assetId,
        }),
      });

      return created;
    });
  }

  private get maintenancePlanInclude() {
    return {
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
      createdByUser: {
        include: {
          role: true,
        },
      },
      maintenanceRecords: {
        include: {
          performedByUser: {
            include: {
              role: true,
            },
          },
        },
        orderBy: {
          maintenanceDate: 'desc',
        },
      },
    } satisfies Prisma.MaintenancePlanInclude;
  }

  private get maintenanceRecordInclude() {
    return {
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
      plan: {
        include: {
          asset: true,
        },
      },
      performedByUser: {
        include: {
          role: true,
        },
      },
    } satisfies Prisma.MaintenanceRecordInclude;
  }

  private ensureManager(currentUser: AuthUser) {
    if (!['ADMIN', 'QL_CSVC'].includes(currentUser.role)) {
      throw new ForbiddenException('Ban khong co quyen thuc hien thao tac nay.');
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
    if (!asset) throw new NotFoundException('Khong tim thay tai san.');
    return asset;
  }

  private async ensureNoActivePlan(assetId: number, excludeId?: number) {
    const existing = await this.prismaService.maintenancePlan.findFirst({
      where: {
        assetId,
        isActive: true,
        id: excludeId ? { not: excludeId } : undefined,
      },
    });
    if (existing) {
      throw new ConflictException('Tai san nay da co ke hoach bao tri dang hoat dong.');
    }
  }

  private async ensurePlanExists(id: number) {
    const plan = await this.prismaService.maintenancePlan.findUnique({
      where: { id },
      include: this.maintenancePlanInclude,
    });
    if (!plan) throw new NotFoundException('Khong tim thay ke hoach bao tri.');
    return plan;
  }

  private async ensureRecordExists(id: number) {
    const record = await this.prismaService.maintenanceRecord.findUnique({
      where: { id },
      include: this.maintenanceRecordInclude,
    });
    if (!record) throw new NotFoundException('Khong tim thay phieu bao tri.');
    return record;
  }

  private resolveAssetStatus(
    resultStatus: MaintenanceResultStatus,
    requestedStatus?: AssetStatus,
  ) {
    if (requestedStatus) {
      return requestedStatus;
    }

    switch (resultStatus) {
      case MaintenanceResultStatus.GOOD:
      case MaintenanceResultStatus.NEED_MONITORING:
        return AssetStatus.AVAILABLE;
      case MaintenanceResultStatus.NEED_REPAIR:
        return AssetStatus.UNDER_MAINTENANCE;
      case MaintenanceResultStatus.RECOMMEND_LIQUIDATION:
        return AssetStatus.PENDING_LIQUIDATION;
    }
  }

  private async ensureDueNotifications(
    plans: Array<{
      id: number;
      asset: { assetName: string; assetCode: string };
      nextDueDate: Date;
    }>,
  ) {
    if (plans.length === 0) return;

    const managers = await this.prismaService.user.findMany({
      where: {
        role: {
          code: {
            in: ['ADMIN', 'QL_CSVC'],
          },
        },
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    await this.prismaService.$transaction(async (tx) => {
      for (const plan of plans) {
        for (const manager of managers) {
          const existed = await tx.notification.findFirst({
            where: {
              userId: manager.id,
              relatedTable: 'maintenance_plans',
              relatedId: plan.id,
              status: NotificationStatus.UNREAD,
            },
          });

          if (!existed) {
            await tx.notification.create({
              data: {
                userId: manager.id,
                title: 'Tai san den han bao tri',
                content: `${plan.asset.assetName} (${plan.asset.assetCode}) da den han bao tri vao ${plan.nextDueDate.toISOString().slice(0, 10)}.`,
                status: NotificationStatus.UNREAD,
                relatedTable: 'maintenance_plans',
                relatedId: plan.id,
              },
            });
          }
        }
      }
    });
  }

  private async createAuditLog(
    tx: Prisma.TransactionClient,
    input: {
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
        userId: input.userId,
        action: input.action,
        tableName: input.tableName,
        recordId: input.recordId,
        oldValue: input.oldValue ?? null,
        newValue: input.newValue ?? null,
      },
    });
  }

  private async generateMaintenanceCode() {
    return `QL_BM7_${Date.now()}`;
  }

  private async generateDamageReportCode() {
    return `QL_BM4_${Date.now()}`;
  }

  private async generateLiquidationCode() {
    return `QL_BM5_${Date.now()}`;
  }

  private addMonths(date: Date, months: number) {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private stringifyPayload(value: Record<string, unknown>) {
    return JSON.stringify(value);
  }
}
