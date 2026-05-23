import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AssetCategoriesService } from './asset-categories.service';
import { CreateAssetCategoryDto } from './dto/create-asset-category.dto';
import { UpdateAssetCategoryDto } from './dto/update-asset-category.dto';

@Controller('asset-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'QL_CSVC')
export class AssetCategoriesController {
  constructor(private readonly assetCategoriesService: AssetCategoriesService) {}

  @Post()
  create(@Body() dto: CreateAssetCategoryDto) {
    return this.assetCategoriesService.create(dto);
  }

  @Get()
  findAll() {
    return this.assetCategoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.assetCategoriesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAssetCategoryDto) {
    return this.assetCategoriesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.assetCategoriesService.remove(id);
  }
}
