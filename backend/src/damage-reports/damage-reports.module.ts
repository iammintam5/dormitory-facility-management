import { Module } from '@nestjs/common';
import { DamageReportsController } from './damage-reports.controller';
import { DamageReportsService } from './damage-reports.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AssetsModule } from '../assets/assets.module';

@Module({
  imports: [AuditLogsModule, AssetsModule],
  controllers: [DamageReportsController],
  providers: [DamageReportsService],
  exports: [DamageReportsService],
})
export class DamageReportsModule {}
