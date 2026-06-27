import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles('ADMIN', 'MANAGER', 'STUDENT')
  @Get('summary')
  async getSummary(@CurrentUser('sub') userId: number, @CurrentUser('role') role: string) {
    return this.reportsService.getSummary(userId, role);
  }

  @Roles('MANAGER')
  @Get('damage-by-month')
  async getDamageByMonth() {
    return this.reportsService.getDamageByMonth();
  }
}
