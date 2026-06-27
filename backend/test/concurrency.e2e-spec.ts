import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

import { AssetTransitionService } from './../src/assets/asset-transition.service';
import { PrismaService } from './../src/prisma/prisma.service';
import { AssetStatus } from '@prisma/client';

describe('Concurrency (e2e)', () => {
  let app: INestApplication;
  let assetTransitionService: AssetTransitionService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    assetTransitionService = app.get<AssetTransitionService>(AssetTransitionService);
    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should handle concurrent asset transitions safely and throw ConflictException for race conditions', async () => {
    // 1. Setup a dummy asset
    const category = await prisma.assetCategory.findFirst();
    if (!category) return; // Skip if no DB seeded

    const asset = await prisma.asset.create({
      data: {
        assetCode: 'TEST-CONCURRENCY-' + Date.now(),
        assetName: 'Test Concurrency',
        categoryId: category.id,
        status: AssetStatus.AVAILABLE,
      }
    });

    // 2. Fire two transitions at the exact same time
    const p1 = prisma.$transaction(async (tx) => {
      return assetTransitionService.transition(tx, asset.id, AssetStatus.IN_USE, {
        action: 'CẤP_PHÁT',
        userId: 1,
        newRoomId: 1,
      });
    });

    const p2 = prisma.$transaction(async (tx) => {
      return assetTransitionService.transition(tx, asset.id, AssetStatus.UNDER_MAINTENANCE, {
        action: 'BẢO_TRÌ',
        userId: 1,
        newRoomId: null,
      });
    });

    // 3. One should succeed, one should fail with ConflictException
    const results = await Promise.allSettled([p1, p2]);
    
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect((rejected[0] as PromiseRejectedResult).reason.message).toContain('trạng thái');

    // Cleanup
    await prisma.asset.delete({ where: { id: asset.id } });
  });
});
