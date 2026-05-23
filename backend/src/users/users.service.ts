import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(dto: CreateUserDto) {
    await this.ensureRoleExists(dto.roleId);
    await this.ensureUserUniqueness(dto.userCode, dto.email);

    const user = await this.prismaService.user.create({
      data: {
        roleId: dto.roleId,
        fullName: dto.fullName.trim(),
        userCode: dto.userCode.trim(),
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        passwordHash: await bcrypt.hash(dto.password, 10),
      },
      include: {
        role: true,
      },
    });

    return this.toUserResponse(user);
  }

  async findAll(query: QueryUsersDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where: Prisma.UserWhereInput = {};

    if (query.roleCode) {
      where.role = {
        code: query.roleCode.trim(),
      };
    }

    if (query.status) {
      where.status = query.status;
    } else if (!query.includeLocked) {
      where.status = UserStatus.ACTIVE;
    }

    if (query.keyword?.trim()) {
      const keyword = query.keyword.trim();

      where.OR = [
        {
          fullName: {
            contains: keyword,
            mode: 'insensitive',
          },
        },
        {
          userCode: {
            contains: keyword,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: keyword,
            mode: 'insensitive',
          },
        },
        {
          phone: {
            contains: keyword,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prismaService.user.findMany({
        where,
        include: {
          role: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prismaService.user.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toUserResponse(item)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  async findOne(id: number) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('Khong tim thay tai khoan.');
    }

    return this.toUserResponse(user);
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.ensureUserExists(id);

    if (dto.roleId) {
      await this.ensureRoleExists(dto.roleId);
    }

    await this.ensureUserUniqueness(dto.userCode, dto.email, id);

    const user = await this.prismaService.user.update({
      where: { id },
      data: {
        roleId: dto.roleId,
        fullName: dto.fullName?.trim(),
        userCode: dto.userCode?.trim(),
        email: dto.email === undefined ? undefined : dto.email?.trim() || null,
        phone: dto.phone === undefined ? undefined : dto.phone?.trim() || null,
        passwordHash: dto.password ? await bcrypt.hash(dto.password, 10) : undefined,
      },
      include: {
        role: true,
      },
    });

    return this.toUserResponse(user);
  }

  async updateStatus(id: number, dto: UpdateUserStatusDto) {
    await this.ensureUserExists(id);

    const user = await this.prismaService.user.update({
      where: { id },
      data: {
        status: dto.status,
      },
      include: {
        role: true,
      },
    });

    return this.toUserResponse(user);
  }

  async assignRole(id: number, dto: AssignRoleDto) {
    await this.ensureUserExists(id);
    await this.ensureRoleExists(dto.roleId);

    const user = await this.prismaService.user.update({
      where: { id },
      data: {
        roleId: dto.roleId,
      },
      include: {
        role: true,
      },
    });

    return this.toUserResponse(user);
  }

  async listRoles() {
    return this.prismaService.role.findMany({
      orderBy: {
        id: 'asc',
      },
    });
  }

  private async ensureUserExists(id: number) {
    const user = await this.prismaService.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Khong tim thay tai khoan.');
    }
  }

  private async ensureRoleExists(roleId: number) {
    const role = await this.prismaService.role.findUnique({ where: { id: roleId } });

    if (!role) {
      throw new BadRequestException('Role khong ton tai.');
    }
  }

  private async ensureUserUniqueness(userCode?: string, email?: string | null, excludeId?: number) {
    const conditions: Prisma.UserWhereInput[] = [];

    if (userCode?.trim()) {
      conditions.push({ userCode: userCode.trim() });
    }

    if (email?.trim()) {
      conditions.push({ email: email.trim() });
    }

    if (conditions.length === 0) {
      return;
    }

    const existingUser = await this.prismaService.user.findFirst({
      where: {
        OR: conditions,
        NOT: excludeId ? { id: excludeId } : undefined,
      },
    });

    if (!existingUser) {
      return;
    }

    if (userCode?.trim() && existingUser.userCode === userCode.trim()) {
      throw new ConflictException('Ma nguoi dung da ton tai.');
    }

    if (email?.trim() && existingUser.email === email.trim()) {
      throw new ConflictException('Email da ton tai.');
    }
  }

  private toUserResponse(user: {
    id: number;
    fullName: string;
    userCode: string;
    email: string | null;
    phone: string | null;
    status: UserStatus;
    createdAt: Date;
    updatedAt: Date | null;
    lastLoginAt: Date | null;
    role: {
      id: number;
      code: string;
      name: string;
    };
  }) {
    return {
      id: user.id,
      fullName: user.fullName,
      userCode: user.userCode,
      email: user.email,
      phone: user.phone,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      role: user.role,
    };
  }
}
