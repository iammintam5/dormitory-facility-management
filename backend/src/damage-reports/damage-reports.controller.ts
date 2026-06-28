import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DamageReportsService } from './damage-reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('damage-reports')
export class DamageReportsController {
  constructor(private readonly service: DamageReportsService) {}

  @Roles('MANAGER', 'STUDENT')
  @Get()
  async findAll(
    @CurrentUser('sub') userId: number,
    @CurrentUser('role') role: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll({
      userId,
      role,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 10,
      status,
    });
  }

  @Roles('MANAGER', 'STUDENT')
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('sub') userId: number,
    @CurrentUser('role') role: string,
  ) {
    return this.service.findOne(parseInt(id, 10), userId, role);
  }

  @Roles('STUDENT')
  @Post()
  async create(
    @CurrentUser('sub') userId: number,
    @Body() body: {
      assetId?: number;
      roomId?: number;
      description: string;
      priority: string;
    },
  ) {
    return this.service.create(userId, body);
  }

  @Roles('MANAGER')
  @Post(':id/accept')
  async accept(@Param('id') id: string, @CurrentUser('sub') userId: number) {
    return this.service.transition(parseInt(id, 10), 'accept', userId);
  }

  @Roles('MANAGER')
  @Post(':id/reject')
  async reject(@Param('id') id: string, @CurrentUser('sub') userId: number) {
    return this.service.transition(parseInt(id, 10), 'reject', userId);
  }

  @Roles('STUDENT')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser('sub') userId: number,
    @Body() body: {
      assetId?: number;
      roomId?: number;
      description?: string;
      priority?: string;
    },
  ) {
    return this.service.update(parseInt(id, 10), userId, body);
  }

  @Roles('STUDENT')
  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @CurrentUser('sub') userId: number) {
    return this.service.transition(parseInt(id, 10), 'cancel', userId);
  }
}
