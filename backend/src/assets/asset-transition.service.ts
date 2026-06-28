import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssetStatus, Prisma } from '@prisma/client';

export type TransitionContext = {
  action: string;
  userId: number;
  note?: string;
  newRoomId?: number | null;
};

@Injectable()
export class AssetTransitionService {
  constructor(private readonly prisma: PrismaService) {}

  // Centralized Matrix – LIQUIDATED chỉ đạt được qua COMPLETE_APPROVED_LIQUIDATION
  private readonly ALLOWED_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
    [AssetStatus.AVAILABLE]: [AssetStatus.IN_USE, AssetStatus.PENDING_LIQUIDATION, AssetStatus.DAMAGED, AssetStatus.UNDER_MAINTENANCE],
    [AssetStatus.IN_USE]: [AssetStatus.AVAILABLE, AssetStatus.DAMAGED, AssetStatus.UNDER_MAINTENANCE],
    [AssetStatus.UNDER_MAINTENANCE]: [AssetStatus.AVAILABLE, AssetStatus.IN_USE, AssetStatus.DAMAGED, AssetStatus.PENDING_LIQUIDATION],
    [AssetStatus.DAMAGED]: [AssetStatus.AVAILABLE, AssetStatus.UNDER_MAINTENANCE, AssetStatus.PENDING_LIQUIDATION],
    [AssetStatus.PENDING_LIQUIDATION]: [AssetStatus.LIQUIDATED, AssetStatus.AVAILABLE, AssetStatus.IN_USE, AssetStatus.DAMAGED, AssetStatus.UNDER_MAINTENANCE],
    [AssetStatus.LIQUIDATED]: [], // Terminal state
  };

  // Restore paths chỉ dùng cho liquidation reject/cancel
  private readonly RESTORE_ONLY_TARGETS = new Set<AssetStatus>([
    AssetStatus.IN_USE, AssetStatus.DAMAGED, AssetStatus.UNDER_MAINTENANCE,
  ]);

  async transition(
    tx: Prisma.TransactionClient,
    assetId: number,
    newStatus: AssetStatus,
    context: TransitionContext
  ) {
    const asset = await tx.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException(`Tài sản ID ${assetId} không tồn tại.`);

    const currentStatus = asset.status;
    
    // Check matrix
    if (currentStatus !== newStatus && !this.ALLOWED_TRANSITIONS[currentStatus].includes(newStatus)) {
      throw new ConflictException(`Không thể chuyển trạng thái tài sản từ ${currentStatus} sang ${newStatus}.`);
    }

    // Restore paths (PENDING_LIQUIDATION → IN_USE/DAMAGED/UNDER_MAINTENANCE) chỉ cho phép qua liquidation reject/cancel
    if (currentStatus === AssetStatus.PENDING_LIQUIDATION && this.RESTORE_ONLY_TARGETS.has(newStatus)) {
      if (context.action !== 'RESTORE_FROM_LIQUIDATION') {
        throw new ConflictException(`Chỉ có thể khôi phục trạng thái ${newStatus} từ PENDING_LIQUIDATION thông qua luồng thanh lý.`);
      }
    }

    // LIQUIDATED chỉ đạt được qua complete approved liquidation
    if (newStatus === AssetStatus.LIQUIDATED && context.action !== 'ĐÃ_THANH_LÝ') {
      throw new ConflictException('Trạng thái LIQUIDATED chỉ có thể đạt được thông qua hoàn tất hồ sơ thanh lý đã được duyệt.');
    }

    // Check Location Integrity
    let targetRoomId = context.newRoomId !== undefined ? context.newRoomId : asset.roomId;

    if (newStatus === AssetStatus.AVAILABLE || newStatus === AssetStatus.LIQUIDATED) {
      if (targetRoomId !== null) {
        throw new ConflictException(`Trạng thái ${newStatus} yêu cầu tài sản không nằm trong phòng (roomId phải là null).`);
      }
    }

    if (newStatus === AssetStatus.IN_USE && targetRoomId === null) {
      throw new ConflictException(`Trạng thái IN_USE yêu cầu tài sản phải thuộc về một phòng.`);
    }

    // Blocker 4: Prevent IN_USE -> IN_USE room change unless it's a TRANSFER
    if (currentStatus === AssetStatus.IN_USE && newStatus === AssetStatus.IN_USE && asset.roomId !== targetRoomId) {
      if (context.action !== 'ĐIỀU_CHUYỂN') {
        throw new ConflictException(`Không thể đổi phòng cho tài sản đang IN_USE mà không qua luồng ĐIỀU_CHUYỂN.`);
      }
    }

    // Update asset atomically
    const updateResult = await tx.asset.updateMany({
      where: { 
        id: assetId,
        status: currentStatus,
        roomId: asset.roomId,
      },
      data: {
        status: newStatus,
        roomId: targetRoomId,
      },
    });

    if (updateResult.count === 0) {
      throw new ConflictException(`Xung đột dữ liệu: Tài sản ID ${assetId} đã bị thay đổi bởi giao dịch khác.`);
    }

    const updatedAsset = { ...asset, status: newStatus, roomId: targetRoomId };

    // Write history with actor
    if (currentStatus !== newStatus || asset.roomId !== targetRoomId) {
      await tx.assetHistory.create({
        data: {
          action: context.action,
          oldStatus: currentStatus,
          newStatus: newStatus,
          oldRoomId: asset.roomId,
          newRoomId: targetRoomId,
          note: context.note,
          assetId: asset.id,
          performedById: context.userId || null,
        },
      });
    }

    return updatedAsset;
  }
}
