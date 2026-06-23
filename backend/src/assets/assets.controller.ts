import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

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

  @Post()
  async create(@Body() body: any) {
    return this.assetsService.create(body);
  }

  @Post('bulk')
  async bulkCreate(@Body() body: any) {
    return this.assetsService.bulkCreate(body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.assetsService.update(parseInt(id, 10), body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.assetsService.delete(parseInt(id, 10));
  }

  @Get(':id/history')
  async getHistory(@Param('id') id: string) {
    return this.assetsService.getHistory(parseInt(id, 10));
  }
}
