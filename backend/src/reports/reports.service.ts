import { Injectable } from '@nestjs/common';
import {
  AssetStatus,
  DamageReportStatus,
  ApprovalStatus,
  Prisma,
  UserStatus,
} from '@prisma/client';
import { AuthUser } from '../auth/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { QueryReportsDto } from './dto/query-reports.dto';

type DateRange = {
  gte?: Date;
  lte?: Date;
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(_currentUser: AuthUser, query: QueryReportsDto) {
    const today = this.endOfDay(new Date());
    const roomWhere = this.buildRoomWhere(query);
    const assetRoomScope = this.buildAssetRoomScope(query);
    const assetWhere = this.buildAssetWhere(query);
    const damageWhere = this.buildDamageWhere(query);

    const maintenanceDueDateWhere =
      query.fromDate || query.toDate
        ? this.buildDateRange(query.fromDate, query.toDate)
        : { lte: today };

    const [totalAssets, assetsByStatus, totalRooms, totalStudents, pendingDamageReports, maintenanceDueCount, liquidatedAssetsCount] =
      await Promise.all([
        this.prisma.asset.count({ where: assetWhere }),
        this.prisma.asset.groupBy({
          by: ['status'],
          where: assetWhere,
          _count: { _all: true },
        }),
        this.prisma.room.count({ where: roomWhere }),
        this.countStudents(query),
        this.prisma.damageReport.count({
          where: {
            ...damageWhere,
            status: {
              in: [DamageReportStatus.SUBMITTED, DamageReportStatus.REVIEWING, DamageReportStatus.IN_PROGRESS],
            },
          },
        }),
        this.prisma.maintenancePlan.count({
          where: {
            isActive: true,
            nextDueDate: maintenanceDueDateWhere,
            asset: assetRoomScope,
          },
        }),
        this.prisma.asset.count({
          where: {
            ...assetWhere,
            status: AssetStatus.LIQUIDATED,
          },
        }),
      ]);

    return {
      totalAssets,
      assetsByStatus: assetsByStatus.map((item) => ({
        status: item.status,
        count: item._count._all,
      })),
      totalRooms,
      totalStudents,
      pendingDamageReports,
      maintenanceDueCount,
      liquidatedAssetsCount,
    };
  }

  async getAssetsByRoom(_currentUser: AuthUser, query: QueryReportsDto) {
    const assets = await this.prisma.asset.findMany({
      where: this.buildAssetWhere(query),
      select: {
        id: true,
        roomId: true,
        room: {
          select: {
            id: true,
            roomCode: true,
            floor: {
              select: {
                floorNumber: true,
                building: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const roomMap = new Map<
      string,
      {
        roomId: number | null;
        roomCode: string;
        blockName: string;
        floorNumber: number | null;
        totalAssets: number;
      }
    >();

    for (const asset of assets) {
      const key = asset.roomId ? String(asset.roomId) : 'unassigned';

      const current = roomMap.get(key);

      if (current) {
        current.totalAssets += 1;
        continue;
      }

      roomMap.set(key, {
        roomId: asset.roomId ?? null,
        roomCode: asset.room?.roomCode ?? 'CHUA_GAN_PHONG',
        blockName: asset.room?.floor.building.name ?? 'Chua gan khu',
        floorNumber: asset.room?.floor.floorNumber ?? null,
        totalAssets: 1,
      });
    }

    return Array.from(roomMap.values()).sort((left, right) => right.totalAssets - left.totalAssets);
  }

  async getAssetsByCategory(_currentUser: AuthUser, query: QueryReportsDto) {
    const assets = await this.prisma.asset.findMany({
      where: this.buildAssetWhere(query),
      select: {
        id: true,
        categoryId: true,
        category: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    const categoryMap = new Map<
      number,
      {
        categoryId: number;
        categoryCode: string;
        categoryName: string;
        totalAssets: number;
      }
    >();

    for (const asset of assets) {
      const current = categoryMap.get(asset.categoryId);

      if (current) {
        current.totalAssets += 1;
        continue;
      }

      categoryMap.set(asset.categoryId, {
        categoryId: asset.categoryId,
        categoryCode: asset.category.code,
        categoryName: asset.category.name,
        totalAssets: 1,
      });
    }

    return Array.from(categoryMap.values()).sort((left, right) => right.totalAssets - left.totalAssets);
  }

  async getDamageReportsByStatus(_currentUser: AuthUser, query: QueryReportsDto) {
    const groups = await this.prisma.damageReport.groupBy({
      by: ['status'],
      where: this.buildDamageWhere(query),
      _count: {
        _all: true,
      },
    });

    return groups.map((item) => ({
      status: item.status,
      count: item._count._all,
    }));
  }

  async getDamageReportsByMonth(_currentUser: AuthUser, query: QueryReportsDto) {
    const reports = await this.prisma.damageReport.findMany({
      where: this.buildDamageWhere(query),
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return this.aggregateByMonth(reports, 'createdAt');
  }

  async getMaintenanceByMonth(_currentUser: AuthUser, query: QueryReportsDto) {
    const records = await this.prisma.maintenanceRecord.findMany({
      where: this.buildMaintenanceRecordWhere(query),
      select: {
        maintenanceDate: true,
      },
      orderBy: {
        maintenanceDate: 'asc',
      },
    });

    return this.aggregateByMonth(records, 'maintenanceDate');
  }

  async getLiquidationByMonth(_currentUser: AuthUser, query: QueryReportsDto) {
    const records = await this.prisma.liquidationRecord.findMany({
      where: {
        ...this.buildLiquidationWhere(query),
        status: ApprovalStatus.COMPLETED,
      },
      select: {
        liquidationDate: true,
      },
      orderBy: {
        liquidationDate: 'asc',
      },
    });

    return this.aggregateByMonth(records, 'liquidationDate');
  }

  private async countStudents(query: QueryReportsDto) {
    if (query.roomId || query.buildingId) {
      const result = await this.prisma.roomStudent.findMany({
        where: {
          isActive: true,
          room: this.buildRoomWhere(query),
          student: {
            status: UserStatus.ACTIVE,
            role: {
              code: 'STUDENT',
            },
          },
        },
        select: {
          studentId: true,
        },
        distinct: ['studentId'],
      });

      return result.length;
    }

    return this.prisma.user.count({
      where: {
        status: UserStatus.ACTIVE,
        role: {
          code: 'STUDENT',
        },
      },
    });
  }

  private buildRoomWhere(query: QueryReportsDto): Prisma.RoomWhereInput {
    return {
      ...(query.roomId ? { id: query.roomId } : {}),
      ...(query.buildingId
        ? {
            floor: {
              buildingId: query.buildingId,
            },
          }
        : {}),
    };
  }

  private buildAssetRoomScope(query: QueryReportsDto): Prisma.AssetWhereInput {
    return {
      ...(query.roomId ? { roomId: query.roomId } : {}),
      ...(query.buildingId
        ? {
            room: {
              floor: {
                buildingId: query.buildingId,
              },
            },
          }
        : {}),
    };
  }

  private buildAssetWhere(query: QueryReportsDto): Prisma.AssetWhereInput {
    return {
      ...this.buildAssetRoomScope(query),
      ...this.wrapDateFilter('createdAt', this.buildDateRange(query.fromDate, query.toDate)),
    };
  }

  private buildDamageWhere(query: QueryReportsDto): Prisma.DamageReportWhereInput {
    return {
      ...this.wrapDateFilter('createdAt', this.buildDateRange(query.fromDate, query.toDate)),
      ...(query.roomId ? { roomId: query.roomId } : {}),
      ...(query.buildingId
        ? {
            room: {
              floor: {
                buildingId: query.buildingId,
              },
            },
          }
        : {}),
    };
  }

  private buildMaintenanceRecordWhere(query: QueryReportsDto): Prisma.MaintenanceRecordWhereInput {
    return {
      ...this.wrapDateFilter('maintenanceDate', this.buildDateRange(query.fromDate, query.toDate)),
      ...(query.roomId || query.buildingId
        ? {
            asset: this.buildAssetRoomScope(query),
          }
        : {}),
    };
  }

  private buildLiquidationWhere(query: QueryReportsDto): Prisma.LiquidationRecordWhereInput {
    return {
      ...this.wrapDateFilter('liquidationDate', this.buildDateRange(query.fromDate, query.toDate)),
      ...(query.roomId || query.buildingId
        ? {
            liquidationItems: { some: { asset: this.buildAssetRoomScope(query) } },
          }
        : {}),
    };
  }

  private buildDateRange(fromDate?: string, toDate?: string): DateRange | undefined {
    if (!fromDate && !toDate) {
      return undefined;
    }

    const range: DateRange = {};

    if (fromDate) {
      range.gte = this.startOfDay(new Date(fromDate));
    }

    if (toDate) {
      range.lte = this.endOfDay(new Date(toDate));
    }

    return range;
  }

  private wrapDateFilter<TField extends string>(
    field: TField,
    range?: DateRange,
  ): Record<TField, DateRange> | Record<string, never> {
    if (!range || (!range.gte && !range.lte)) {
      return {};
    }

    return {
      [field]: range,
    } as Record<TField, DateRange>;
  }

  private aggregateByMonth<TItem extends Record<string, Date>>(items: TItem[], field: keyof TItem) {
    const monthMap = new Map<string, number>();

    for (const item of items) {
      const month = this.toMonthKey(item[field]);
      monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
    }

    return Array.from(monthMap.entries()).map(([month, count]) => ({
      month,
      count,
    }));
  }

  private toMonthKey(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private startOfDay(value: Date) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private endOfDay(value: Date) {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date;
  }
}
