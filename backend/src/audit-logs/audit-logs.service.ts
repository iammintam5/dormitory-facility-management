import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(currentUser: AuthUser, query: QueryAuditLogsDto) {
    if (currentUser.role !== 'ADMIN') {
      throw new ForbiddenException('Chi quan tri vien moi duoc xem audit log.');
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.AuditLogWhereInput = {};

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.action?.trim()) {
      where.action = {
        contains: query.action.trim(),
        mode: 'insensitive',
      };
    }

    if (query.tableName?.trim()) {
      where.tableName = {
        contains: query.tableName.trim(),
        mode: 'insensitive',
      };
    }

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) {
        where.createdAt.gte = new Date(query.from);
      }
      if (query.to) {
        const endDate = new Date(query.to);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    if (query.keyword?.trim()) {
      const keyword = query.keyword.trim();
      where.OR = [
        { action: { contains: keyword, mode: 'insensitive' } },
        { tableName: { contains: keyword, mode: 'insensitive' } },
        { oldValue: { contains: keyword, mode: 'insensitive' } },
        { newValue: { contains: keyword, mode: 'insensitive' } },
        { user: { fullName: { contains: keyword, mode: 'insensitive' } } },
        { user: { userCode: { contains: keyword, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prismaService.auditLog.findMany({
        where,
        include: {
          user: {
            include: {
              role: true,
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.auditLog.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }
}
