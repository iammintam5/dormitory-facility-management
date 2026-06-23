import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { userCode: username },
      include: { role: true, profile: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = { sub: user.id, role: user.role.code };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: String(user.id),
        fullName: user.fullName,
        username: user.userCode,
        email: user.email,
        phone: user.phone,
        studentCode: user.studentCode,
        status: user.status,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        role: {
          id: String(user.role.id),
          code: user.role.code as 'ADMIN' | 'MANAGER' | 'STUDENT',
          name: user.role.name,
        },
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
      },
    };
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, profile: true },
    });
    if (!user) throw new UnauthorizedException('User not found');

    return {
      id: String(user.id),
      fullName: user.fullName,
      username: user.userCode,
      email: user.email,
      phone: user.phone,
      studentCode: user.studentCode,
      status: user.status,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      role: {
        id: String(user.role.id),
        code: user.role.code as 'ADMIN' | 'MANAGER' | 'STUDENT',
        name: user.role.name,
      },
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

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { changed: true };
  }
}
