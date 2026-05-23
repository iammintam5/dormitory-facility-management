import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { HandoversController } from './handovers.controller';
import { HandoversService } from './handovers.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [HandoversController],
  providers: [HandoversService],
})
export class HandoversModule {}
