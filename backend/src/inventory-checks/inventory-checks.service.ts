import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateCode } from '../common/utils/code-generator';

@Injectable()
export class InventoryChecksService {
  constructor(private readonly prisma: PrismaService) {}

  async update(id: number, body: { checkDate?: string; generalNote?: string }) {
    const record = await this.prisma.inventoryCheck.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Inventory check not found');
    if (record.status !== 'DRAFT') throw new BadRequestException('Cannot update a completed inventory check');

    const updated = await this.prisma.inventoryCheck.update({
      where: { id },
      data: {
        ...(body.checkDate !== undefined && { checkDate: new Date(body.checkDate) }),
        ...(body.generalNote !== undefined && { generalNote: body.generalNote }),
      },
      include: {
        room: { include: { floor: { include: { building: true } } } },
        checker: true,
        inventoryCheckItems: { include: { asset: { include: { category: true, room: true } } } },
        councilMembers: { include: { user: true } },
      },
    });
    return this.mapRecord(updated);
  }

  async findAll(params: { page: number; pageSize: number; status?: string }) {
    const { page, pageSize, status } = params;
    const where: any = {};
    if (status) where.status = status;

    const [total, records] = await Promise.all([
      this.prisma.inventoryCheck.count({ where }),
      this.prisma.inventoryCheck.findMany({
        where,
        include: {
          room: { include: { floor: { include: { building: true } } } },
          checker: true,
          inventoryCheckItems: { include: { asset: { include: { category: true } } } },
          councilMembers: { include: { user: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = records.map((r) => this.mapRecord(r));

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async findOne(id: number) {
    const record = await this.prisma.inventoryCheck.findUnique({
      where: { id },
      include: {
        room: { include: { floor: { include: { building: true } } } },
        checker: true,
        inventoryCheckItems: { include: { asset: { include: { category: true, room: true } } } },
        councilMembers: { include: { user: true } },
      },
    });
    if (!record) throw new NotFoundException('Inventory check not found');
    return this.mapRecord(record);
  }

  private mapRecord(r: any) {
    return {
      id: r.id,
      inventoryCode: r.inventoryCode,
      roomId: r.roomId,
      checkedBy: r.checkedBy,
      checkDate: r.checkDate.toISOString().split('T')[0],
      status: r.status,
      generalNote: r.generalNote,
      completedAt: r.completedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt?.toISOString() ?? null,
      room: r.room,
      checkedByUser: r.checker,
      inventoryCheckItems: r.inventoryCheckItems,
      councilMembers: r.councilMembers,
    };
  }

  async create(
    userId: number,
    body: { roomId: number; checkDate: string; generalNote?: string },
  ) {
    const code = generateCode('KK-');

    const assets = await this.prisma.asset.findMany({ where: { roomId: body.roomId } });

    // Items created with isChecked=false – must be explicitly inspected before complete
    const record = await this.prisma.inventoryCheck.create({
      data: {
        inventoryCode: code,
        roomId: body.roomId,
        checkedBy: userId,
        checkDate: new Date(body.checkDate),
        generalNote: body.generalNote ?? '',
        inventoryCheckItems: {
          create: assets.map((a) => ({
            assetId: a.id,
            systemQuantity: 1,
            actualQuantity: 1,
            difference: 0,
            isChecked: false,
          })),
        },
      },
      include: {
        room: { include: { floor: { include: { building: true } } } },
        checker: true,
        inventoryCheckItems: { include: { asset: { include: { category: true } } } },
      },
    });

    return this.mapRecord(record);
  }

  async saveItems(
    id: number,
    items: Array<{ itemId: number; actualQuantity: number; actualCondition?: string; note?: string }>,
  ) {
    // Pre-validate payload
    if (items.length === 0) {
      throw new BadRequestException('Danh sách item không được rỗng');
    }

    for (const item of items) {
      if (!Number.isInteger(item.actualQuantity)) {
        throw new BadRequestException(`Item ID ${item.itemId}: Số lượng thực tế phải là số nguyên`);
      }
      if (item.actualQuantity < 0) {
        throw new BadRequestException(`Item ID ${item.itemId}: Số lượng thực tế không được âm`);
      }
    }

    // Check for duplicate item IDs in payload
    const itemIds = items.map(i => i.itemId);
    if (new Set(itemIds).size !== itemIds.length) {
      throw new BadRequestException('Danh sách item không được chứa ID trùng lặp');
    }

    // ENTIRE operation inside transaction using tx client
    return this.prisma.$transaction(async (tx) => {
      // Read session status INSIDE tx
      const record = await tx.inventoryCheck.findUnique({ where: { id } });
      if (!record) throw new NotFoundException('Inventory check not found');

      if (record.status !== 'DRAFT') {
        throw new BadRequestException('Chỉ có thể cập nhật khi phiên kiểm kê ở trạng thái DRAFT');
      }

      // Validate all items belong to this session using tx
      const existingItems = await tx.inventoryCheckItem.findMany({
        where: { inventoryCheckId: id, id: { in: itemIds } },
        select: { id: true, systemQuantity: true },
      });

      if (existingItems.length !== itemIds.length) {
        const foundIds = existingItems.map(ei => ei.id);
        const missingIds = itemIds.filter(iid => !foundIds.includes(iid));
        throw new BadRequestException(`Item ID ${missingIds.join(', ')} không thuộc phiên kiểm kê này hoặc không tồn tại`);
      }

      // Get systemQuantity map
      const systemQuantityMap = new Map(existingItems.map(ei => [ei.id, ei.systemQuantity]));

      // Update all items atomically with isChecked = true
      for (const item of items) {
        const systemQuantity = systemQuantityMap.get(item.itemId) ?? 1;
        const difference = item.actualQuantity - systemQuantity;

        const updateResult = await tx.inventoryCheckItem.updateMany({
          where: { id: item.itemId, inventoryCheckId: id },
          data: {
            actualQuantity: item.actualQuantity,
            difference,
            actualCondition: item.actualCondition ?? null,
            note: item.note ?? null,
            isChecked: true,
          },
        });

        if (updateResult.count === 0) {
          throw new BadRequestException(`Item ID ${item.itemId} không thuộc phiên kiểm kê này hoặc không tồn tại`);
        }
      }

      // Fetch and return using tx
      const updated = await tx.inventoryCheck.findUnique({
        where: { id },
        include: {
          room: { include: { floor: { include: { building: true } } } },
          checker: true,
          inventoryCheckItems: { include: { asset: { include: { category: true, room: true } } } },
          councilMembers: { include: { user: true } },
        },
      });
      return this.mapRecord(updated);
    });
  }

  async complete(id: number, generalNote?: string) {
    // ENTIRE operation inside transaction
    return this.prisma.$transaction(async (tx) => {
      // Read session INSIDE tx
      const record = await tx.inventoryCheck.findUnique({
        where: { id },
        include: { inventoryCheckItems: true },
      });
      if (!record) throw new NotFoundException('Inventory check not found');

      if (record.status !== 'DRAFT') {
        throw new BadRequestException('Phiên kiểm kê đã hoàn tất hoặc không ở trạng thái DRAFT');
      }

      // Verify ALL items have been actually inspected
      const uncheckedItems = record.inventoryCheckItems.filter((item: any) => !item.isChecked);
      if (uncheckedItems.length > 0) {
        throw new BadRequestException(
          `Còn ${uncheckedItems.length} tài sản chưa được kiểm kê. Vui lòng kiểm tra tất cả trước khi hoàn tất.`
        );
      }

      // Conditional update to prevent double-complete
      const updateResult = await tx.inventoryCheck.updateMany({
        where: { id, status: 'DRAFT' },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          generalNote: generalNote ?? record.generalNote,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException('Xung đột trạng thái: Phiên kiểm kê đã bị thay đổi');
      }

      // Fetch and return using tx
      const updated = await tx.inventoryCheck.findUnique({
        where: { id },
        include: {
          room: { include: { floor: { include: { building: true } } } },
          checker: true,
          inventoryCheckItems: { include: { asset: { include: { category: true, room: true } } } },
          councilMembers: { include: { user: true } },
        },
      });
      return this.mapRecord(updated);
    });
  }

  async exportData(id: number) {
    const record = await this.findOne(id);
    return {
      ...record,
      printable: {
        title: 'Phiếu kiểm kê tài sản',
        generatedAt: new Date().toISOString(),
        roomLabel: record.room?.roomCode ?? '--',
        checkedByLabel: record.checkedByUser?.fullName ?? '--',
      },
    };
  }
}
