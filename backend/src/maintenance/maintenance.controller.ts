import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthUser } from '../auth/types/auth-user.type';
import { CreateDamageReportFromMaintenanceDto } from './dto/create-damage-report-from-maintenance.dto';
import { CreateLiquidationRecordFromMaintenanceDto } from './dto/create-liquidation-record-from-maintenance.dto';
import { CreateMaintenancePlanDto } from './dto/create-maintenance-plan.dto';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto';
import { QueryDueAssetsDto } from './dto/query-due-assets.dto';
import { QueryMaintenancePlansDto } from './dto/query-maintenance-plans.dto';
import { QueryMaintenanceRecordsDto } from './dto/query-maintenance-records.dto';
import { UpdateMaintenancePlanDto } from './dto/update-maintenance-plan.dto';
import { MaintenanceService } from './maintenance.service';

@Controller('maintenance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'QL_CSVC')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get('dashboard-summary')
  getDashboardSummary(@CurrentUser() currentUser: AuthUser) {
    return this.maintenanceService.getDashboardSummary(currentUser);
  }

  @Get('due-assets')
  findDueAssets(@CurrentUser() currentUser: AuthUser, @Query() query: QueryDueAssetsDto) {
    return this.maintenanceService.findDueAssets(currentUser, query);
  }

  @Get('plans')
  findPlans(@CurrentUser() currentUser: AuthUser, @Query() query: QueryMaintenancePlansDto) {
    return this.maintenanceService.findPlans(currentUser, query);
  }

  @Post('plans')
  createPlan(@CurrentUser() currentUser: AuthUser, @Body() dto: CreateMaintenancePlanDto) {
    return this.maintenanceService.createPlan(currentUser, dto);
  }

  @Patch('plans/:id')
  updatePlan(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMaintenancePlanDto,
  ) {
    return this.maintenanceService.updatePlan(currentUser, id, dto);
  }

  @Get('records')
  findRecords(@CurrentUser() currentUser: AuthUser, @Query() query: QueryMaintenanceRecordsDto) {
    return this.maintenanceService.findRecords(currentUser, query);
  }

  @Post('records')
  createRecord(@CurrentUser() currentUser: AuthUser, @Body() dto: CreateMaintenanceRecordDto) {
    return this.maintenanceService.createRecord(currentUser, dto);
  }

  @Get('records/:id')
  findRecord(@CurrentUser() currentUser: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.maintenanceService.findRecord(currentUser, id);
  }

  @Get('records/:id/export')
  exportRecord(@CurrentUser() currentUser: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.maintenanceService.exportRecord(currentUser, id);
  }

  @Get('assets/:assetId/history')
  findAssetHistory(
    @CurrentUser() currentUser: AuthUser,
    @Param('assetId', ParseIntPipe) assetId: number,
  ) {
    return this.maintenanceService.findAssetHistory(currentUser, assetId);
  }

  @Post('records/:id/create-damage-report')
  createDamageReportFromRecord(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateDamageReportFromMaintenanceDto,
  ) {
    return this.maintenanceService.createDamageReportFromRecord(currentUser, id, dto);
  }

  @Post('records/:id/create-liquidation-record')
  createLiquidationFromRecord(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateLiquidationRecordFromMaintenanceDto,
  ) {
    return this.maintenanceService.createLiquidationFromRecord(currentUser, id, dto);
  }
}
