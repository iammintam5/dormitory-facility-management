import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationStatus, Prisma } from '@prisma/client';
import { AuthUser } from '../auth/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { QueryMyNotificationsDto } from './dto/query-my-notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async getMyNotifications(currentUser: AuthUser, query: QueryMyNotificationsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where: Prisma.NotificationWhereInput = {
      userId: currentUser.userId,
    };

    const [items, total] = await Promise.all([
      this.prismaService.notification.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.notification.count({ where }),
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

  async markRead(currentUser: AuthUser, id: number) {
    const notification = await this.prismaService.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== currentUser.userId) {
      throw new NotFoundException('Khong tim thay thong bao.');
    }

    return this.prismaService.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.READ,
        readAt: notification.readAt ?? new Date(),
      },
    });
  }

  async markAllRead(currentUser: AuthUser) {
    const result = await this.prismaService.notification.updateMany({
      where: {
        userId: currentUser.userId,
        status: NotificationStatus.UNREAD,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    return {
      updatedCount: result.count,
    };
  }

  async getUnreadCount(currentUser: AuthUser) {
    const count = await this.prismaService.notification.count({
      where: {
        userId: currentUser.userId,
        status: NotificationStatus.UNREAD,
      },
    });

    return { count };
  }
}
