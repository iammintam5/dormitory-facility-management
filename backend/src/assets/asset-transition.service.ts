import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssetStatus, Prisma } from '@prisma/client';

export type TransitionContext = {
  action: string;
  userId: number;
  note?: string;
  newRoomId?: number | null;
  sourceTable?: string;
  sourceId?: number;
};

@Injectable()
export class AssetTransitionService {
  constructor(private readonly prisma: PrismaService) {}

  validateOperation(
    assetStatus: AssetStatus,
    operation: 'ALLOCATE' | 'RECLAIM' | 'TRANSFER' | 'EXPORT' | 'DELETE' | 'DAMAGE_REPORT' | 'MAINTENANCE' | 'LIQUIDATION'
  ) {
    if (assetStatus === AssetStatus.DAMAGED) {
      if (operation !== 'MAINTENANCE' && operation !== 'RECLAIM') {
        throw new ConflictException(`Không thể thực hiện nghiệp vụ ${operation} trên thiết bị đang bị hỏng (DAMAGED).`);
      }
    }
    if (assetStatus === AssetStatus.UNDER_MAINTENANCE) {
      throw new ConflictException(`Không thể thực hiện nghiệp vụ ${operation} trên thiết bị đang bảo trì (UNDER_MAINTENANCE).`);
    }
    if (assetStatus === AssetStatus.PENDING_LIQUIDATION) {
      if (operation !== 'LIQUIDATION' && operation !== 'EXPORT') {
        throw new ConflictException(`Không thể thực hiện nghiệp vụ ${operation} trên thiết bị đang chờ thanh lý (PENDING_LIQUIDATION).`);
      }
    }
    if (assetStatus === AssetStatus.LIQUIDATED) {
      throw new ConflictException(`Không thể thực hiện nghiệp vụ trên thiết bị đã thanh lý.`);
    }
  }

  // Centralized Matrix - xuất kho/thanh lý được thực hiện qua phiếu xuất.
  private readonly ALLOWED_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
    [AssetStatus.AVAILABLE]: [AssetStatus.IN_USE, AssetStatus.PENDING_LIQUIDATION, AssetStatus.DAMAGED, AssetStatus.UNDER_MAINTENANCE, AssetStatus.LIQUIDATED],
    [AssetStatus.IN_USE]: [AssetStatus.AVAILABLE, AssetStatus.DAMAGED, AssetStatus.UNDER_MAINTENANCE],
    [AssetStatus.UNDER_MAINTENANCE]: [AssetStatus.AVAILABLE, AssetStatus.IN_USE, AssetStatus.DAMAGED, AssetStatus.PENDING_LIQUIDATION, AssetStatus.LIQUIDATED],
    [AssetStatus.DAMAGED]: [AssetStatus.AVAILABLE, AssetStatus.UNDER_MAINTENANCE, AssetStatus.PENDING_LIQUIDATION, AssetStatus.LIQUIDATED],
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

    if (context.action === 'ĐIỀU_CHUYỂN') {
      this.validateOperation(currentStatus, 'TRANSFER');
    } else if (context.action === 'CẤP_PHÁT') {
      this.validateOperation(currentStatus, 'ALLOCATE');
    } else if (context.action === 'THU_HỒI') {
      this.validateOperation(currentStatus, 'RECLAIM');
    }
    
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

    // LIQUIDATED chỉ đạt được qua phiếu xuất/thanh lý chính thức.
    if (newStatus === AssetStatus.LIQUIDATED && context.action !== 'ĐÃ_THANH_LÝ') {
      throw new ConflictException('Trạng thái LIQUIDATED chỉ có thể đạt được thông qua phiếu xuất/thanh lý.');
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
          sourceTable: context.sourceTable,
          sourceId: context.sourceId,
          assetId: asset.id,
          performedById: context.userId || null,
        },
      });
    }

    return updatedAsset;
  }
}
