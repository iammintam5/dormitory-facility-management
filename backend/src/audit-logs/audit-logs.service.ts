import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    page: number;
    pageSize: number;
    keyword?: string;
    action?: string;
  }) {
    const { page, pageSize, keyword, action } = params;
    const where: any = {};

    if (keyword) {
      where.OR = [
        { content: { contains: keyword, mode: 'insensitive' } },
        { tableName: { contains: keyword, mode: 'insensitive' } },
      ];
    }
    if (action && action !== 'ALL') {
      where.action = action;
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: { user: { include: { role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = logs.map((l) => ({
      id: String(l.id),
      actorUserId: String(l.userId ?? ''),
      actorRole: l.user?.role?.code ?? '',
      action: l.action,
      entityType: l.tableName,
      entityId: String(l.recordId ?? ''),
      content: l.content ?? '',
      ipAddress: l.ipAddress,
      userAgent: null as string | null,
      createdAt: l.createdAt.toISOString(),
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

  async findOne(id: number) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: { user: { include: { role: true } } },
    });
    if (!log) return null;

    return {
      id: String(log.id),
      actorUserId: String(log.userId ?? ''),
      actorRole: log.user?.role?.code ?? '',
      action: log.action,
      entityType: log.tableName,
      entityId: String(log.recordId ?? ''),
      content: log.content ?? '',
      ipAddress: log.ipAddress,
      userAgent: null as string | null,
      createdAt: log.createdAt.toISOString(),
    };
  }
}
