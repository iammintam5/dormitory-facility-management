import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfilesModule } from './profiles/profiles.module';
import { AssetCategoriesModule } from './asset-categories/asset-categories.module';
import { AssetsModule } from './assets/assets.module';
import { LocationsModule } from './locations/locations.module';
import { RoomsModule } from './rooms/rooms.module';
import { DamageReportsModule } from './damage-reports/damage-reports.module';
import { MaintenanceModule } from './maintenance/maintenance.module';

import { LiquidationRecordsModule } from './liquidation-records/liquidation-records.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { ReportsModule } from './reports/reports.module';
import { AssetReceiptsModule } from './asset-receipts/asset-receipts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ProfilesModule,
    AssetCategoriesModule,
    AssetsModule,
    LocationsModule,
    RoomsModule,
    DamageReportsModule,
    MaintenanceModule,

    LiquidationRecordsModule,
    NotificationsModule,
    AuditLogsModule,
    ReportsModule,
    AssetReceiptsModule,
  ],
})
export class AppModule {}
