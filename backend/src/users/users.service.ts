import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

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
  }, actorUserId?: number, ipAddress?: string | null) {
    const existing = await this.prisma.user.findUnique({ where: { userCode: payload.username } });
    if (existing) throw new ConflictException('Tên đăng nhập đã tồn tại');
    if (!payload.password || payload.password.length < 6) {
      throw new BadRequestException('Mật khẩu phải có ít nhất 6 ký tự');
    }

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

    await this.auditLogsService.create({
      userId: actorUserId,
      action: 'CREATE_USER',
      tableName: 'user',
      recordId: user.id,
      content: `Tạo tài khoản ${user.userCode}`,
      newValue: auditUserSnapshot(user),
      ipAddress,
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
    password?: string;
    email?: string | null;
    phone?: string | null;
    studentCode?: string | null;
  }, actorUserId?: number, ipAddress?: string | null) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    if (payload.username !== undefined && payload.username !== user.userCode) {
      const existing = await this.prisma.user.findUnique({ where: { userCode: payload.username } });
      if (existing) throw new ConflictException('Tên đăng nhập đã tồn tại');
    }

    const data: any = {};
    if (payload.fullName !== undefined) data.fullName = payload.fullName;
    if (payload.username !== undefined) data.userCode = payload.username;
    if (payload.password !== undefined && payload.password.trim()) {
      if (payload.password.length < 6) {
        throw new BadRequestException('Mật khẩu phải có ít nhất 6 ký tự');
      }
      data.password = await bcrypt.hash(payload.password, 10);
    }
    if (payload.email !== undefined) data.email = payload.email;
    if (payload.phone !== undefined) data.phone = payload.phone;
    if (payload.studentCode !== undefined) data.studentCode = payload.studentCode;
    if (payload.roleId !== undefined) data.roleId = parseInt(payload.roleId, 10);

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      include: { role: true, profile: true },
    });

    await this.auditLogsService.create({
      userId: actorUserId,
      action: 'UPDATE_USER',
      tableName: 'user',
      recordId: updated.id,
      content: `Cập nhật tài khoản ${updated.userCode}`,
      oldValue: auditUserSnapshot(user),
      newValue: {
        ...auditUserSnapshot(updated),
        passwordChanged: Boolean(data.password),
      },
      ipAddress,
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

  async lock(id: number, actorUserId?: number, ipAddress?: string | null) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: 'LOCKED' },
      include: { role: true },
    });

    await this.auditLogsService.create({
      userId: actorUserId,
      action: 'LOCK_USER',
      tableName: 'user',
      recordId: updated.id,
      content: `Khóa tài khoản ${updated.userCode}`,
      oldValue: auditUserSnapshot(user),
      newValue: auditUserSnapshot(updated),
      ipAddress,
    });

    return {
      id: String(updated.id),
      fullName: updated.fullName,
      username: updated.userCode,
      studentCode: updated.studentCode ?? null,
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

  async unlock(id: number, actorUserId?: number, ipAddress?: string | null) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
      include: { role: true },
    });

    await this.auditLogsService.create({
      userId: actorUserId,
      action: 'UNLOCK_USER',
      tableName: 'user',
      recordId: updated.id,
      content: `Mở khóa tài khoản ${updated.userCode}`,
      oldValue: auditUserSnapshot(user),
      newValue: auditUserSnapshot(updated),
      ipAddress,
    });

    return {
      id: String(updated.id),
      fullName: updated.fullName,
      username: updated.userCode,
      studentCode: updated.studentCode ?? null,
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

  async resetPassword(id: number, newPassword: string, actorUserId?: number, ipAddress?: string | null) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Mật khẩu phải có ít nhất 6 ký tự');
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id }, data: { password: hashed } });

    await this.auditLogsService.create({
      userId: actorUserId,
      action: 'RESET_PASSWORD',
      tableName: 'user',
      recordId: id,
      content: `Đặt lại mật khẩu tài khoản ${user.userCode}`,
      oldValue: auditUserSnapshot(user),
      newValue: { ...auditUserSnapshot(user), passwordChanged: true },
      ipAddress,
    });

    return { userId: String(id) };
  }
}

function auditUserSnapshot(user: {
  id: number;
  fullName: string;
  userCode: string;
  email: string | null;
  phone: string | null;
  studentCode: string | null;
  status: string;
  role?: { code: string; name: string };
  roleId?: number;
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    userCode: user.userCode,
    email: user.email,
    phone: user.phone,
    studentCode: user.studentCode,
    status: user.status,
    role: user.role ? { code: user.role.code, name: user.role.name } : user.roleId,
  };
}
