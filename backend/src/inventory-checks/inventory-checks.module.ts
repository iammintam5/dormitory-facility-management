import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryChecksController } from './inventory-checks.controller';
import { InventoryChecksService } from './inventory-checks.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [InventoryChecksController],
  providers: [InventoryChecksService],
})
export class InventoryChecksModule {}
