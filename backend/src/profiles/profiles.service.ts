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
      avatarUrl?: string | null;
      notes?: string | null;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.$transaction(async (tx) => {
      const userUpdateData: any = {};
      if (payload.fullName !== undefined) userUpdateData.fullName = payload.fullName;
      if (payload.email !== undefined) userUpdateData.email = payload.email;
      if (payload.phone !== undefined) userUpdateData.phone = payload.phone;

      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({ where: { id: userId }, data: userUpdateData });
      }

      const existingProfile = await tx.profile.findUnique({ where: { userId } });
      if (existingProfile) {
        const profileUpdateData: any = {};
        if (payload.gender !== undefined) profileUpdateData.gender = payload.gender;
        if (payload.dateOfBirth !== undefined) profileUpdateData.dateOfBirth = payload.dateOfBirth;
        if (payload.address !== undefined) profileUpdateData.address = payload.address;
        if (payload.avatarUrl !== undefined) profileUpdateData.avatarUrl = payload.avatarUrl;
        if (payload.notes !== undefined) profileUpdateData.notes = payload.notes;

        if (Object.keys(profileUpdateData).length > 0) {
          await tx.profile.update({ where: { userId }, data: profileUpdateData });
        }
      } else if (payload.gender !== undefined || payload.dateOfBirth !== undefined || payload.address !== undefined || payload.avatarUrl !== undefined || payload.notes !== undefined) {
        await tx.profile.create({
          data: {
            userId,
            gender: payload.gender ?? null,
            dateOfBirth: payload.dateOfBirth ?? null,
            address: payload.address ?? null,
            avatarUrl: payload.avatarUrl ?? null,
            notes: payload.notes ?? null,
          },
        });
      }
    });

    return this.getMyProfile(userId);
  }
}
