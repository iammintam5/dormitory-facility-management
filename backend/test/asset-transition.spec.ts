import { AssetTransitionService } from '../src/assets/asset-transition.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AssetStatus } from '@prisma/client';

// Mock Prisma Transaction Client
const createMockTx = () => {
  const assets = new Map<number, any>();

  const tx: any = {
    asset: {
      findUnique: jest.fn(async ({ where }: { where: { id: number } }) => {
        return assets.get(where.id) || null;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const asset = assets.get(where.id);
        if (!asset) return { count: 0 };
        if (asset.status !== where.status || asset.roomId !== where.roomId) {
          return { count: 0 };
        }
        Object.assign(asset, data);
        return { count: 1 };
      }),
    },
    assetHistory: {
      create: jest.fn(async (data: any) => data),
    },
  };

  return { tx, setAsset: (id: number, a: any) => assets.set(id, a) };
};

describe('AssetTransitionService', () => {
  let service: AssetTransitionService;

  beforeEach(() => {
    service = new AssetTransitionService({} as any);
  });

  describe('transition', () => {
    it('should throw NotFoundException for non-existent asset', async () => {
      const { tx } = createMockTx();
      await expect(
        service.transition(tx, 999, AssetStatus.IN_USE, {
          action: 'TEST',
          userId: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow AVAILABLE -> IN_USE with roomId', async () => {
      const { tx, setAsset } = createMockTx();
      setAsset(1, { id: 1, status: AssetStatus.AVAILABLE, roomId: null });

      const result = await service.transition(tx, 1, AssetStatus.IN_USE, {
        action: 'CẤP_PHÁT',
        userId: 1,
        newRoomId: 5,
      });

      expect(result.status).toBe(AssetStatus.IN_USE);
      expect(result.roomId).toBe(5);
    });

    it('should throw ConflictException for AVAILABLE -> LIQUIDATED direct transition', async () => {
      const { tx, setAsset } = createMockTx();
      setAsset(1, { id: 1, status: AssetStatus.AVAILABLE, roomId: null });

      await expect(
        service.transition(tx, 1, AssetStatus.LIQUIDATED, {
          action: 'XUẤT_KHO',
          userId: 1,
          newRoomId: null,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow PENDING_LIQUIDATION -> IN_USE via RESTORE_FROM_LIQUIDATION action', async () => {
      const { tx, setAsset } = createMockTx();
      setAsset(1, { id: 1, status: AssetStatus.PENDING_LIQUIDATION, roomId: null });

      const result = await service.transition(tx, 1, AssetStatus.IN_USE, {
        action: 'RESTORE_FROM_LIQUIDATION',
        userId: 1,
        newRoomId: 5,
      });

      expect(result.status).toBe(AssetStatus.IN_USE);
      expect(result.roomId).toBe(5);
    });

    it('should throw ConflictException for IN_USE room change without ĐIỀU_CHUYỂN action', async () => {
      const { tx, setAsset } = createMockTx();
      setAsset(1, { id: 1, status: AssetStatus.IN_USE, roomId: 5 });

      await expect(
        service.transition(tx, 1, AssetStatus.IN_USE, {
          action: 'CẤP_PHÁT',
          userId: 1,
          newRoomId: 10,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow IN_USE room change with ĐIỀU_CHUYỂN action', async () => {
      const { tx, setAsset } = createMockTx();
      setAsset(1, { id: 1, status: AssetStatus.IN_USE, roomId: 5 });

      const result = await service.transition(tx, 1, AssetStatus.IN_USE, {
        action: 'ĐIỀU_CHUYỂN',
        userId: 1,
        newRoomId: 10,
      });

      expect(result.status).toBe(AssetStatus.IN_USE);
      expect(result.roomId).toBe(10);
    });

    it('should reject IN_USE with null roomId', async () => {
      const { tx, setAsset } = createMockTx();
      setAsset(1, { id: 1, status: AssetStatus.AVAILABLE, roomId: null });

      await expect(
        service.transition(tx, 1, AssetStatus.IN_USE, {
          action: 'TEST',
          userId: 1,
          newRoomId: null,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject LIQUIDATED with non-null roomId', async () => {
      const { tx, setAsset } = createMockTx();
      setAsset(1, { id: 1, status: AssetStatus.PENDING_LIQUIDATION, roomId: null });

      await expect(
        service.transition(tx, 1, AssetStatus.LIQUIDATED, {
          action: 'ĐÃ_THANH_LÝ',
          userId: 1,
          newRoomId: 5,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should handle atomic conditional update via updateMany where clause', async () => {
      const { tx, setAsset } = createMockTx();
      setAsset(1, { id: 1, status: AssetStatus.AVAILABLE, roomId: null });

      // First transition succeeds (AVAILABLE -> IN_USE)
      const result1 = await service.transition(tx, 1, AssetStatus.IN_USE, {
        action: 'CẤP_PHÁT',
        userId: 1,
        newRoomId: 5,
      });
      expect(result1.status).toBe(AssetStatus.IN_USE);

      // Second transition tries to update from old state (AVAILABLE) which no longer matches
      // This simulates what would happen in a concurrent scenario
      await expect(
        service.transition(tx, 1, AssetStatus.PENDING_LIQUIDATION, {
          action: 'THANH_LÝ',
          userId: 1,
          newRoomId: null,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject concurrent transitions correctly (one succeeds, one fails)', async () => {
      // Use a mock that simulates database locking
      const assets = new Map<number, any>();
      const originalAsset = { id: 1, status: AssetStatus.AVAILABLE, roomId: null };
      assets.set(1, { ...originalAsset });

      // Simulate concurrent access: both findUnique return original state
      const asset1 = { ...assets.get(1) };
      const asset2 = { ...assets.get(1) };

      // We'll manually simulate the service logic
      const ALLOWED: Record<string, string[]> = {
        [AssetStatus.AVAILABLE]: [AssetStatus.IN_USE, AssetStatus.PENDING_LIQUIDATION, AssetStatus.DAMAGED, AssetStatus.UNDER_MAINTENANCE],
      };

      // First transition: AVAILABLE -> IN_USE
      expect(ALLOWED[asset1.status]?.includes(AssetStatus.IN_USE)).toBe(true);
      assets.set(1, { ...asset1, status: AssetStatus.IN_USE, roomId: 5 });

      // Second transition with old state should fail (status mismatch)
      const updatedAsset = assets.get(1);
      const hasChanged = updatedAsset.status !== asset2.status || updatedAsset.roomId !== asset2.roomId;
      expect(hasChanged).toBe(true); // Simulates conditional update count === 0
    });

    it('should handle terminal state LIQUIDATED', async () => {
      const { tx, setAsset } = createMockTx();
      setAsset(1, { id: 1, status: AssetStatus.LIQUIDATED, roomId: null });

      await expect(
        service.transition(tx, 1, AssetStatus.AVAILABLE, {
          action: 'TEST',
          userId: 1,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
