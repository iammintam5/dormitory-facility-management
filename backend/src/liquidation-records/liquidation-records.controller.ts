import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { LiquidationRecordsService } from './liquidation-records.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('liquidation-records')
export class LiquidationRecordsController {
  constructor(private readonly service: LiquidationRecordsService) {}

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

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(parseInt(id, 10));
  }

  @Post()
  async create(
    @CurrentUser('sub') userId: number,
    @Body() body: {
      assetId: number;
      liquidationDate: string;
      assetCondition: string;
      reason: string;
      estimatedRemainingValue?: number;
      note?: string;
    },
  ) {
    return this.service.create(userId, body);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: {
      liquidationDate?: string;
      note?: string;
    },
  ) {
    return this.service.update(parseInt(id, 10), body);
  }

  @Post(':id/submit-approval')
  async submitApproval(@Param('id') id: string, @CurrentUser('sub') userId: number) {
    return this.service.transition(parseInt(id, 10), 'submit-approval', userId);
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string, @CurrentUser('sub') userId: number) {
    return this.service.transition(parseInt(id, 10), 'approve', userId);
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string, @CurrentUser('sub') userId: number) {
    return this.service.transition(parseInt(id, 10), 'reject', userId);
  }

  @Post(':id/complete')
  async complete(@Param('id') id: string, @CurrentUser('sub') userId: number) {
    return this.service.transition(parseInt(id, 10), 'complete', userId);
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @CurrentUser('sub') userId: number) {
    return this.service.transition(parseInt(id, 10), 'cancel', userId);
  }

  @Get(':id/export')
  async export(@Param('id') id: string) {
    return this.service.exportData(parseInt(id, 10));
  }
}
