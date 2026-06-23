import { Module } from '@nestjs/common';
import { LiquidationRecordsController } from './liquidation-records.controller';
import { LiquidationRecordsService } from './liquidation-records.service';

@Module({
  controllers: [LiquidationRecordsController],
  providers: [LiquidationRecordsService],
})
export class LiquidationRecordsModule {}
