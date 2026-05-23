import { Module } from '@nestjs/common';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AssetCategoriesModule } from './asset-categories/asset-categories.module';
import { AssetsModule } from './assets/assets.module';
import { ConfigModule } from '@nestjs/config';
import { DamageReportsModule } from './damage-reports/damage-reports.module';
import { HandoversModule } from './handovers/handovers.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { LocationsModule } from './locations/locations.module';
import { InventoryChecksModule } from './inventory-checks/inventory-checks.module';
import { LiquidationRecordsModule } from './liquidation-records/liquidation-records.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReportsModule } from './reports/reports.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    NotificationsModule,
    AuditLogsModule,
    ReportsModule,
    DamageReportsModule,
    HandoversModule,
    InventoryChecksModule,
    LiquidationRecordsModule,
    MaintenanceModule,
    UsersModule,
    LocationsModule,
    AssetCategoriesModule,
    AssetsModule,
    HealthModule,
  ],
})
export class AppModule {}
