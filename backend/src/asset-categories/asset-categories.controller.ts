import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AssetCategoriesService } from './asset-categories.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('asset-categories')
export class AssetCategoriesController {
  constructor(private readonly service: AssetCategoriesService) {}

  @Roles('MANAGER')
  @Get()
  async findAll() {
    return this.service.findAll();
  }

  @Roles('MANAGER')
  @Post()
  async create(@Body() body: { code: string; name: string; description?: string | null; unit?: string | null }) {
    return this.service.create(body);
  }

  @Roles('MANAGER')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { code?: string; name?: string; description?: string | null; unit?: string | null },
  ) {
    return this.service.update(parseInt(id, 10), body);
  }

  @Roles('MANAGER')
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.service.delete(parseInt(id, 10));
  }
}
