import { Module } from '@nestjs/common';
import { DamageReportsController } from './damage-reports.controller';
import { DamageReportsService } from './damage-reports.service';

@Module({
  controllers: [DamageReportsController],
  providers: [DamageReportsService],
  exports: [DamageReportsService],
})
export class DamageReportsModule {}
