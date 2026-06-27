import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { LiquidationRecordsService } from './liquidation-records.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateLiquidationRecordDto, UpdateLiquidationRecordDto } from './dto/liquidation-record.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('liquidation-records')
export class LiquidationRecordsController {
  constructor(private readonly service: LiquidationRecordsService) {}

  @Roles('MANAGER')
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.service.findAll({
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 10,
      status,
      keyword,
    });
  }

  @Roles('MANAGER')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(parseInt(id, 10));
  }

  @Roles('MANAGER')
  @Post()
  async create(
    @CurrentUser('sub') userId: number,
    @Body() body: CreateLiquidationRecordDto,
  ) {
    return this.service.create(userId, body);
  }

  @Roles('MANAGER')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateLiquidationRecordDto,
  ) {
    return this.service.update(parseInt(id, 10), body);
  }

  @Roles('MANAGER')
  @Post(':id/submit-approval')
  async submitApproval(@Param('id') id: string, @CurrentUser('sub') userId: number) {
    return this.service.transition(parseInt(id, 10), 'submit-approval', userId);
  }

  @Roles('MANAGER')
  @Post(':id/approve')
  async approve(@Param('id') id: string, @CurrentUser('sub') userId: number) {
    return this.service.transition(parseInt(id, 10), 'approve', userId);
  }

  @Roles('MANAGER')
  @Post(':id/reject')
  async reject(@Param('id') id: string, @CurrentUser('sub') userId: number) {
    return this.service.transition(parseInt(id, 10), 'reject', userId);
  }

  @Roles('MANAGER')
  @Post(':id/complete')
  async complete(@Param('id') id: string, @CurrentUser('sub') userId: number) {
    return this.service.transition(parseInt(id, 10), 'complete', userId);
  }

  @Roles('MANAGER')
  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @CurrentUser('sub') userId: number) {
    return this.service.transition(parseInt(id, 10), 'cancel', userId);
  }

  @Roles('MANAGER')
  @Get(':id/export')
  async export(@Param('id') id: string) {
    return this.service.exportData(parseInt(id, 10));
  }
}
