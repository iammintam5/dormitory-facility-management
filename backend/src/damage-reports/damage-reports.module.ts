import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DamageReportsController } from './damage-reports.controller';
import { DamageReportsService } from './damage-reports.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DamageReportsController],
  providers: [DamageReportsService],
})
export class DamageReportsModule {}
