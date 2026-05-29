import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth-user.type';
import { LiquidationRecordsService } from './liquidation-records.service';
import { QueryLiquidationRecordsDto } from './dto/query-liquidation-records.dto';
import { CreateLiquidationRecordDto } from './dto/create-liquidation-record.dto';
import { LiquidationWorkflowNoteDto } from './dto/liquidation-workflow-note.dto';
import { UpdateCouncilDto } from './dto/update-council.dto';

@Controller('liquidation-records')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'QL_CSVC')
export class LiquidationRecordsController {
  constructor(private readonly liquidationRecordsService: LiquidationRecordsService) {}

  @Get()
  findAll(@CurrentUser() currentUser: AuthUser, @Query() query: QueryLiquidationRecordsDto) {
    return this.liquidationRecordsService.findAll(currentUser, query);
  }

  @Post()
  create(@CurrentUser() currentUser: AuthUser, @Body() dto: CreateLiquidationRecordDto) {
    return this.liquidationRecordsService.create(currentUser, dto);
  }

  @Post(':id/council')
  updateCouncil(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCouncilDto,
  ) {
    return this.liquidationRecordsService.updateCouncil(currentUser, id, dto);
  }

  @Get('assets/:assetId/history')
  findAssetHistory(
    @CurrentUser() currentUser: AuthUser,
    @Param('assetId', ParseIntPipe) assetId: number,
  ) {
    return this.liquidationRecordsService.findAssetHistory(currentUser, assetId);
  }

  @Get(':id')
  findOne(@CurrentUser() currentUser: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.liquidationRecordsService.findOne(currentUser, id);
  }

  @Get(':id/export')
  exportRecord(@CurrentUser() currentUser: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.liquidationRecordsService.exportRecord(currentUser, id);
  }

  @Post(':id/submit-approval')
  submitForApproval(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LiquidationWorkflowNoteDto,
  ) {
    return this.liquidationRecordsService.submitForApproval(currentUser, id, dto);
  }

  @Post(':id/approve')
  @Roles('ADMIN')
  approve(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LiquidationWorkflowNoteDto,
  ) {
    return this.liquidationRecordsService.approve(currentUser, id, dto);
  }

  @Post(':id/reject')
  @Roles('ADMIN')
  reject(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LiquidationWorkflowNoteDto,
  ) {
    return this.liquidationRecordsService.reject(currentUser, id, dto);
  }

  @Post(':id/complete')
  @Roles('ADMIN')
  complete(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LiquidationWorkflowNoteDto,
  ) {
    return this.liquidationRecordsService.complete(currentUser, id, dto);
  }

  @Post(':id/cancel')
  cancel(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LiquidationWorkflowNoteDto,
  ) {
    return this.liquidationRecordsService.cancel(currentUser, id, dto);
  }
}
