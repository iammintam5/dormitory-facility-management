import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

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
                assets: { select: { id: true } },
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

    return buildings.map((b) => {
      const totalRooms = b.floors.reduce((sum, floor) => sum + floor.rooms.length, 0);
      const totalCapacity = b.floors.reduce(
        (sum, floor) => sum + floor.rooms.reduce((roomSum, room) => roomSum + (room.capacity ?? 0), 0),
        0,
      );

      return {
      id: String(b.id),
      code: b.code,
      name: b.name,
      genderZone: null as string | null,
      status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
      description: `${b.floors.length || 0} tầng, ${totalRooms} phòng, sức chứa ${totalCapacity} sinh viên`,
      floors: b.floors.map((f) => ({
        id: String(f.id),
        floorNumber: f.floorNumber,
        name: f.name,
      })),
      rooms: b.floors.flatMap((f) =>
        f.rooms.map((r) => ({
          id: String(r.id),
          code: r.roomCode,
          floorId: String(f.id),
          floorNumber: f.floorNumber,
          capacity: r.capacity ?? 4,
          currentStudents: r.roomStudentAssignments.length,
          assetCount: r.assets.length,
          roomType: r.roomType,
          areaM2: r.areaM2,
          condition: r.condition,
          note: r.note,
          beds: [{ id: String(r.id * 10 + 1), bedLabel: 'Giường 1' }],
          assignments: r.roomStudentAssignments.map((a) => ({ id: String(a.id) })),
        })),
      ),
    };
    });
  }

  async createBuilding(payload: {
    code: string;
    name: string;
    genderZone?: string | null;
    status?: 'ACTIVE' | 'INACTIVE';
    description?: string | null;
    floors?: number;
    rooms?: number;
    defaultCapacity?: number;
    defaultRoomType?: string | null;
    defaultAreaM2?: number | null;
    defaultCondition?: string | null;
    defaultNote?: string | null;
  }) {
    const existing = await this.prisma.dormBuilding.findUnique({ where: { code: payload.code } });
    if (existing) throw new ConflictException('Building code already exists');

    const building = await this.prisma.dormBuilding.create({
      data: {
        code: payload.code,
        name: payload.name,
      },
    });

    // Auto-create floors and rooms if specified
    const numFloors = payload.floors ?? 0;
    const numRooms = payload.rooms ?? 0;
    const floorsData: any[] = [];
    const roomsData: any[] = [];

    if (numFloors > 0 && numRooms > 0) {
      for (let floorNum = 1; floorNum <= numFloors; floorNum++) {
        const floor = await this.prisma.floor.create({
          data: {
            floorNumber: floorNum,
            name: `Tầng ${floorNum}`,
            buildingId: building.id,
          },
        });
        floorsData.push({
          id: String(floor.id),
          floorNumber: floor.floorNumber,
          name: floor.name,
        });

        for (let roomNum = 1; roomNum <= numRooms; roomNum++) {
          const roomCode = `${payload.code}${floorNum}${String(roomNum).padStart(2, '0')}`;
          const room = await this.prisma.room.create({
            data: {
              roomCode,
              capacity: payload.defaultCapacity ?? 4,
              roomType: payload.defaultRoomType ?? null,
              areaM2: payload.defaultAreaM2 ?? null,
              condition: payload.defaultCondition ?? null,
              note: payload.defaultNote ?? null,
              floorId: floor.id,
            },
          });
          roomsData.push({
            id: String(room.id),
            code: room.roomCode,
            floorId: String(floor.id),
            capacity: room.capacity ?? 4,
            currentStudents: 0,
            assetCount: 0,
            roomType: room.roomType,
            areaM2: room.areaM2,
            condition: room.condition,
            note: room.note,
            floorNumber: floorNum,
            beds: [{ id: String(room.id * 10 + 1), bedLabel: 'Giường 1' }],
            assignments: [],
          });
        }
      }
    }

    return {
      id: String(building.id),
      code: building.code,
      name: building.name,
      genderZone: null as string | null,
      status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
      description: `${floorsData.length || 0} tầng, ${roomsData.length} phòng, sức chứa ${roomsData.reduce((sum, room) => sum + (room.capacity ?? 0), 0)} sinh viên`,
      floors: floorsData,
      rooms: roomsData,
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

    await this.prisma.dormBuilding.update({ where: { id }, data });

    // Fetch full building with actual rooms data for correct display
    const fullBuilding = await this.prisma.dormBuilding.findUnique({
      where: { id },
      include: {
        floors: {
          include: {
            rooms: {
              include: {
                assets: { select: { id: true } },
                roomStudentAssignments: {
                  where: { isActive: true },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    return {
      id: String(fullBuilding!.id),
      code: fullBuilding!.code,
      name: fullBuilding!.name,
      genderZone: null as string | null,
      status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
      description: `${fullBuilding!.floors.length || 0} tầng, ${fullBuilding!.floors.reduce((sum, floor) => sum + floor.rooms.length, 0)} phòng, sức chứa ${fullBuilding!.floors.reduce((sum, floor) => sum + floor.rooms.reduce((roomSum, room) => roomSum + (room.capacity ?? 0), 0), 0)} sinh viên`,
      floors: fullBuilding!.floors.map((f) => ({
        id: String(f.id),
        floorNumber: f.floorNumber,
        name: f.name,
      })),
      rooms: fullBuilding!.floors.flatMap((f) =>
        f.rooms.map((r) => ({
          id: String(r.id),
          code: r.roomCode,
          floorId: String(f.id),
          floorNumber: f.floorNumber,
          capacity: r.capacity ?? 4,
          currentStudents: r.roomStudentAssignments.length,
          assetCount: r.assets.length,
          roomType: r.roomType,
          areaM2: r.areaM2,
          condition: r.condition,
          note: r.note,
          beds: [{ id: String(r.id * 10 + 1), bedLabel: 'Giường 1' }],
          assignments: r.roomStudentAssignments.map((a) => ({ id: String(a.id) })),
        })),
      ),
    };
  }

  async deleteBuilding(id: number) {
    const building = await this.prisma.dormBuilding.findUnique({
      where: { id },
      include: {
        floors: {
          include: {
            rooms: {
              include: {
                assets: { take: 1, select: { id: true } },
                damageReports: { take: 1, select: { id: true } },
                roomStudentAssignments: { take: 1, select: { id: true } },
              },
            },
          },
        },
      },
    });
    if (!building) throw new NotFoundException('Building not found');

    const rooms = building.floors.flatMap((floor) => floor.rooms);
    const roomWithHistory = rooms.find(
      (room) =>
        room.assets.length > 0 ||
        room.damageReports.length > 0 ||
        room.roomStudentAssignments.length > 0,
    );

    if (roomWithHistory) {
      throw new ConflictException(
        `Không thể xóa khu nhà ${building.code} vì phòng ${roomWithHistory.roomCode} đã phát sinh dữ liệu nghiệp vụ. Vui lòng ngừng sử dụng thay vì xóa.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const roomIds = rooms.map((room) => room.id);
      const floorIds = building.floors.map((floor) => floor.id);

      if (roomIds.length > 0) {
        await tx.room.deleteMany({ where: { id: { in: roomIds } } });
      }

      if (floorIds.length > 0) {
        await tx.floor.deleteMany({ where: { id: { in: floorIds } } });
      }

      await tx.dormBuilding.delete({ where: { id } });
    });

    return { message: 'Deleted' };
  }

  async batchUpdateRooms(
    buildingId: number,
    payload: {
      roomIds: number[];
      capacity?: number;
      roomType?: string | null;
      areaM2?: number | null;
      condition?: string | null;
      note?: string | null;
    },
  ) {
    if (!payload.roomIds || payload.roomIds.length === 0) {
      return { message: 'No rooms to update' };
    }

    return this.prisma.$transaction(async (tx) => {
      const building = await tx.dormBuilding.findUnique({ where: { id: buildingId } });
      if (!building) throw new NotFoundException('Building not found');

      const rooms = await tx.room.findMany({
        where: { id: { in: payload.roomIds } },
        include: { floor: true, roomStudentAssignments: { where: { isActive: true } } },
      });

      if (rooms.length !== payload.roomIds.length) {
        throw new BadRequestException('Một số phòng không tồn tại.');
      }

      for (const room of rooms) {
        if (room.floor.buildingId !== buildingId) {
          throw new BadRequestException(`Phòng ${room.roomCode} không thuộc tòa nhà này.`);
        }
        if (payload.capacity !== undefined && payload.capacity !== null) {
          if (payload.capacity <= 0) {
            throw new BadRequestException('Sức chứa phải là số nguyên dương lớn hơn 0.');
          }
          if (room.roomStudentAssignments.length > payload.capacity) {
            throw new ConflictException(`Không thể giảm sức chứa của phòng ${room.roomCode} xuống ${payload.capacity} vì đang có ${room.roomStudentAssignments.length} sinh viên.`);
          }
        }
      }

      const updateData: any = {};
      if (payload.capacity !== undefined) updateData.capacity = payload.capacity;
      if (payload.roomType !== undefined) updateData.roomType = payload.roomType;
      if (payload.areaM2 !== undefined) updateData.areaM2 = payload.areaM2;
      if (payload.condition !== undefined) updateData.condition = payload.condition;
      if (payload.note !== undefined) updateData.note = payload.note;

      if (Object.keys(updateData).length > 0) {
        await tx.room.updateMany({
          where: { id: { in: payload.roomIds } },
          data: updateData,
        });
      }

      return { message: `Updated ${payload.roomIds.length} rooms` };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
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
        roomType: r.roomType,
        areaM2: r.areaM2,
        note: r.note,
        status: activeStudents.length > 0 ? 'Đang sử dụng' : 'Còn trống',
        statusLabel: activeStudents.length > 0 ? 'Đang sử dụng' : 'Còn trống',
        condition: r.condition ?? 'Tốt',
        conditionLabel: r.condition ?? 'Tốt',
      };
    });
  }
}
