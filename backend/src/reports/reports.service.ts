import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: number, role: string) {
    if (role === 'ADMIN') {
      const [totalUsers, totalStudents, totalManagers, totalAssets, totalDamageReports] =
        await Promise.all([
          this.prisma.user.count(),
          this.prisma.user.count({ where: { role: { code: 'STUDENT' } } }),
          this.prisma.user.count({ where: { role: { code: 'MANAGER' } } }),
          this.prisma.asset.count(),
          this.prisma.damageReport.count(),
        ]);

      return {
        role: 'ADMIN',
        totalUsers,
        totalStudents,
        totalManagers,
        totalAssets,
        totalDamageReports,
      };
    }

    if (role === 'MANAGER') {
      const [totalBuildings, totalRooms, totalAssets, damagedAssets, maintenanceProcessing, liquidationPending, pendingDamageReports] =
        await Promise.all([
          this.prisma.dormBuilding.count(),
          this.prisma.room.count(),
          this.prisma.asset.count(),
          this.prisma.asset.count({ where: { status: 'DAMAGED' } }),
          this.prisma.asset.count({ where: { status: 'UNDER_MAINTENANCE' } }),
          this.prisma.asset.count({ where: { status: 'PENDING_LIQUIDATION' } }),
          this.prisma.damageReport.count({
            where: { status: { in: ['SUBMITTED', 'REVIEWING', 'IN_PROGRESS', 'APPROVED'] } },
          }),
        ]);

      return {
        role: 'MANAGER',
        totalBuildings,
        totalRooms,
        totalAssets,
        damagedAssets,
        maintenanceProcessing,
        liquidationPending,
        pendingDamageReports,
      };
    }

    if (role === 'STUDENT') {
      const assignment = await this.prisma.roomStudentAssignment.findFirst({
        where: { studentId: userId, isActive: true },
        include: {
          room: {
            include: { floor: { include: { building: true } } },
          },
        },
      });

      const roomId = assignment?.roomId;
      const [assetCount, damageReportProcessing] = await Promise.all([
        roomId ? this.prisma.asset.count({ where: { roomId } }) : Promise.resolve(0),
        this.prisma.damageReport.count({
          where: {
            reporterId: userId,
            status: { in: ['SUBMITTED', 'REVIEWING', 'IN_PROGRESS', 'APPROVED'] },
          },
        }),
      ]);

      return {
        role: 'STUDENT',
        currentRoom: assignment
          ? {
              assignmentId: String(assignment.id),
              roomId: String(assignment.room.id),
              roomCode: assignment.room.roomCode,
              floorNumber: assignment.room.floor?.floorNumber ?? null,
              buildingId: String(assignment.room.floor?.building?.id ?? ''),
              buildingName: assignment.room.floor?.building?.name ?? '',
              bedId: '1',
            }
          : null,
        assetCount,
        damageReportProcessing,
      };
    }

    return { role, message: 'Unknown role' };
  }

  async getDamageByMonth() {
    const reports = await this.prisma.damageReport.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const monthMap = new Map<string, number>();
    reports.forEach((r) => {
      const key = `${String(r.createdAt.getMonth() + 1).padStart(2, '0')}/${r.createdAt.getFullYear()}`;
      monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
    });

    return Array.from(monthMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => {
        const [mA, yA] = a.month.split('/');
        const [mB, yB] = b.month.split('/');
        return parseInt(yA) - parseInt(yB) || parseInt(mA) - parseInt(mB);
      });
  }
}
