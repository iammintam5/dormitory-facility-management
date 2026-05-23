import { Controller, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthUser } from '../auth/types/auth-user.type';
import { QueryMyNotificationsDto } from './dto/query-my-notifications.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('my')
  getMy(@CurrentUser() currentUser: AuthUser, @Query() query: QueryMyNotificationsDto) {
    return this.notificationsService.getMyNotifications(currentUser, query);
  }

  @Patch('read-all')
  readAll(@CurrentUser() currentUser: AuthUser) {
    return this.notificationsService.markAllRead(currentUser);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() currentUser: AuthUser) {
    return this.notificationsService.getUnreadCount(currentUser);
  }

  @Patch(':id/read')
  readOne(@CurrentUser() currentUser: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.markRead(currentUser, id);
  }
}
