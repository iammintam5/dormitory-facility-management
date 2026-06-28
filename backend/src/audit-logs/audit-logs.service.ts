import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: {
    userId?: number | null;
    action: string;
    tableName: string;
    recordId?: number | null;
    content?: string | null;
    oldValue?: unknown;
    newValue?: unknown;
    ipAddress?: string | null;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        tableName: params.tableName,
        recordId: params.recordId ?? null,
        content: params.content ?? null,
        oldValue: serializeAuditValue(params.oldValue),
        newValue: serializeAuditValue(params.newValue),
        ipAddress: params.ipAddress ?? null,
      },
    });
  }

  /** Write audit log inside an existing transaction */
  async createWithTx(tx: Prisma.TransactionClient, params: {
    userId?: number | null;
    action: string;
    tableName: string;
    recordId?: number | null;
    content?: string | null;
    oldValue?: unknown;
    newValue?: unknown;
    ipAddress?: string | null;
  }) {
    return tx.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        tableName: params.tableName,
        recordId: params.recordId ?? null,
        content: params.content ?? null,
        oldValue: serializeAuditValue(params.oldValue),
        newValue: serializeAuditValue(params.newValue),
        ipAddress: params.ipAddress ?? null,
      },
    });
  }

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
        { action: { contains: keyword, mode: 'insensitive' } },
        { content: { contains: keyword, mode: 'insensitive' } },
        { tableName: { contains: keyword, mode: 'insensitive' } },
        { ipAddress: { contains: keyword, mode: 'insensitive' } },
        { user: { fullName: { contains: keyword, mode: 'insensitive' } } },
        { user: { userCode: { contains: keyword, mode: 'insensitive' } } },
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
      actorName: l.user?.fullName ?? '',
      actorUsername: l.user?.userCode ?? '',
      actorRole: l.user?.role?.code ?? '',
      action: l.action,
      entityType: l.tableName,
      entityId: String(l.recordId ?? ''),
      content: l.content ?? '',
      oldValue: l.oldValue,
      newValue: l.newValue,
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
      actorName: log.user?.fullName ?? '',
      actorUsername: log.user?.userCode ?? '',
      actorRole: log.user?.role?.code ?? '',
      action: log.action,
      entityType: log.tableName,
      entityId: String(log.recordId ?? ''),
      content: log.content ?? '',
      oldValue: log.oldValue,
      newValue: log.newValue,
      ipAddress: log.ipAddress,
      userAgent: null as string | null,
      createdAt: log.createdAt.toISOString(),
    };
  }

}

function serializeAuditValue(value: unknown) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}
