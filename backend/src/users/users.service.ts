import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    page: number;
    pageSize: number;
    keyword?: string;
    roleCode?: string;
    status?: string;
    studentCode?: string;
  }) {
    const { page, pageSize, keyword, roleCode, status, studentCode } = params;
    const where: any = {};

    if (studentCode) {
      where.studentCode = studentCode;
    }
    if (keyword) {
      where.OR = [
        { fullName: { contains: keyword, mode: 'insensitive' } },
        { userCode: { contains: keyword, mode: 'insensitive' } },
        { email: { contains: keyword, mode: 'insensitive' } },
      ];
    }
    if (roleCode) {
      where.role = { code: roleCode };
    }
    if (status) {
      where.status = status;
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: { role: true, profile: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = users.map((u) => ({
      id: String(u.id),
      fullName: u.fullName,
      username: u.userCode,
      studentCode: u.studentCode ?? null,
      email: u.email ?? null,
      phone: u.phone ?? null,
      status: u.status,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      role: {
        id: String(u.role.id),
        code: u.role.code as 'ADMIN' | 'MANAGER' | 'STUDENT',
        name: u.role.name,
      },
      profile: u.profile ? {
        id: String(u.profile.id),
        avatarUrl: u.profile.avatarUrl,
        gender: u.profile.gender,
        dateOfBirth: u.profile.dateOfBirth,
        address: u.profile.address,
        faculty: u.profile.faculty,
        className: u.profile.className,
        emergencyName: u.profile.emergencyName,
        emergencyPhone: u.profile.emergencyPhone,
        notes: u.profile.notes,
      } : null,
    }));

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async getRoles() {
    const roles = await this.prisma.role.findMany();
    return roles.map((r) => ({
      id: String(r.id),
      code: r.code as 'ADMIN' | 'MANAGER' | 'STUDENT',
      name: r.name,
    }));
  }

  async create(payload: {
    roleId: string;
    fullName: string;
    username: string;
    password: string;
    email?: string;
    phone?: string;
    studentCode?: string;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { userCode: payload.username } });
    if (existing) throw new ConflictException('Username already exists');

    const hashed = await bcrypt.hash(payload.password, 10);
    const user = await this.prisma.user.create({
      data: {
        fullName: payload.fullName,
        userCode: payload.username,
        password: hashed,
        email: payload.email ?? null,
        phone: payload.phone ?? null,
        studentCode: payload.studentCode ?? null,
        roleId: parseInt(payload.roleId, 10),
      },
      include: { role: true, profile: true },
    });

    return {
      id: String(user.id),
      fullName: user.fullName,
      username: user.userCode,
      studentCode: user.studentCode ?? null,
      email: user.email ?? null,
      phone: user.phone ?? null,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastLoginAt: null,
      role: {
        id: String(user.role.id),
        code: user.role.code as 'ADMIN' | 'MANAGER' | 'STUDENT',
        name: user.role.name,
      },
      profile: null,
    };
  }

  async update(id: number, payload: {
    roleId?: string;
    fullName?: string;
    username?: string;
    email?: string | null;
    phone?: string | null;
    studentCode?: string | null;
  }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const data: any = {};
    if (payload.fullName !== undefined) data.fullName = payload.fullName;
    if (payload.username !== undefined) data.userCode = payload.username;
    if (payload.email !== undefined) data.email = payload.email;
    if (payload.phone !== undefined) data.phone = payload.phone;
    if (payload.studentCode !== undefined) data.studentCode = payload.studentCode;
    if (payload.roleId !== undefined) data.roleId = parseInt(payload.roleId, 10);

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      include: { role: true, profile: true },
    });

    return {
      id: String(updated.id),
      fullName: updated.fullName,
      username: updated.userCode,
      studentCode: updated.studentCode ?? null,
      email: updated.email ?? null,
      phone: updated.phone ?? null,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      lastLoginAt: updated.lastLoginAt?.toISOString() ?? null,
      role: {
        id: String(updated.role.id),
        code: updated.role.code as 'ADMIN' | 'MANAGER' | 'STUDENT',
        name: updated.role.name,
      },
      profile: null,
    };
  }

  async lock(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: 'LOCKED' },
      include: { role: true },
    });
    return {
      id: String(updated.id),
      fullName: updated.fullName,
      username: updated.userCode,
      studentCode: null,
      email: updated.email,
      phone: updated.phone,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      lastLoginAt: updated.lastLoginAt?.toISOString() ?? null,
      role: {
        id: String(updated.role.id),
        code: updated.role.code as 'ADMIN' | 'MANAGER' | 'STUDENT',
        name: updated.role.name,
      },
      profile: null,
    };
  }

  async unlock(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
      include: { role: true },
    });
    return {
      id: String(updated.id),
      fullName: updated.fullName,
      username: updated.userCode,
      studentCode: null,
      email: updated.email,
      phone: updated.phone,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      lastLoginAt: updated.lastLoginAt?.toISOString() ?? null,
      role: {
        id: String(updated.role.id),
        code: updated.role.code as 'ADMIN' | 'MANAGER' | 'STUDENT',
        name: updated.role.name,
      },
      profile: null,
    };
  }

  async resetPassword(id: number, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id }, data: { password: hashed } });
    return { userId: String(id) };
  }
}
