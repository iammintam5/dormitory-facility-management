import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AssetCategoriesService } from './asset-categories.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('asset-categories')
export class AssetCategoriesController {
  constructor(private readonly service: AssetCategoriesService) {}

  @Get()
  async findAll() {
    return this.service.findAll();
  }

  @Post()
  async create(@Body() body: { code: string; name: string; description?: string | null; unit?: string | null }) {
    return this.service.create(body);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { code?: string; name?: string; description?: string | null; unit?: string | null },
  ) {
    return this.service.update(parseInt(id, 10), body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.service.delete(parseInt(id, 10));
  }
}
