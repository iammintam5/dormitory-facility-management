import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateMaintenanceRecordDto, UpdateMaintenanceRecordDto } from './dto/maintenance-record.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

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
    @Body() body: UpdateMaintenanceRecordDto,
  ) {
    return this.maintenanceService.updateRecord(parseInt(id, 10), body);
  }

  @Roles('MANAGER')
  @Get('history/:assetId')
  async getHistory(@Param('assetId') assetId: string) {
    return this.maintenanceService.getHistory(parseInt(assetId, 10));
  }
}
