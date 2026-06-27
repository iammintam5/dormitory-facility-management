import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReceiptType, AssetStatus } from '@prisma/client';
import { generateCode } from '../common/utils/code-generator';
import { AssetTransitionService } from '../assets/asset-transition.service';

@Injectable()
export class AssetReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetTransitionService: AssetTransitionService
  ) {}

  async createImportReceipt(payload: any, userId: number) {
    const {
      receiptDate,
      supplierName,
      supplierAddress,
      supplierPhone,
      contractNumber,
      documentNumber,
      note,
      totalAmount,
      roomId, // default room for the imported items
      items,
    } = payload;

    // Generate receiptCode
    const receiptCode = generateCode('IMP');

    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        // 1. Create Receipt
        const receipt = await prisma.assetReceipt.create({
          data: {
            receiptCode,
            type: ReceiptType.IMPORT,
            receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
            supplierName,
            supplierAddress,
            supplierPhone,
            contractNumber,
            documentNumber,
            totalAmount: totalAmount ? totalAmount : null,
            note,
            createdBy: userId,
          },
        });

        // 2. Pre-validate all generated codes
        const codesToCheck: string[] = [];
        for (const item of items) {
          const qty = item.qty || 1;
          const prefix = item.assetCode.replace(/\d+$/g, '') || 'IMP';
          const startMatch = item.assetCode.match(/\d+$/);
          const startNum = startMatch ? parseInt(startMatch[0], 10) : 1;
          for (let i = 0; i < qty; i++) {
            codesToCheck.push(`${prefix}${String(startNum + i).padStart(2, '0')}`);
          }
        }
        
        const existingAssets = await prisma.asset.findMany({
          where: { assetCode: { in: codesToCheck } },
          select: { assetCode: true }
        });
        
        if (existingAssets.length > 0) {
          const duplicateCodes = existingAssets.map(a => a.assetCode).join(', ');
          throw new BadRequestException(`Mã thiết bị đã tồn tại trong kho: ${duplicateCodes}`);
        }

        // 3. Process Items
        const currentYear = new Date().getFullYear();
        for (const item of items) {
          const qty = item.qty || 1;
          const categoryId = parseInt(item.categoryId, 10);
          
          // Generate prefix from assetCode
          const prefix = item.assetCode.replace(/\d+$/g, '') || 'IMP';
          const startMatch = item.assetCode.match(/\d+$/);
          const startNum = startMatch ? parseInt(startMatch[0], 10) : 1;

          for (let i = 0; i < qty; i++) {
            const code = `${prefix}${String(startNum + i).padStart(2, '0')}`;
            
            // Create Asset
            const asset = await prisma.asset.create({
              data: {
                assetCode: code,
                assetName: qty > 1 ? `${item.assetName} ${code}` : item.assetName,
                categoryId,
                roomId: null,
                status: 'AVAILABLE',
                description: item.note ?? null,
                yearInUse: currentYear,
              }
            });

            // Create Receipt Item mapping 1:1 to Asset
            await prisma.assetReceiptItem.create({
              data: {
                receiptId: receipt.id,
                assetId: asset.id,
                quantity: 1,
                unitPrice: item.unitPrice ? item.unitPrice : null,
                warrantyMonths: item.warranty ? parseInt(item.warranty, 10) : 0,
                note: item.note ?? null,
              },
            });

            // Create Asset History
            await prisma.assetHistory.create({
              data: {
                assetId: asset.id,
                action: 'NHẬP_KHO',
                newStatus: 'AVAILABLE',
                newRoomId: null,
                note: `Nhập mới từ phiếu ${receiptCode}`,
              }
            });
          }
        }
        return receipt;
      });
      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error(error);
      throw new InternalServerErrorException('Failed to create import receipt');
    }
  }

  async createHandoverReceipt(payload: any, userId: number) {
    const { targetRoomId, assetIds, note, receiptDate } = payload;
    const receiptCode = generateCode('CP');

    return this.prisma.$transaction(async (prisma) => {
      const receipt = await prisma.assetReceipt.create({
        data: {
          receiptCode,
          type: ReceiptType.HANDOVER,
          receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
          note,
          createdBy: userId,
        },
      });

      const uniqueAssetIds = [...new Set(assetIds.map((id: any) => parseInt(id, 10)))] as number[];

      for (const assetId of uniqueAssetIds) {
        await this.assetTransitionService.transition(prisma, assetId, AssetStatus.IN_USE, {
          action: 'CẤP_PHÁT',
          userId,
          newRoomId: parseInt(targetRoomId, 10),
          note: `Cấp phát theo phiếu ${receiptCode}`,
        });

        await prisma.assetReceiptItem.create({
          data: {
            receiptId: receipt.id,
            assetId,
            quantity: 1,
            note: 'Cấp phát',
          },
        });
      }
      return receipt;
    });
  }

  async createReclaimReceipt(payload: any, userId: number) {
    const { fromRoomId, assetIds, note, receiptDate } = payload;
    const receiptCode = generateCode('TH');

    return this.prisma.$transaction(async (prisma) => {
      const receipt = await prisma.assetReceipt.create({
        data: {
          receiptCode,
          type: ReceiptType.RECLAIM,
          receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
          note,
          createdBy: userId,
        },
      });

      const uniqueAssetIds = [...new Set(assetIds.map((id: any) => parseInt(id, 10)))] as number[];

      for (const assetId of uniqueAssetIds) {
        // Find asset to ensure it belongs to fromRoomId
        const asset = await prisma.asset.findUnique({ where: { id: assetId } });
        if (!asset || asset.roomId !== parseInt(fromRoomId, 10)) {
          throw new BadRequestException(`Tài sản ID ${assetId} không thuộc phòng ID ${fromRoomId}`);
        }

        // Keep current status if it's DAMAGED or UNDER_MAINTENANCE.
        // If IN_USE, revert to AVAILABLE.
        const nextStatus = (asset.status === AssetStatus.DAMAGED || asset.status === AssetStatus.UNDER_MAINTENANCE) 
          ? asset.status 
          : AssetStatus.AVAILABLE;

        await this.assetTransitionService.transition(prisma, assetId, nextStatus, {
          action: 'THU_HỒI',
          userId,
          newRoomId: null, // Return to stock
          note: `Thu hồi theo phiếu ${receiptCode}`,
        });

        await prisma.assetReceiptItem.create({
          data: {
            receiptId: receipt.id,
            assetId,
            quantity: 1,
            note: 'Thu hồi',
          },
        });
      }
      return receipt;
    });
  }

  async createExportReceipt(payload: any, userId: number) {
    const {
      exportDate,
      reason,
      recipient,
      contactPhone,
      contractNumber,
      note,
      generalNote,
      items,
    } = payload;

    const receiptCode = generateCode('XX');

    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        // 1. Create Export Receipt
        const receipt = await prisma.assetReceipt.create({
          data: {
            receiptCode,
            type: ReceiptType.EXPORT,
            receiptDate: exportDate ? new Date(exportDate) : new Date(),
            supplierName: recipient, // Reuse field
            supplierPhone: contactPhone, // Reuse field
            contractNumber: contractNumber,
            note: generalNote,
            createdBy: userId,
          },
        });

        // 2. Process Items
        const uniqueItems = Array.from(new Map(items.map((item: any) => [parseInt(item.id, 10), item])).values()) as any[];

        for (const item of uniqueItems) {
          const assetId = parseInt(item.id, 10);
          
          // Use Transition Service. It expects AVAILABLE or PENDING_LIQUIDATION to transition to LIQUIDATED
          await this.assetTransitionService.transition(prisma, assetId, AssetStatus.LIQUIDATED, {
            action: 'XUẤT_KHO',
            userId,
            newRoomId: null,
            note: `Xuất thiết bị theo phiếu ${receiptCode}. Lý do: ${reason}`,
          });

          // Create Receipt Item
          await prisma.assetReceiptItem.create({
            data: {
              receiptId: receipt.id,
              assetId: assetId,
              quantity: item.qty || 1,
              note: item.note || reason,
            },
          });
        }
        return receipt;
      });
      return result;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Failed to create export receipt');
    }
  }

  async findAll(query: any) {
    return this.prisma.assetReceipt.findMany({
      include: { creator: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.assetReceipt.findUnique({
      where: { id },
      include: {
        items: { include: { asset: { include: { category: true, room: true } } } },
        creator: { select: { fullName: true } },
      },
    });
  }
}
