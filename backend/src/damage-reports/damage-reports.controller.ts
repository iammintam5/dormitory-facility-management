import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DamageReportsService } from './damage-reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('damage-reports')
export class DamageReportsController {
  constructor(private readonly service: DamageReportsService) {}

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

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(parseInt(id, 10));
  }

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

  @Post(':id/accept')
  async accept(@Param('id') id: string, @CurrentUser('sub') userId: number) {
    return this.service.transition(parseInt(id, 10), 'accept', userId);
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string, @CurrentUser('sub') userId: number) {
    return this.service.transition(parseInt(id, 10), 'reject', userId);
  }

  @Post(':id/start-processing')
  async startProcessing(@Param('id') id: string, @CurrentUser('sub') userId: number) {
    return this.service.transition(parseInt(id, 10), 'start-processing', userId);
  }

  @Post(':id/complete')
  async complete(@Param('id') id: string, @CurrentUser('sub') userId: number) {
    return this.service.transition(parseInt(id, 10), 'complete', userId);
  }

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

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @CurrentUser('sub') userId: number) {
    return this.service.transition(parseInt(id, 10), 'cancel', userId);
  }
}
