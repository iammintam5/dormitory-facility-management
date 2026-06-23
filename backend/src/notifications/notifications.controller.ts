import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  async findAll(
    @CurrentUser('sub') userId: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.findAll(userId, {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 12,
    });
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser('sub') userId: number) {
    return this.service.getUnreadCount(userId);
  }

  @Post(':id/mark-read')
  async markRead(@Param('id') id: string) {
    return this.service.markRead(parseInt(id, 10));
  }

  @Post('mark-all-read')
  async markAllRead(@CurrentUser('sub') userId: number) {
    return this.service.markAllRead(userId);
  }
}
