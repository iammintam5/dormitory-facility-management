import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, profile: true },
    });
    if (!user) throw new NotFoundException('User not found');

    return {
      id: String(user.id),
      fullName: user.fullName,
      username: user.userCode,
      email: user.email,
      phone: user.phone,
      studentCode: user.studentCode,
      status: user.status,
      role: {
        id: String(user.role.id),
        code: user.role.code as 'ADMIN' | 'MANAGER' | 'STUDENT',
        name: user.role.name,
      },
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      profile: user.profile
        ? {
            id: String(user.profile.id),
            avatarUrl: user.profile.avatarUrl,
            gender: user.profile.gender,
            dateOfBirth: user.profile.dateOfBirth,
            address: user.profile.address,
            faculty: user.profile.faculty,
            className: user.profile.className,
            emergencyName: user.profile.emergencyName,
            emergencyPhone: user.profile.emergencyPhone,
            notes: user.profile.notes,
          }
        : null,
    };
  }

  async updateMyProfile(
    userId: number,
    payload: {
      fullName?: string;
      email?: string | null;
      phone?: string | null;
      gender?: string | null;
      dateOfBirth?: string | null;
      address?: string | null;
      notes?: string | null;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (payload.fullName !== undefined) {
      await this.prisma.user.update({ where: { id: userId }, data: { fullName: payload.fullName } });
    }
    if (payload.email !== undefined) {
      await this.prisma.user.update({ where: { id: userId }, data: { email: payload.email } });
    }
    if (payload.phone !== undefined) {
      await this.prisma.user.update({ where: { id: userId }, data: { phone: payload.phone } });
    }

    const existingProfile = await this.prisma.profile.findUnique({ where: { userId } });
    if (existingProfile) {
      await this.prisma.profile.update({
        where: { userId },
        data: {
          gender: payload.gender !== undefined ? payload.gender : undefined,
          dateOfBirth: payload.dateOfBirth !== undefined ? payload.dateOfBirth : undefined,
          address: payload.address !== undefined ? payload.address : undefined,
          notes: payload.notes !== undefined ? payload.notes : undefined,
        },
      });
    } else if (payload.gender !== undefined || payload.dateOfBirth !== undefined || payload.address !== undefined || payload.notes !== undefined) {
      await this.prisma.profile.create({
        data: {
          userId,
          gender: payload.gender ?? null,
          dateOfBirth: payload.dateOfBirth ?? null,
          address: payload.address ?? null,
          notes: payload.notes ?? null,
        },
      });
    }

    return this.getMyProfile(userId);
  }
}
