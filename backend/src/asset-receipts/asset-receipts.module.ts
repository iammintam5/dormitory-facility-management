import { Module } from '@nestjs/common';
import { AssetReceiptsController } from './asset-receipts.controller';
import { AssetReceiptsService } from './asset-receipts.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AssetsModule } from '../assets/assets.module';

@Module({
  imports: [PrismaModule, AssetsModule],
  controllers: [AssetReceiptsController],
  providers: [AssetReceiptsService],
})
export class AssetReceiptsModule {}
