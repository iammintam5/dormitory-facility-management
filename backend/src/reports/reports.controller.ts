import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthUser } from '../auth/types/auth-user.type';
import { QueryReportsDto } from './dto/query-reports.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'QL_CSVC')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  getSummary(@CurrentUser() currentUser: AuthUser, @Query() query: QueryReportsDto) {
    return this.reportsService.getSummary(currentUser, query);
  }

  @Get('assets-by-room')
  getAssetsByRoom(@CurrentUser() currentUser: AuthUser, @Query() query: QueryReportsDto) {
    return this.reportsService.getAssetsByRoom(currentUser, query);
  }

  @Get('assets-by-category')
  getAssetsByCategory(@CurrentUser() currentUser: AuthUser, @Query() query: QueryReportsDto) {
    return this.reportsService.getAssetsByCategory(currentUser, query);
  }

  @Get('damage-reports-by-status')
  getDamageReportsByStatus(@CurrentUser() currentUser: AuthUser, @Query() query: QueryReportsDto) {
    return this.reportsService.getDamageReportsByStatus(currentUser, query);
  }

  @Get('damage-reports-by-month')
  getDamageReportsByMonth(@CurrentUser() currentUser: AuthUser, @Query() query: QueryReportsDto) {
    return this.reportsService.getDamageReportsByMonth(currentUser, query);
  }

  @Get('maintenance-by-month')
  getMaintenanceByMonth(@CurrentUser() currentUser: AuthUser, @Query() query: QueryReportsDto) {
    return this.reportsService.getMaintenanceByMonth(currentUser, query);
  }

  @Get('liquidation-by-month')
  getLiquidationByMonth(@CurrentUser() currentUser: AuthUser, @Query() query: QueryReportsDto) {
    return this.reportsService.getLiquidationByMonth(currentUser, query);
  }
}
