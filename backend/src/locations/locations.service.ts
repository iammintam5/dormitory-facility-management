import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AssignStudentRoomDto } from './dto/assign-student-room.dto';
import { CreateDormBuildingDto } from './dto/create-dorm-building.dto';
import { CreateFloorDto } from './dto/create-floor.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateDormBuildingDto } from './dto/update-dorm-building.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class LocationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async createDormBuilding(dto: CreateDormBuildingDto) {
    await this.ensureDormBuildingUnique(dto.code);

    return this.prismaService.dormBuilding.create({
      data: {
        code: dto.code.trim(),
        name: dto.name.trim(),
      },
    });
  }

  findDormBuildings() {
    return this.prismaService.dormBuilding.findMany({
      include: {
        floors: {
          orderBy: { floorNumber: 'asc' },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async updateDormBuilding(id: number, dto: UpdateDormBuildingDto) {
    await this.ensureDormBuildingExists(id);
    await this.ensureDormBuildingUnique(dto.code, id);

    return this.prismaService.dormBuilding.update({
      where: { id },
      data: {
        code: dto.code?.trim(),
        name: dto.name?.trim(),
      },
    });
  }

  async removeDormBuilding(id: number) {
    await this.ensureDormBuildingExists(id);

    const floorCount = await this.prismaService.floor.count({
      where: { buildingId: id },
    });

    if (floorCount > 0) {
      throw new BadRequestException('Không thể xóa khu khi vẫn còn tầng.');
    }

    await this.prismaService.dormBuilding.delete({
      where: { id },
    });

    return { message: 'Xóa khu thành công.' };
  }

  async createFloor(dto: CreateFloorDto) {
    await this.ensureDormBuildingExists(dto.buildingId);
    await this.ensureFloorUnique(dto.buildingId, dto.floorNumber);

    return this.prismaService.floor.create({
      data: {
        buildingId: dto.buildingId,
        floorNumber: dto.floorNumber,
        name: dto.name?.trim(),
      },
      include: {
        building: true,
      },
    });
  }

  findFloors() {
    return this.prismaService.floor.findMany({
      include: {
        building: true,
        rooms: {
          orderBy: { roomCode: 'asc' },
        },
      },
      orderBy: [{ buildingId: 'asc' }, { floorNumber: 'asc' }],
    });
  }

  async updateFloor(id: number, dto: UpdateFloorDto) {
    const floor = await this.ensureFloorExists(id);
    const buildingId = dto.buildingId ?? floor.buildingId;
    const floorNumber = dto.floorNumber ?? floor.floorNumber;

    await this.ensureDormBuildingExists(buildingId);
    await this.ensureFloorUnique(buildingId, floorNumber, id);

    return this.prismaService.floor.update({
      where: { id },
      data: {
        buildingId,
        floorNumber,
        name: dto.name === undefined ? undefined : dto.name?.trim() || null,
      },
      include: {
        building: true,
      },
    });
  }

  async removeFloor(id: number) {
    await this.ensureFloorExists(id);

    const roomCount = await this.prismaService.room.count({
      where: { floorId: id },
    });

    if (roomCount > 0) {
      throw new BadRequestException('Không thể xóa tầng khi vẫn còn phòng.');
    }

    await this.prismaService.floor.delete({ where: { id } });
    return { message: 'Xóa tầng thành công.' };
  }

  async createRoom(dto: CreateRoomDto) {
    await this.ensureFloorExists(dto.floorId);
    await this.ensureRoomUnique(dto.floorId, dto.roomCode);

    return this.prismaService.room.create({
      data: {
        floorId: dto.floorId,
        roomCode: dto.roomCode.trim(),
        capacity: dto.capacity,
        note: dto.note?.trim(),
      },
      include: this.roomInclude,
    });
  }

  findRooms() {
    console.log('[LocationsService] Starting findRooms query with nested includes...');
    const startTime = Date.now();
    
    const query = this.prismaService.room.findMany({
      include: this.roomInclude,
      orderBy: [{ floorId: 'asc' }, { roomCode: 'asc' }],
    });

    return query.then((result) => {
      const duration = Date.now() - startTime;
      console.log(`[LocationsService] findRooms completed in ${duration}ms, returned ${result.length} rooms`);
      return result;
    }).catch((error) => {
      const duration = Date.now() - startTime;
      console.error(`[LocationsService] findRooms failed after ${duration}ms:`, error);
      throw error;
    });
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

    return assignments.map((assignment) => ({
      id: assignment.id,
      startDate: assignment.startDate,
      endDate: assignment.endDate,
      isActive: assignment.isActive,
      student: {
        id: assignment.student.id,
        fullName: assignment.student.fullName,
        userCode: assignment.student.userCode,
        status: assignment.student.status,
        role: assignment.student.role,
      },
    }));
  }

  async updateRoom(id: number, dto: UpdateRoomDto) {
    const room = await this.ensureRoomExists(id);
    const floorId = dto.floorId ?? room.floorId;
    const roomCode = dto.roomCode ?? room.roomCode;

    await this.ensureFloorExists(floorId);
    await this.ensureRoomUnique(floorId, roomCode, id);

    return this.prismaService.room.update({
      where: { id },
      data: {
        floorId,
        roomCode: roomCode.trim(),
        capacity: dto.capacity === undefined ? undefined : dto.capacity,
        note: dto.note === undefined ? undefined : dto.note?.trim() || null,
      },
      include: this.roomInclude,
    });
  }

  async removeRoom(id: number) {
    await this.ensureRoomExists(id);

    const [assignmentCount, assetCount] = await Promise.all([
      this.prismaService.roomStudent.count({ where: { roomId: id, isActive: true } }),
      this.prismaService.asset.count({ where: { roomId: id } }),
    ]);

    if (assignmentCount > 0 || assetCount > 0) {
      throw new BadRequestException(
        'Không thể xóa phòng khi đang có sinh viên hoặc tài sản liên quan.',
      );
    }

    await this.prismaService.room.delete({ where: { id } });
    return { message: 'Xóa phòng thành công.' };
  }

  async assignStudentToRoom(roomId: number, dto: AssignStudentRoomDto) {
    const room = await this.prismaService.room.findUnique({
      where: { id: roomId },
      include: {
        roomStudents: {
          where: {
            isActive: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Không tìm thấy phòng.');
    }

    const student = await this.prismaService.user.findUnique({
      where: { id: dto.studentId },
      include: { role: true },
    });

    if (!student) {
      throw new NotFoundException('Không tìm thấy sinh viên.');
    }

    if (student.role.code !== 'STUDENT') {
      throw new BadRequestException('Người dùng được gán vào phòng phải là Sinh viên.');
    }

    if (student.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Sinh viên này đang bị khóa, không thể gán vào phòng.');
    }

    const existingAssignment = await this.prismaService.roomStudent.findFirst({
      where: {
        studentId: dto.studentId,
        isActive: true,
      },
      include: {
        room: true,
      }
    });

    if (existingAssignment) {
      throw new ConflictException(`Sinh viên ${student.fullName} hiện đang ở phòng ${existingAssignment.room.roomCode}. Vui lòng trả phòng cũ trước khi gán phòng mới.`);
    }

    if (room.capacity && room.roomStudents.length >= room.capacity) {
      throw new BadRequestException('Phòng này đã đủ sức chứa, không thể gán thêm.');
    }

    return this.prismaService.roomStudent.create({
      data: {
        roomId,
        studentId: dto.studentId,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isActive: true,
      },
      include: {
        student: {
          include: {
            role: true,
          },
        },
        room: true,
      },
    });
  }

  private get roomInclude() {
    return {
      floor: {
        include: {
          building: true,
        },
      },
      roomStudents: {
        where: { isActive: true },
        include: {
          student: {
            include: {
              role: true,
            },
          },
        },
      },
    } satisfies Prisma.RoomInclude;
  }

  private async ensureDormBuildingExists(id: number) {
    const building = await this.prismaService.dormBuilding.findUnique({ where: { id } });

    if (!building) {
      throw new NotFoundException('Không tìm thấy khu.');
    }

    return building;
  }

  private async ensureDormBuildingUnique(code?: string, excludeId?: number) {
    if (!code?.trim()) {
      return;
    }

    const building = await this.prismaService.dormBuilding.findFirst({
      where: {
        code: code.trim(),
        NOT: excludeId ? { id: excludeId } : undefined,
      },
    });

    if (building) {
      throw new ConflictException('Mã khu đã tồn tại.');
    }
  }

  private async ensureFloorExists(id: number) {
    const floor = await this.prismaService.floor.findUnique({ where: { id } });

    if (!floor) {
      throw new NotFoundException('Không tìm thấy tầng.');
    }

    return floor;
  }

  async unassignStudentFromRoom(roomId: number, studentId: number) {
    const existingAssignment = await this.prismaService.roomStudent.findFirst({
      where: {
        roomId,
        studentId,
        isActive: true,
      },
    });

    if (!existingAssignment) {
      throw new BadRequestException('Sinh viên hiện không ở trong phòng này hoặc đã trả phòng.');
    }

    return this.prismaService.roomStudent.update({
      where: { id: existingAssignment.id },
      data: {
        isActive: false,
        endDate: new Date(),
      },
      include: {
        student: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  private async ensureFloorUnique(buildingId: number, floorNumber: number, excludeId?: number) {
    const floor = await this.prismaService.floor.findFirst({
      where: {
        buildingId,
        floorNumber,
        NOT: excludeId ? { id: excludeId } : undefined,
      },
    });

    if (floor) {
      throw new ConflictException('Số tầng đã tồn tại trong khu này.');
    }
  }

  private async ensureRoomExists(id: number) {
    const room = await this.prismaService.room.findUnique({ where: { id } });

    if (!room) {
      throw new NotFoundException('Không tìm thấy phòng.');
    }

    return room;
  }

  private async ensureRoomUnique(floorId: number, roomCode: string, excludeId?: number) {
    const room = await this.prismaService.room.findFirst({
      where: {
        roomCode: roomCode.trim(),
        NOT: excludeId ? { id: excludeId } : undefined,
      },
    });

    if (room) {
      throw new ConflictException('Mã phòng này đã tồn tại trong hệ thống (có thể ở tầng/khu khác).');
    }
  }
}
