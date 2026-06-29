import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyRoom(userId: number) {
    const assignment = await this.prisma.roomStudentAssignment.findFirst({
      where: { studentId: userId, isActive: true },
      include: {
        room: {
          include: {
            floor: {
              include: { building: true },
            },
          },
        },
      },
    });

    if (!assignment) {
      return null;
    }

    const room = assignment.room;
    return {
      id: room.id,
      roomCode: room.roomCode,
      capacity: room.capacity,
      roomType: room.roomType,
      areaM2: room.areaM2,
      condition: room.condition,
      note: room.note,
      floor: room.floor,
    };
  }

  async getMyRoommates(userId: number) {
    const assignment = await this.prisma.roomStudentAssignment.findFirst({
      where: { studentId: userId, isActive: true },
    });

    if (!assignment) {
      return [];
    }

    const roommatesAssignments = await this.prisma.roomStudentAssignment.findMany({
      where: { roomId: assignment.roomId, isActive: true },
      include: {
        student: {
          include: { profile: true },
        },
      },
    });

    return roommatesAssignments.map((a) => ({
      id: a.student.id,
      fullName: a.student.fullName,
      studentCode: a.student.studentCode,
      email: a.student.email,
      phone: a.student.phone,
      avatarUrl: a.student.profile?.avatarUrl ?? null,
      faculty: a.student.profile?.faculty ?? null,
      className: a.student.profile?.className ?? null,
    }));
  }

  async getMyRoomAssets(userId: number) {
    const assignment = await this.prisma.roomStudentAssignment.findFirst({
      where: { studentId: userId, isActive: true },
    });

    if (!assignment) {
      return [];
    }

    const assets = await this.prisma.asset.findMany({
      where: { roomId: assignment.roomId },
      include: { category: true },
    });

    return assets.map((a) => ({
      id: a.id,
      categoryId: a.categoryId,
      roomId: a.roomId,
      assetCode: a.assetCode,
      assetName: a.assetName,
      categoryCode: a.category?.code ?? '',
      categoryName: a.category?.name ?? '',
      status: a.status,
      yearInUse: a.yearInUse,
      description: a.description ?? null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      category: a.category
        ? {
            id: a.category.id,
            code: a.category.code,
            name: a.category.name,
            description: a.category.description,
            createdAt: a.category.createdAt.toISOString(),
            updatedAt: a.category.updatedAt.toISOString(),
          }
        : undefined,
    }));
  }
}
