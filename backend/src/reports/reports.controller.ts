import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  async getSummary(@CurrentUser('sub') userId: number, @CurrentUser('role') role: string) {
    return this.reportsService.getSummary(userId, role);
  }

  @Get('damage-by-month')
  async getDamageByMonth() {
    return this.reportsService.getDamageByMonth();
  }
}
