import { Module } from '@nestjs/common';
import { AssetReceiptsController } from './asset-receipts.controller';
import { AssetReceiptsService } from './asset-receipts.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AssetReceiptsController],
  providers: [AssetReceiptsService],
})
export class AssetReceiptsModule {}
