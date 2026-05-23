import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, User, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthUser } from './types/auth-user.type';

type UserWithRole = User & { role: Role };

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        userCode: dto.userCode,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      await this.createAuditLog({
        userId: null,
        action: 'login_failed',
        tableName: 'auth',
        newValue: this.stringifyPayload({
          userCode: dto.userCode,
          reason: 'user_not_found',
        }),
        ipAddress,
      });
      throw new UnauthorizedException('Thong tin dang nhap khong hop le.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      await this.createAuditLog({
        userId: user.id,
        action: 'login_failed',
        tableName: 'auth',
        recordId: user.id,
        newValue: this.stringifyPayload({
          userCode: dto.userCode,
          reason: 'invalid_password',
        }),
        ipAddress,
      });
      throw new UnauthorizedException('Thong tin dang nhap khong hop le.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Tai khoan hien khong the dang nhap.');
    }

    const authUser = this.buildAuthUser(user);
    const accessToken = await this.jwtService.signAsync(authUser);

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    return {
      accessToken,
      user: {
        id: authUser.userId,
        fullName: authUser.fullName,
        userCode: authUser.userCode,
        role: authUser.role,
      },
    };
  }

  async getMe(userId: number) {
    const user = await this.findUserById(userId);

    return {
      id: user.id,
      fullName: user.fullName,
      userCode: user.userCode,
      role: user.role.code,
    };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.findUserById(userId);
    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Mat khau hien tai khong dung.');
    }

    const isSamePassword = await bcrypt.compare(dto.newPassword, user.passwordHash);

    if (isSamePassword) {
      throw new ForbiddenException('Mat khau moi phai khac mat khau hien tai.');
    }

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(dto.newPassword, 10),
      },
    });

    return {
      message: 'Doi mat khau thanh cong.',
    };
  }

  async resetPassword(userId: number, dto: ResetPasswordDto, ipAddress?: string) {
    const user = await this.findUserById(userId);

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(dto.newPassword, 10),
      },
    });

    await this.createAuditLog({
      userId,
      action: 'reset_password',
      tableName: 'users',
      recordId: user.id,
      newValue: this.stringifyPayload({
        userCode: user.userCode,
      }),
      ipAddress,
    });

    return {
      message: 'Dat lai mat khau thanh cong.',
    };
  }

  async validateAccessToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<AuthUser>(token);
      return payload;
    } catch {
      throw new UnauthorizedException('Token khong hop le hoac da het han.');
    }
  }

  private async findUserById(userId: number) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('Khong tim thay nguoi dung.');
    }

    return user;
  }

  private buildAuthUser(user: UserWithRole): AuthUser {
    return {
      userId: user.id,
      fullName: user.fullName,
      userCode: user.userCode,
      role: user.role.code,
    };
  }

  private async createAuditLog(input: {
    userId: number | null;
    action: string;
    tableName: string;
    recordId?: number;
    oldValue?: string | null;
    newValue?: string | null;
    ipAddress?: string | null;
  }) {
    await this.prismaService.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        tableName: input.tableName,
        recordId: input.recordId ?? null,
        oldValue: input.oldValue ?? null,
        newValue: input.newValue ?? null,
        ipAddress: input.ipAddress ?? null,
      },
    });
  }

  private stringifyPayload(payload: Record<string, unknown>) {
    return JSON.stringify(payload);
  }
}
