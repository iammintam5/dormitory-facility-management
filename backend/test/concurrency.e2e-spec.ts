import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

import { AssetTransitionService } from '../src/assets/asset-transition.service';
import { PrismaService } from '../src/prisma/prisma.service';
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
    // 1. Setup - create category and asset for testing
    const category = await prisma.assetCategory.findFirst();
    if (!category) {
      console.warn('Skipping test - no asset category found in database. Seed the database first.');
      return;
    }

    const asset = await prisma.asset.create({
      data: {
        assetCode: 'TEST-CONCURRENCY-' + Date.now(),
        assetName: 'Test Concurrency Asset',
        categoryId: category.id,
        status: AssetStatus.AVAILABLE,
      }
    });

    // Create a room for allocation
    const floor = await prisma.floor.findFirst();
    const room = floor ? await prisma.room.create({
      data: {
        roomCode: 'TEST-ROOM-' + Date.now(),
        floorId: floor.id,
        capacity: 10,
      }
    }) : null;

    try {
      // 2. Fire two transitions at the exact same time
      const p1 = prisma.$transaction(async (tx) => {
        return assetTransitionService.transition(tx, asset.id, AssetStatus.IN_USE, {
          action: 'CẤP_PHÁT',
          userId: 1,
          newRoomId: room?.id ?? 1,
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
      
      // The rejected promise should contain ConflictException message
      const rejectedResult = rejected[0] as PromiseRejectedResult;
      expect(rejectedResult.reason.message).toContain('Xung đột');
    } finally {
      // Cleanup
      if (room) await prisma.room.delete({ where: { id: room.id } }).catch(() => {});
      await prisma.assetHistory.deleteMany({ where: { assetId: asset.id } });
      await prisma.asset.delete({ where: { id: asset.id } });
    }
  });

  it('should prevent duplicate allocation of the same asset', async () => {
    const category = await prisma.assetCategory.findFirst();
    if (!category) return;

    const asset = await prisma.asset.create({
      data: {
        assetCode: 'TEST-DUP-ALLOC-' + Date.now(),
        assetName: 'Test Duplicate Allocation',
        categoryId: category.id,
        status: AssetStatus.AVAILABLE,
      }
    });

    const floor = await prisma.floor.findFirst();
    const room1 = floor ? await prisma.room.create({
      data: { roomCode: 'TEST-ROOM1-' + Date.now(), floorId: floor.id, capacity: 10 }
    }) : null;

    try {
      // First allocation should succeed
      await prisma.$transaction(async (tx) => {
        return assetTransitionService.transition(tx, asset.id, AssetStatus.IN_USE, {
          action: 'CẤP_PHÁT',
          userId: 1,
          newRoomId: room1?.id ?? 1,
        });
      });

      // Second allocation to same room should fail
      await expect(
        prisma.$transaction(async (tx) => {
          return assetTransitionService.transition(tx, asset.id, AssetStatus.IN_USE, {
            action: 'CẤP_PHÁT',
            userId: 1,
            newRoomId: room1?.id ?? 1,
          });
        })
      ).rejects.toThrow();
    } finally {
      if (room1) await prisma.room.delete({ where: { id: room1.id } }).catch(() => {});
      await prisma.assetHistory.deleteMany({ where: { assetId: asset.id } });
      await prisma.asset.delete({ where: { id: asset.id } });
    }
  });
});
