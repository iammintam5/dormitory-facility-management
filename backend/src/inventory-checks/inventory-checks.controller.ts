import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InventoryChecksService } from './inventory-checks.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateInventoryCheckDto, UpdateInventoryCheckDto, SaveInventoryItemsDto, CompleteInventoryCheckDto } from './dto/inventory-check.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory-checks')
export class InventoryChecksController {
  constructor(private readonly service: InventoryChecksService) {}

  @Roles('MANAGER')
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

  @Roles('MANAGER')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(parseInt(id, 10));
  }

  @Roles('MANAGER')
  @Post()
  async create(
    @CurrentUser('sub') userId: number,
    @Body() body: CreateInventoryCheckDto,
  ) {
    return this.service.create(userId, body);
  }

  @Roles('MANAGER')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateInventoryCheckDto,
  ) {
    return this.service.update(parseInt(id, 10), body);
  }

  @Roles('MANAGER')
  @Post(':id/items')
  async saveItems(
    @Param('id') id: string,
    @Body() body: SaveInventoryItemsDto,
  ) {
    return this.service.saveItems(parseInt(id, 10), body.items);
  }

  @Roles('MANAGER')
  @Post(':id/complete')
  async complete(
    @Param('id') id: string,
    @Body() body: CompleteInventoryCheckDto,
  ) {
    return this.service.complete(parseInt(id, 10), body.generalNote);
  }

  @Roles('MANAGER')
  @Get(':id/export')
  async export(@Param('id') id: string) {
    return this.service.exportData(parseInt(id, 10));
  }
}
