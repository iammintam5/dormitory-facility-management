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

  // Centralized Matrix
  private readonly ALLOWED_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
    [AssetStatus.AVAILABLE]: [AssetStatus.IN_USE, AssetStatus.PENDING_LIQUIDATION, AssetStatus.DAMAGED, AssetStatus.UNDER_MAINTENANCE],
    [AssetStatus.IN_USE]: [AssetStatus.AVAILABLE, AssetStatus.DAMAGED, AssetStatus.UNDER_MAINTENANCE],
    [AssetStatus.UNDER_MAINTENANCE]: [AssetStatus.AVAILABLE, AssetStatus.IN_USE, AssetStatus.DAMAGED, AssetStatus.PENDING_LIQUIDATION],
    [AssetStatus.DAMAGED]: [AssetStatus.AVAILABLE, AssetStatus.UNDER_MAINTENANCE, AssetStatus.PENDING_LIQUIDATION],
    [AssetStatus.PENDING_LIQUIDATION]: [AssetStatus.LIQUIDATED, AssetStatus.AVAILABLE],
    [AssetStatus.LIQUIDATED]: [], // Terminal state
  };

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

    // Update asset
    const updatedAsset = await tx.asset.update({
      where: { id: assetId },
      data: {
        status: newStatus,
        roomId: targetRoomId,
      },
    });

    // Write history
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
        },
      });
    }

    return updatedAsset;
  }
}
