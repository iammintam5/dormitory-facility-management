import { Controller, Post, Body, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AssetReceiptsService } from './asset-receipts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('asset-receipts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssetReceiptsController {
  constructor(private readonly assetReceiptsService: AssetReceiptsService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  create(@Body() payload: any, @CurrentUser() user: any) {
    return this.assetReceiptsService.createImportReceipt(payload, user.userId);
  }

  @Post('handover')
  @Roles('ADMIN', 'MANAGER')
  createHandover(@Body() payload: any, @CurrentUser() user: any) {
    return this.assetReceiptsService.createHandoverReceipt(payload, user.userId);
  }

  @Post('reclaim')
  @Roles('ADMIN', 'MANAGER')
  createReclaim(@Body() payload: any, @CurrentUser() user: any) {
    return this.assetReceiptsService.createReclaimReceipt(payload, user.userId);
  }

  @Post('export')
  @Roles('ADMIN', 'MANAGER')
  createExport(@Body() payload: any, @CurrentUser() user: any) {
    return this.assetReceiptsService.createExportReceipt(payload, user.userId);
  }

  @Get()
  @Roles('ADMIN', 'MANAGER')
  findAll(@Query() query: any) {
    return this.assetReceiptsService.findAll(query);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER')
  findOne(@Param('id') id: string) {
    return this.assetReceiptsService.findOne(+id);
  }
}
