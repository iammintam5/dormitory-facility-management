import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthUser } from '../auth/types/auth-user.type';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { BulkCreateAssetDto } from './dto/bulk-create-asset.dto';
import { QueryAssetsDto } from './dto/query-assets.dto';
import { UpdateAssetStatusDto } from './dto/update-asset-status.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { BulkActionDto, BulkUpdateStatusDto, BulkUpdateRoomDto } from './dto/bulk-action.dto';

@Controller('assets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'QL_CSVC')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  create(@CurrentUser() currentUser: AuthUser, @Body() dto: CreateAssetDto) {
    return this.assetsService.create(currentUser, dto);
  }

  @Post('bulk')
  bulkCreate(@CurrentUser() currentUser: AuthUser, @Body() dto: BulkCreateAssetDto) {
    return this.assetsService.bulkCreate(currentUser, dto);
  }

  @Delete('bulk')
  bulkDelete(@Body() dto: BulkActionDto) {
    return this.assetsService.bulkDelete(dto);
  }

  @Patch('bulk/status')
  bulkUpdateStatus(@Body() dto: BulkUpdateStatusDto) {
    return this.assetsService.bulkUpdateStatus(dto);
  }

  @Patch('bulk/room')
  bulkUpdateRoom(@Body() dto: BulkUpdateRoomDto) {
    return this.assetsService.bulkUpdateRoom(dto);
  }

  @Get()
  findAll(@Query() query: QueryAssetsDto) {
    return this.assetsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.assetsService.findOne(id);
  }

  @Get(':id/history')
  getHistory(@Param('id', ParseIntPipe) id: number) {
    return this.assetsService.getHistory(id);
  }

  @Patch(':id')
  update(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetsService.update(currentUser, id, dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAssetStatusDto) {
    return this.assetsService.updateStatus(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.assetsService.remove(id);
  }
}
