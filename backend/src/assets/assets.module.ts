import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { AssetTransitionService } from './asset-transition.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [AssetsController],
  providers: [AssetsService, AssetTransitionService],
  exports: [AssetsService, AssetTransitionService],
})
export class AssetsModule {}
