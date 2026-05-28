import {
  AssetStatus,
  DamageReportStatus,
  ApprovalStatus,
  MaintenanceType,
  NotificationStatus,
  Prisma,
  UserStatus,
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
import { CompleteInventoryCheckDto } from './dto/complete-inventory-check.dto';
import { CreateDamageReportFromItemDto } from './dto/create-damage-report-from-item.dto';
import { CreateInventoryCheckDto } from './dto/create-inventory-check.dto';
import { CreateMaintenancePlanFromItemDto } from './dto/create-maintenance-plan-from-item.dto';
import { CreateMaintenanceRecordFromItemDto } from './dto/create-maintenance-record-from-item.dto';
import { QueryInventoryChecksDto } from './dto/query-inventory-checks.dto';
import { UpdateInventoryCheckResultsDto } from './dto/update-inventory-check-results.dto';
import { UpdateCouncilDto } from './dto/update-council.dto';

@Injectable()
export class InventoryChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async createFromRoom(currentUser: AuthUser, dto: CreateInventoryCheckDto) {
    this.ensureManager(currentUser);

    const room = await this.ensureRoomExists(dto.roomId);
    const assets = await this.prismaService.asset.findMany({
      where: {
        roomId: dto.roomId,
        status: {
          not: AssetStatus.LIQUIDATED,
        },
      },
      orderBy: {
        assetCode: 'asc',
      },
    });

    if (assets.length === 0) {
      throw new BadRequestException('Phòng hiện không có tài sản nào để lập phiếu kiểm kê.');
    }

    const inventoryCode = await this.generateInventoryCode();

    return this.prismaService.$transaction(async (tx) => {
      const created = await tx.inventoryCheck.create({
        data: {
          inventoryCode,
          roomId: dto.roomId,
          checkedBy: currentUser.userId,
          checkDate: new Date(dto.checkDate),
          status: ApprovalStatus.DRAFT,
          generalNote: dto.generalNote?.trim() || null,
          inventoryCheckItems: {
            create: assets.map((asset) => ({
              assetId: asset.id,
              systemQuantity: 1,
              actualQuantity: 1,
              difference: 0,
              actualCondition: 'Chưa cập nhật',
              note: null,
            })),
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
        include: this.inventoryCheckDetailInclude,
      });

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'create',
        recordId: created.id,
        newValue: this.stringifyPayload({
          inventoryCode,
          roomId: room.id,
          checkedBy: currentUser.userId,
          status: created.status,
          itemCount: created.inventoryCheckItems.length,
        }),
      });

      return created;
    }, { timeout: 15000 });
  }

  async findAll(currentUser: AuthUser, query: QueryInventoryChecksDto) {
    this.ensureManager(currentUser);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where: Prisma.InventoryCheckWhereInput = {};

    if (query.roomId) {
      where.roomId = query.roomId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.keyword?.trim()) {
      const keyword = query.keyword.trim();
      where.OR = [
        {
          inventoryCode: {
            contains: keyword,
            mode: 'insensitive',
          },
        },
        {
          generalNote: {
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
      ];
    }

    const [items, total] = await Promise.all([
      this.prismaService.inventoryCheck.findMany({
        where,
        include: this.inventoryCheckListInclude,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prismaService.inventoryCheck.count({ where }),
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

    const inventoryCheck = await this.prismaService.inventoryCheck.findUnique({
      where: { id },
      include: this.inventoryCheckDetailInclude,
    });

    if (!inventoryCheck) {
      throw new NotFoundException('Không tìm thấy phiếu kiểm kê.');
    }

    return inventoryCheck;
  }

  async updateResults(
    currentUser: AuthUser,
    id: number,
    dto: UpdateInventoryCheckResultsDto,
  ) {
    this.ensureManager(currentUser);

    const inventoryCheck = await this.ensureInventoryCheckExists(id);
    this.ensureDraft(inventoryCheck.status);

    const currentItems = await this.prismaService.inventoryCheckItem.findMany({
      where: { inventoryCheckId: id },
    });

    const currentItemMap = new Map(currentItems.map((item) => [item.id, item]));

    for (const item of dto.items) {
      if (!currentItemMap.has(item.itemId)) {
        throw new BadRequestException('Có item kiểm kê không thuộc phiếu hiện tại.');
      }
    }

    return this.prismaService.$transaction(async (tx) => {
      for (const item of dto.items) {
        const existing = currentItemMap.get(item.itemId)!;
        const difference = item.actualQuantity - existing.systemQuantity;

        await tx.inventoryCheckItem.update({
          where: { id: item.itemId },
          data: {
            actualQuantity: item.actualQuantity,
            difference,
            actualCondition: item.actualCondition?.trim() || null,
            note: item.note?.trim() || null,
          },
        });
      }

      const updated = await tx.inventoryCheck.update({
        where: { id },
        data: {
          generalNote: dto.generalNote === undefined ? undefined : dto.generalNote?.trim() || null,
        },
        include: this.inventoryCheckDetailInclude,
      });

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'update_results',
        recordId: id,
        oldValue: this.stringifyPayload({
          status: inventoryCheck.status,
          itemCount: currentItems.length,
        }),
        newValue: this.stringifyPayload({
          status: updated.status,
          updatedItemIds: dto.items.map((item) => item.itemId),
        }),
      });

      return updated;
    });
  }

  async complete(currentUser: AuthUser, id: number, dto: CompleteInventoryCheckDto) {
    this.ensureManager(currentUser);

    const inventoryCheck = await this.ensureInventoryCheckExists(id);
    this.ensureDraft(inventoryCheck.status);

    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.inventoryCheck.update({
        where: { id },
        data: {
          status: ApprovalStatus.COMPLETED,
          completedAt: new Date(),
          generalNote: dto.generalNote === undefined ? undefined : dto.generalNote?.trim() || null,
        },
        include: this.inventoryCheckDetailInclude,
      });

      const hasAbnormalItems = updated.inventoryCheckItems.some((item) => {
        const condition = item.actualCondition?.toLowerCase() ?? '';
        return (
          item.difference !== 0 ||
          condition.includes('hong') ||
          condition.includes('xau') ||
          condition.includes('bat thuong') ||
          condition.includes('bao tri')
        );
      });

      if (hasAbnormalItems) {
        // Update asset statuses for abnormal items
        for (const item of updated.inventoryCheckItems) {
          let newStatus: AssetStatus | undefined;
          
          const condition = item.actualCondition?.toLowerCase() ?? '';
          if (item.difference < 0) {
            newStatus = AssetStatus.DAMAGED; // Marked as damaged/lost
          } else if (
            condition.includes('hong') ||
            condition.includes('xau') ||
            condition.includes('bat thuong') ||
            condition.includes('bao tri')
          ) {
            newStatus = AssetStatus.DAMAGED;
          }

          if (newStatus && item.asset.status !== newStatus) {
            await tx.asset.update({
              where: { id: item.assetId },
              data: { status: newStatus },
            });

            await tx.assetHistory.create({
              data: {
                assetId: item.assetId,
                action: 'Cập nhật từ kiểm kê',
                oldStatus: item.asset.status,
                newStatus: newStatus,
                oldRoomId: item.asset.roomId,
                newRoomId: item.asset.roomId,
                note: `Phiếu ${updated.inventoryCode}. Chênh lệch: ${item.difference}. Tình trạng: ${item.actualCondition || '--'}`,
              },
            });
          }
        }

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
              title: 'Kiem ke phat hien bat thuong',
              content: `Phieu ${updated.inventoryCode} có tài sản chênh lệch hoac tình trạng xấu, tài sản đã được chuyển sang trạng thái DAMAGED.`,
              status: NotificationStatus.UNREAD,
              relatedTable: 'inventory_checks',
              relatedId: updated.id,
            })),
          });
        }
      }

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'complete',
        recordId: id,
        oldValue: this.stringifyPayload({
          status: inventoryCheck.status,
          completedAt: inventoryCheck.completedAt,
        }),
        newValue: this.stringifyPayload({
          status: updated.status,
          completedAt: updated.completedAt,
        }),
      });

      return updated;
    });
  }

  async createDamageReportFromItem(
    currentUser: AuthUser,
    inventoryCheckId: number,
    itemId: number,
    dto: CreateDamageReportFromItemDto,
  ) {
    this.ensureManager(currentUser);

    const item = await this.ensureInventoryItemExists(inventoryCheckId, itemId);
    const reportCode = await this.generateDamageReportCode();

    return this.prismaService.$transaction(async (tx) => {
      const createdReport = await tx.damageReport.create({
        data: {
          reportCode,
          reporterId: currentUser.userId,
          assetId: item.assetId,
          roomId: item.inventoryCheck.roomId!,
          description: dto.description.trim(),
          status: DamageReportStatus.SUBMITTED,
        },
        include: {
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
          room: true,
        },
      });

      await tx.damageReportLog.create({
        data: {
          reportId: createdReport.id,
          action: 'create',
          newStatus: DamageReportStatus.SUBMITTED,
          note: `Tạo từ phiếu kiểm kê ${item.inventoryCheck.inventoryCode}.`,
          createdBy: currentUser.userId,
        },
      });

      await tx.asset.update({
        where: { id: item.assetId },
        data: {
          status: AssetStatus.DAMAGED,
        },
      });

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'create_damage_report',
        recordId: inventoryCheckId,
        newValue: this.stringifyPayload({
          inventoryCheckItemId: itemId,
          damageReportId: createdReport.id,
          assetId: item.assetId,
        }),
      });

      await tx.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'create',
          tableName: 'damage_reports',
          recordId: createdReport.id,
          newValue: this.stringifyPayload({
            reportCode: createdReport.reportCode,
            assetId: createdReport.assetId,
            roomId: createdReport.roomId,
            status: createdReport.status,
          }),
        },
      });

      return createdReport;
    });
  }

  async createMaintenanceRecordFromItem(
    currentUser: AuthUser,
    inventoryCheckId: number,
    itemId: number,
    dto: CreateMaintenanceRecordFromItemDto,
  ) {
    this.ensureManager(currentUser);

    const item = await this.ensureInventoryItemExists(inventoryCheckId, itemId);
    const maintenanceCode = await this.generateMaintenanceCode();

    return this.prismaService.$transaction(async (tx) => {
      const createdRecord = await tx.maintenanceRecord.create({
        data: {
          maintenanceCode,
          assetId: item.assetId,
          performedBy: currentUser.userId,
          maintenanceDate: new Date(dto.maintenanceDate),
          maintenanceType: dto.maintenanceType ?? MaintenanceType.AFTER_INVENTORY,
          content: dto.content.trim(),
          resultStatus: dto.resultStatus,
          nextMaintenanceDate: dto.nextMaintenanceDate
            ? new Date(dto.nextMaintenanceDate)
            : null,
          cost: dto.cost,
          materialNote: dto.materialNote?.trim() || null,
          note: dto.note?.trim() || null,
        },
        include: {
          asset: {
            include: {
              category: true,
            },
          },
          performedByUser: {
            include: {
              role: true,
            },
          },
        },
      });

      await tx.asset.update({
        where: { id: item.assetId },
        data: {
          status: AssetStatus.UNDER_MAINTENANCE,
        },
      });

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'create_maintenance_record',
        recordId: inventoryCheckId,
        newValue: this.stringifyPayload({
          inventoryCheckItemId: itemId,
          maintenanceRecordId: createdRecord.id,
          assetId: item.assetId,
        }),
      });

      await tx.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'create',
          tableName: 'maintenance_records',
          recordId: createdRecord.id,
          newValue: this.stringifyPayload({
            maintenanceCode: createdRecord.maintenanceCode,
            assetId: createdRecord.assetId,
            maintenanceType: createdRecord.maintenanceType,
            resultStatus: createdRecord.resultStatus,
          }),
        },
      });

      return createdRecord;
    });
  }

  async updateCouncil(currentUser: AuthUser, id: number, dto: UpdateCouncilDto) {
    this.ensureManager(currentUser);
    const inventoryCheck = await this.ensureInventoryCheckExists(id);
    this.ensureDraft(inventoryCheck.status);

    return this.prismaService.$transaction(async (tx) => {
      // 1. Delete existing council members
      await tx.inventoryCouncilMember.deleteMany({
        where: { inventoryCheckId: id },
      });

      // 2. Create new council members
      if (dto.members && dto.members.length > 0) {
        await tx.inventoryCouncilMember.createMany({
          data: dto.members.map((member: any) => ({
            inventoryCheckId: id,
            userId: member.userId,
            roleInCouncil: member.roleInCouncil.trim(),
          })),
        });
      }

      // 3. Return updated record
      return tx.inventoryCheck.findUnique({
        where: { id },
        include: this.inventoryCheckDetailInclude,
      });
    });
  }

  async createMaintenancePlanFromItem(
    currentUser: AuthUser,
    inventoryCheckId: number,
    itemId: number,
    dto: CreateMaintenancePlanFromItemDto,
  ) {
    this.ensureManager(currentUser);

    const item = await this.ensureInventoryItemExists(inventoryCheckId, itemId);
    const existingPlan = await this.prismaService.maintenancePlan.findFirst({
      where: {
        assetId: item.assetId,
        isActive: true,
      },
    });

    if (existingPlan) {
      throw new ConflictException('Tài sản nay đã có kế hoạch bảo trì đang hoạt động.');
    }

    return this.prismaService.$transaction(async (tx) => {
      const createdPlan = await tx.maintenancePlan.create({
        data: {
          assetId: item.assetId,
          createdBy: currentUser.userId,
          cycleMonths: dto.cycleMonths,
          nextDueDate: new Date(dto.nextDueDate),
          note: dto.note?.trim() || null,
          isActive: true,
        },
        include: {
          asset: {
            include: {
              category: true,
            },
          },
          createdByUser: {
            include: {
              role: true,
            },
          },
        },
      });

      await this.createAuditLog(tx, {
        userId: currentUser.userId,
        action: 'create_maintenance_plan',
        recordId: inventoryCheckId,
        newValue: this.stringifyPayload({
          inventoryCheckItemId: itemId,
          maintenancePlanId: createdPlan.id,
          assetId: item.assetId,
        }),
      });

      await tx.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'create',
          tableName: 'maintenance_plans',
          recordId: createdPlan.id,
          newValue: this.stringifyPayload({
            assetId: createdPlan.assetId,
            cycleMonths: createdPlan.cycleMonths,
            nextDueDate: createdPlan.nextDueDate,
            isActive: createdPlan.isActive,
          }),
        },
      });

      return createdPlan;
    });
  }

  async exportData(currentUser: AuthUser, id: number) {
    const inventoryCheck = await this.findOne(currentUser, id);

    return {
      ...inventoryCheck,
      printable: {
        title: 'Phiếu kiểm kê tài sản',
        generatedAt: new Date().toISOString(),
        roomLabel: inventoryCheck.room
          ? `${inventoryCheck.room.roomCode} - ${inventoryCheck.room.floor.building.name} / Tầng ${inventoryCheck.room.floor.floorNumber}`
          : 'Khong xac dinh',
        checkedByLabel: `${inventoryCheck.checkedByUser.fullName} (${inventoryCheck.checkedByUser.userCode})`,
      },
    };
  }

  private get inventoryCheckListInclude() {
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
      checkedByUser: {
        include: {
          role: true,
        },
      },
      inventoryCheckItems: {
        include: {
          asset: true,
        },
      },
    } satisfies Prisma.InventoryCheckInclude;
  }

  private get inventoryCheckDetailInclude() {
    return {
      ...this.inventoryCheckListInclude,
      inventoryCheckItems: {
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
        orderBy: {
          asset: {
            assetCode: 'asc',
          },
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
    } satisfies Prisma.InventoryCheckInclude;
  }

  private ensureManager(currentUser: AuthUser) {
    if (!['ADMIN', 'QL_CSVC'].includes(currentUser.role)) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này.');
    }
  }

  private ensureDraft(status: ApprovalStatus) {
    if (status !== ApprovalStatus.DRAFT) {
      throw new ConflictException('Chỉ được cập nhật phiếu khi đang ở trạng thái DRAFT.');
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

  private async ensureInventoryCheckExists(id: number) {
    const inventoryCheck = await this.prismaService.inventoryCheck.findUnique({
      where: { id },
    });

    if (!inventoryCheck) {
      throw new NotFoundException('Không tìm thấy phiếu kiểm kê.');
    }

    return inventoryCheck;
  }

  private async ensureInventoryItemExists(inventoryCheckId: number, itemId: number) {
    const item = await this.prismaService.inventoryCheckItem.findFirst({
      where: {
        id: itemId,
        inventoryCheckId,
      },
      include: {
        asset: true,
        inventoryCheck: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Không tìm thấy item kiểm kê.');
    }

    if (!item.inventoryCheck.roomId) {
      throw new BadRequestException('Phiếu kiểm kê hiện tại không gắn với phòng hợp lệ.');
    }

    return item;
  }

  private async generateInventoryCode() {
    return `QL_BM3_${Date.now()}`;
  }

  private async generateDamageReportCode() {
    return `QL_BM4_${Date.now()}`;
  }

  private async generateMaintenanceCode() {
    return `QL_BM7_${Date.now()}`;
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
        tableName: 'inventory_checks',
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
