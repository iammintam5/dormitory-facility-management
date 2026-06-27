import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateAssetDto, UpdateAssetDto } from './dto/create-asset.dto';
import { BulkCreateAssetDto } from './dto/bulk-create-asset.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Roles('MANAGER')
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('categoryId') categoryId?: string,
    @Query('buildingId') buildingId?: string,
    @Query('roomId') roomId?: string,
    @Query('status') status?: string,
  ) {
    return this.assetsService.findAll({
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 10,
      keyword,
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
      buildingId: buildingId ? parseInt(buildingId, 10) : undefined,
      roomId: roomId ? parseInt(roomId, 10) : undefined,
      status,
    });
  }

  @Roles('MANAGER')
  @Post()
  async create(@Body() body: CreateAssetDto, @CurrentUser('sub') userId: number) {
    return this.assetsService.create(body, userId);
  }

  @Roles('MANAGER')
  @Post('bulk')
  async bulkCreate(@Body() body: BulkCreateAssetDto, @CurrentUser('sub') userId: number) {
    return this.assetsService.bulkCreate(body, userId);
  }

  @Roles('MANAGER')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateAssetDto, @CurrentUser('sub') userId: number) {
    return this.assetsService.update(parseInt(id, 10), body, userId);
  }

  @Roles('MANAGER')
  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser('sub') userId: number) {
    return this.assetsService.delete(parseInt(id, 10), userId);
  }

  @Roles('MANAGER')
  @Get(':id/history')
  async getHistory(@Param('id') id: string) {
    return this.assetsService.getHistory(parseInt(id, 10));
  }
}
