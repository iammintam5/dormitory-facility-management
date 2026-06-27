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
    const record = await this.prisma.inventoryCheck.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Inventory check not found');

    if (record.status !== 'DRAFT') {
      throw new BadRequestException('Chỉ có thể cập nhật khi phiên kiểm kê ở trạng thái DRAFT');
    }

    for (const item of items) {
      if (item.actualQuantity < 0) {
        throw new BadRequestException('Số lượng thực tế không được âm');
      }

      const updateResult = await this.prisma.inventoryCheckItem.updateMany({
        where: { id: item.itemId, inventoryCheckId: id },
        data: {
          actualQuantity: item.actualQuantity,
          difference: item.actualQuantity - 1,
          actualCondition: item.actualCondition ?? null,
          note: item.note ?? null,
        },
      });

      if (updateResult.count === 0) {
        throw new BadRequestException(`Item ID ${item.itemId} không thuộc phiên kiểm kê này hoặc không tồn tại`);
      }
    }

    return this.findOne(id);
  }

  async complete(id: number, generalNote?: string) {
    const record = await this.prisma.inventoryCheck.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Inventory check not found');

    if (record.status !== 'DRAFT') {
      throw new BadRequestException('Phiên kiểm kê đã hoàn tất hoặc không ở trạng thái DRAFT');
    }

    const updateResult = await this.prisma.inventoryCheck.updateMany({
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

    return this.findOne(id);
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
