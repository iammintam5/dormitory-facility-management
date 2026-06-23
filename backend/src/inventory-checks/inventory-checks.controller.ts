import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InventoryChecksService } from './inventory-checks.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('inventory-checks')
export class InventoryChecksController {
  constructor(private readonly service: InventoryChecksService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll({
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 10,
      status,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(parseInt(id, 10));
  }

  @Post()
  async create(
    @CurrentUser('sub') userId: number,
    @Body() body: {
      roomId: number;
      checkDate: string;
      generalNote?: string;
    },
  ) {
    return this.service.create(userId, body);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { checkDate?: string; generalNote?: string },
  ) {
    return this.service.update(parseInt(id, 10), body);
  }

  @Post(':id/items')
  async saveItems(
    @Param('id') id: string,
    @Body() body: { items: Array<{ itemId: number; actualQuantity: number; actualCondition?: string; note?: string }> },
  ) {
    return this.service.saveItems(parseInt(id, 10), body.items);
  }

  @Post(':id/complete')
  async complete(
    @Param('id') id: string,
    @Body() body: { generalNote?: string },
  ) {
    return this.service.complete(parseInt(id, 10), body.generalNote);
  }

  @Get(':id/export')
  async export(@Param('id') id: string) {
    return this.service.exportData(parseInt(id, 10));
  }
}
