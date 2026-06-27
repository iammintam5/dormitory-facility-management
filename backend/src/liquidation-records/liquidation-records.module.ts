import { Module } from '@nestjs/common';
import { LiquidationRecordsController } from './liquidation-records.controller';
import { LiquidationRecordsService } from './liquidation-records.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AssetsModule } from '../assets/assets.module';

@Module({
  imports: [PrismaModule, AssetsModule],
  controllers: [LiquidationRecordsController],
  providers: [LiquidationRecordsService],
})
export class LiquidationRecordsModule {}
