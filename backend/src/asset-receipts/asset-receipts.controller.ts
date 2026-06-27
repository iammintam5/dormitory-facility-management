import { Controller, Post, Body, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AssetReceiptsService } from './asset-receipts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateImportReceiptDto } from './dto/create-import-receipt.dto';
import { CreateHandoverReceiptDto } from './dto/create-handover-receipt.dto';
import { CreateReclaimReceiptDto } from './dto/create-reclaim-receipt.dto';
import { CreateExportReceiptDto } from './dto/create-export-receipt.dto';

@Controller('asset-receipts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssetReceiptsController {
  constructor(private readonly assetReceiptsService: AssetReceiptsService) {}

  @Post()
  @Roles('MANAGER')
  create(@Body() payload: CreateImportReceiptDto, @CurrentUser('sub') userId: number) {
    return this.assetReceiptsService.createImportReceipt(payload, userId);
  }

  @Post('handover')
  @Roles('MANAGER')
  createHandover(@Body() payload: CreateHandoverReceiptDto, @CurrentUser('sub') userId: number) {
    return this.assetReceiptsService.createHandoverReceipt(payload, userId);
  }

  @Post('reclaim')
  @Roles('MANAGER')
  createReclaim(@Body() payload: CreateReclaimReceiptDto, @CurrentUser('sub') userId: number) {
    return this.assetReceiptsService.createReclaimReceipt(payload, userId);
  }

  @Post('export')
  @Roles('MANAGER')
  createExport(@Body() payload: CreateExportReceiptDto, @CurrentUser('sub') userId: number) {
    return this.assetReceiptsService.createExportReceipt(payload, userId);
  }

  @Get()
  @Roles('MANAGER')
  findAll(@Query() query: Record<string, string>) {
    return this.assetReceiptsService.findAll(query);
  }

  @Get(':id')
  @Roles('MANAGER')
  findOne(@Param('id') id: string) {
    return this.assetReceiptsService.findOne(+id);
  }
}
