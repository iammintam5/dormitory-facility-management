import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get('plans')
  async getPlans() {
    return this.maintenanceService.getPlans();
  }

  @Get('records')
  async getRecords(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.maintenanceService.getRecords({
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 10,
    });
  }

  @Post('records')
  async createRecord(
    @CurrentUser('sub') userId: number,
    @Body() body: {
      planId?: number;
      assetId: number;
      maintenanceDate: string;
      maintenanceType: string;
      content: string;
      resultStatus: string;
      nextMaintenanceDate?: string;
      cost?: number;
      materialNote?: string;
      note?: string;
    },
  ) {
    return this.maintenanceService.createRecord(userId, body);
  }

  @Get('dashboard')
  async getDashboard() {
    return this.maintenanceService.getDashboardSummary();
  }

  @Patch('records/:id')
  async updateRecord(
    @Param('id') id: string,
    @Body() body: {
      maintenanceDate?: string;
      maintenanceType?: string;
      content?: string;
      resultStatus?: string;
      nextMaintenanceDate?: string;
      cost?: number;
      materialNote?: string;
      note?: string;
    },
  ) {
    return this.maintenanceService.updateRecord(parseInt(id, 10), body);
  }

  @Get('history/:assetId')
  async getHistory(@Param('assetId') assetId: string) {
    return this.maintenanceService.getHistory(parseInt(assetId, 10));
  }
}
