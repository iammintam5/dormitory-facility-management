import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LiquidationRecordsController } from './liquidation-records.controller';
import { LiquidationRecordsService } from './liquidation-records.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [LiquidationRecordsController],
  providers: [LiquidationRecordsService],
})
export class LiquidationRecordsModule {}
