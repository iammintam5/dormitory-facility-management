import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateMaintenanceRecordDto, UpdateMaintenanceRecordDto, CompleteMaintenanceRecordDto, CreateDirectCompletedRecordDto } from './dto/maintenance-record.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Roles('MANAGER')
  @Post('records/complete-direct')
  async createDirectCompletedRecord(
    @CurrentUser('sub') userId: number,
    @Body() body: CreateDirectCompletedRecordDto,
  ) {
    return this.maintenanceService.createDirectCompletedRecord(userId, body);
  }

  @Roles('MANAGER')
  @Get('plans')
  async getPlans() {
    return this.maintenanceService.getPlans();
  }

  @Roles('MANAGER')
  @Get('records')
  async getRecords(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.maintenanceService.getRecords({
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 10,
    });
  }

  @Roles('MANAGER')
  @Post('records')
  async createRecord(
    @CurrentUser('sub') userId: number,
    @Body() body: CreateMaintenanceRecordDto,
  ) {
    return this.maintenanceService.createRecord(userId, body);
  }

  @Roles('MANAGER')
  @Get('dashboard')
  async getDashboard() {
    return this.maintenanceService.getDashboardSummary();
  }

  @Roles('MANAGER')
  @Patch('records/:id')
  async updateRecord(
    @Param('id') id: string,
    @CurrentUser('sub') userId: number,
    @Body() body: UpdateMaintenanceRecordDto,
  ) {
    return this.maintenanceService.updateRecord(parseInt(id, 10), userId, body);
  }

  @Roles('MANAGER')
  @Patch('records/:id/start')
  async startRecord(
    @Param('id') id: string,
    @CurrentUser('sub') userId: number,
  ) {
    return this.maintenanceService.startRecord(parseInt(id, 10), userId);
  }

  @Roles('MANAGER')
  @Patch('records/:id/complete')
  async completeRecord(
    @Param('id') id: string,
    @CurrentUser('sub') userId: number,
    @Body() body: CompleteMaintenanceRecordDto,
  ) {
    return this.maintenanceService.completeRecord(parseInt(id, 10), userId, body);
  }

  @Roles('MANAGER')
  @Patch('records/:id/cancel')
  async cancelRecord(
    @Param('id') id: string,
    @CurrentUser('sub') userId: number,
    @Body() body: { reason: string; nextAssetStatus: 'DAMAGED' | 'PENDING_LIQUIDATION' },
  ) {
    return this.maintenanceService.cancelRecord(parseInt(id, 10), userId, body);
  }

  @Roles('MANAGER')
  @Get('history/:assetId')
  async getHistory(@Param('assetId') assetId: string) {
    return this.maintenanceService.getHistory(parseInt(assetId, 10));
  }
}
