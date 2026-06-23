import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBuildings() {
    const buildings = await this.prisma.dormBuilding.findMany({
      include: {
        floors: {
          include: {
            rooms: {
              include: {
                roomStudentAssignments: {
                  where: { isActive: true },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return buildings.map((b) => ({
      id: String(b.id),
      code: b.code,
      name: b.name,
      genderZone: null as string | null,
      status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
      description: b.name,
      rooms: b.floors.flatMap((f) =>
        f.rooms.map((r) => ({
          id: String(r.id),
          code: r.roomCode,
          floorNumber: f.floorNumber,
          beds: [{ id: String(r.id * 10 + 1), bedLabel: 'Giường 1' }],
          assignments: r.roomStudentAssignments.map((a) => ({ id: String(a.id) })),
        })),
      ),
    }));
  }

  async createBuilding(payload: {
    code: string;
    name: string;
    genderZone?: string | null;
    status?: 'ACTIVE' | 'INACTIVE';
    description?: string | null;
  }) {
    const existing = await this.prisma.dormBuilding.findUnique({ where: { code: payload.code } });
    if (existing) throw new ConflictException('Building code already exists');

    const building = await this.prisma.dormBuilding.create({
      data: {
        code: payload.code,
        name: payload.name,
      },
    });

    return {
      id: String(building.id),
      code: building.code,
      name: building.name,
      genderZone: null as string | null,
      status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
      description: payload.description ?? null,
      rooms: [] as any[],
    };
  }

  async updateBuilding(
    id: number,
    payload: {
      code?: string;
      name?: string;
      genderZone?: string | null;
      status?: 'ACTIVE' | 'INACTIVE';
      description?: string | null;
    },
  ) {
    const building = await this.prisma.dormBuilding.findUnique({ where: { id } });
    if (!building) throw new NotFoundException('Building not found');

    const data: any = {};
    if (payload.code !== undefined) data.code = payload.code;
    if (payload.name !== undefined) data.name = payload.name;

    const updated = await this.prisma.dormBuilding.update({ where: { id }, data });

    return {
      id: String(updated.id),
      code: updated.code,
      name: updated.name,
      genderZone: null as string | null,
      status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
      description: payload.description ?? null,
      rooms: [] as any[],
    };
  }

  async deleteBuilding(id: number) {
    const building = await this.prisma.dormBuilding.findUnique({ where: { id } });
    if (!building) throw new NotFoundException('Building not found');
    await this.prisma.dormBuilding.delete({ where: { id } });
    return { message: 'Deleted' };
  }

  async getRooms(buildingId?: number) {
    const where: any = {};
    if (buildingId) {
      where.floor = { buildingId };
    }

    const rooms = await this.prisma.room.findMany({
      where,
      include: {
        floor: { include: { building: true } },
        roomStudentAssignments: {
          where: { isActive: true },
          include: { student: true },
        },
      },
      orderBy: { roomCode: 'asc' },
    });

    return rooms.map((r) => {
      const floor = r.floor;
      const building = floor?.building;
      const activeStudents = r.roomStudentAssignments.filter((a) => a.isActive);
      return {
        id: String(r.id),
        code: r.roomCode,
        roomCode: r.roomCode,
        name: `Phòng ${r.roomCode}`,
        buildingId: String(building?.id ?? ''),
        buildingCode: building?.code ?? '',
        buildingName: building?.name ?? '',
        floorNumber: floor?.floorNumber ?? 1,
        capacity: r.capacity ?? 4,
        currentStudents: activeStudents.length,
        roomType: null as string | null,
        areaM2: null as number | null,
        status: activeStudents.length > 0 ? 'Đang sử dụng' : 'Còn trống',
        statusLabel: activeStudents.length > 0 ? 'Đang sử dụng' : 'Còn trống',
        condition: 'Tốt',
        conditionLabel: 'Tốt',
      };
    });
  }
}
