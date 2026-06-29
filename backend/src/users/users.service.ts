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
        { studentCode: { contains: keyword, mode: 'insensitive' } },
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
        course: u.profile.course,
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
    faculty?: string;
    course?: string;
  }, actorUserId?: number, ipAddress?: string | null) {
    const roleId = parseRoleId(payload.roleId);
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new BadRequestException('Vai trò không hợp lệ');

    const userCode = normalizeRequired(payload.username, 'Tên đăng nhập');
    const fullName = normalizeRequired(payload.fullName, 'Họ tên');
    const email = normalizeOptional(payload.email);
    const phone = normalizeOptional(payload.phone);
    const studentCode = await this.resolveStudentCodeForRole(role.code, payload.studentCode);

    const existing = await this.prisma.user.findUnique({ where: { userCode } });
    if (existing) throw new ConflictException('Tên đăng nhập đã tồn tại');
    if (!payload.password || payload.password.length < 6) {
      throw new BadRequestException('Mật khẩu phải có ít nhất 6 ký tự');
    }

    if (studentCode) {
      const existingStudentCode = await this.prisma.user.findFirst({ where: { studentCode } });
      if (existingStudentCode) throw new ConflictException('Mã sinh viên đã tồn tại');
    }

    const hashed = await bcrypt.hash(payload.password, 10);
    const user = await this.prisma.user.create({
      data: {
        fullName,
        userCode,
        password: hashed,
        email,
        phone,
        studentCode,
        roleId,
        profile: {
          create: {
            faculty: payload.faculty || null,
            course: payload.course || null,
          }
        }
      },
      include: { role: true, profile: true },
    });

    // Audit log
    await this.auditLogsService.create({
      userId: actorUserId,
      action: 'CREATE_USER',
      tableName: 'users',
      recordId: user.id,
      content: `Tạo tài khoản mới: ${payload.username} (${payload.fullName})`,
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
      profile: user.profile ? {
        id: String(user.profile.id),
        avatarUrl: user.profile.avatarUrl ?? null,
        gender: user.profile.gender ?? null,
        dateOfBirth: user.profile.dateOfBirth ?? null,
        address: user.profile.address ?? null,
        faculty: user.profile.faculty ?? null,
        className: user.profile.className ?? null,
        course: user.profile.course ?? null,
        emergencyName: user.profile.emergencyName ?? null,
        emergencyPhone: user.profile.emergencyPhone ?? null,
        notes: user.profile.notes ?? null,
      } : null,
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
    faculty?: string | null;
    course?: string | null;
  }, actorUserId?: number, ipAddress?: string | null) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    const nextRoleId = payload.roleId !== undefined ? parseRoleId(payload.roleId) : user.roleId;
    const nextRole = payload.roleId !== undefined
      ? await this.prisma.role.findUnique({ where: { id: nextRoleId } })
      : user.role;
    if (!nextRole) throw new BadRequestException('Vai trò không hợp lệ');

    const nextUsername = payload.username !== undefined ? normalizeRequired(payload.username, 'Tên đăng nhập') : undefined;
    const nextStudentCode = await this.resolveStudentCodeForRole(
      nextRole.code,
      payload.studentCode !== undefined ? payload.studentCode : user.studentCode,
    );

    if (nextUsername !== undefined && nextUsername !== user.userCode) {
      const existing = await this.prisma.user.findUnique({ where: { userCode: nextUsername } });
      if (existing) throw new ConflictException('Tên đăng nhập đã tồn tại');
    }

    if (nextStudentCode) {
      const existingStudentCode = await this.prisma.user.findFirst({
        where: { studentCode: nextStudentCode, NOT: { id } },
      });
      if (existingStudentCode) throw new ConflictException('Mã sinh viên đã tồn tại');
    }

    if (payload.username !== undefined && payload.username !== user.userCode) {
      const existing = await this.prisma.user.findUnique({ where: { userCode: payload.username } });
      if (existing) throw new ConflictException('Tên đăng nhập đã tồn tại');
    }

    const data: any = {};
    let changes: string[] = [];
    if (payload.fullName !== undefined) { data.fullName = payload.fullName; changes.push('họ tên'); }
    if (payload.username !== undefined) { data.userCode = payload.username; changes.push('tên đăng nhập'); }
    if (payload.password !== undefined && payload.password.trim()) {
      if (payload.password.length < 6) {
        throw new BadRequestException('Mật khẩu phải có ít nhất 6 ký tự');
      }
      data.password = await bcrypt.hash(payload.password, 10);
      changes.push('mật khẩu');
    }
    if (payload.email !== undefined) { data.email = payload.email; changes.push('email'); }
    if (payload.phone !== undefined) { data.phone = payload.phone; changes.push('số điện thoại'); }
    if (payload.studentCode !== undefined) { data.studentCode = payload.studentCode; changes.push('mã sinh viên'); }
    if (payload.roleId !== undefined) { data.roleId = parseInt(payload.roleId, 10); changes.push('vai trò'); }

    if (payload.faculty !== undefined || payload.course !== undefined) {
      const profileData: any = {};
      if (payload.faculty !== undefined) profileData.faculty = payload.faculty;
      if (payload.course !== undefined) profileData.course = payload.course;
      data.profile = {
        upsert: {
          create: profileData,
          update: profileData,
        }
      };
      changes.push('khoa/khóa');
    }

    if (payload.fullName !== undefined) data.fullName = normalizeRequired(payload.fullName, 'Họ tên');
    if (nextUsername !== undefined) data.userCode = nextUsername;
    if (payload.email !== undefined) data.email = normalizeOptional(payload.email);
    if (payload.phone !== undefined) data.phone = normalizeOptional(payload.phone);
    if (payload.studentCode !== undefined || nextRole.code !== user.role.code) data.studentCode = nextStudentCode;
    if (payload.roleId !== undefined) data.roleId = nextRoleId;

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      include: { role: true, profile: true },
    });

    // Audit log
    await this.auditLogsService.create({
      userId: actorUserId,
      action: 'UPDATE_USER',
      tableName: 'users',
      recordId: id,
      content: `Cập nhật tài khoản #${id}: ${changes.join(', ')}`,
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
      profile: updated.profile ? {
        id: String(updated.profile.id),
        avatarUrl: updated.profile.avatarUrl ?? null,
        gender: updated.profile.gender ?? null,
        dateOfBirth: updated.profile.dateOfBirth ?? null,
        address: updated.profile.address ?? null,
        faculty: updated.profile.faculty ?? null,
        className: updated.profile.className ?? null,
        course: updated.profile.course ?? null,
        emergencyName: updated.profile.emergencyName ?? null,
        emergencyPhone: updated.profile.emergencyPhone ?? null,
        notes: updated.profile.notes ?? null,
      } : null,
    };
  }

  private async resolveStudentCodeForRole(roleCode: string, rawStudentCode?: string | null) {
    if (roleCode !== 'STUDENT') return null;

    const studentCode = normalizeRequired(rawStudentCode ?? '', 'Mã sinh viên').toUpperCase();
    return studentCode;
  }

  async lock(id: number, actorUserId?: number, ipAddress?: string | null) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: 'LOCKED' },
      include: { role: true },
    });

    // Audit log
    await this.auditLogsService.create({
      userId: actorUserId,
      action: 'LOCK_USER',
      tableName: 'users',
      recordId: id,
      content: `Khóa tài khoản #${id} (${user.fullName})`,
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

    // Audit log
    await this.auditLogsService.create({
      userId: actorUserId,
      action: 'UNLOCK_USER',
      tableName: 'users',
      recordId: id,
      content: `Mở khóa tài khoản #${id} (${user.fullName})`,
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

    // Audit log
    await this.auditLogsService.create({
      userId: actorUserId,
      action: 'RESET_PASSWORD',
      tableName: 'users',
      recordId: id,
      content: `Đặt lại mật khẩu cho tài khoản #${id} (${user.fullName})`,
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

function parseRoleId(roleId: string) {
  const parsed = Number.parseInt(roleId, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException('Vai trò không hợp lệ');
  }
  return parsed;
}

function normalizeRequired(value: string, fieldName: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new BadRequestException(`${fieldName} không được để trống`);
  }
  return normalized;
}

function normalizeOptional(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
