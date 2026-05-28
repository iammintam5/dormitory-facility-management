import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthUser } from '../auth/types/auth-user.type';
import { CompleteInventoryCheckDto } from './dto/complete-inventory-check.dto';
import { CreateDamageReportFromItemDto } from './dto/create-damage-report-from-item.dto';
import { CreateInventoryCheckDto } from './dto/create-inventory-check.dto';
import { CreateMaintenancePlanFromItemDto } from './dto/create-maintenance-plan-from-item.dto';
import { CreateMaintenanceRecordFromItemDto } from './dto/create-maintenance-record-from-item.dto';
import { QueryInventoryChecksDto } from './dto/query-inventory-checks.dto';
import { UpdateInventoryCheckResultsDto } from './dto/update-inventory-check-results.dto';
import { UpdateCouncilDto } from './dto/update-council.dto';
import { InventoryChecksService } from './inventory-checks.service';

@Controller('inventory-checks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryChecksController {
  constructor(private readonly inventoryChecksService: InventoryChecksService) {}

  @Post('from-room')
  @Roles('ADMIN', 'QL_CSVC')
  createFromRoom(@CurrentUser() currentUser: AuthUser, @Body() dto: CreateInventoryCheckDto) {
    return this.inventoryChecksService.createFromRoom(currentUser, dto);
  }

  @Get()
  @Roles('ADMIN', 'QL_CSVC')
  findAll(@CurrentUser() currentUser: AuthUser, @Query() query: QueryInventoryChecksDto) {
    return this.inventoryChecksService.findAll(currentUser, query);
  }

  @Get(':id/export')
  @Roles('ADMIN', 'QL_CSVC')
  exportData(@CurrentUser() currentUser: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.inventoryChecksService.exportData(currentUser, id);
  }

  @Get(':id')
  @Roles('ADMIN', 'QL_CSVC')
  findOne(@CurrentUser() currentUser: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.inventoryChecksService.findOne(currentUser, id);
  }

  @Patch(':id/results')
  @Roles('ADMIN', 'QL_CSVC')
  updateResults(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInventoryCheckResultsDto,
  ) {
    return this.inventoryChecksService.updateResults(currentUser, id, dto);
  }

  @Post(':id/council')
  @Roles('ADMIN', 'QL_CSVC')
  updateCouncil(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCouncilDto,
  ) {
    return this.inventoryChecksService.updateCouncil(currentUser, id, dto);
  }

  @Post(':id/complete')
  @Roles('ADMIN', 'QL_CSVC')
  complete(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteInventoryCheckDto,
  ) {
    return this.inventoryChecksService.complete(currentUser, id, dto);
  }

  @Post(':id/items/:itemId/create-damage-report')
  @Roles('ADMIN', 'QL_CSVC')
  createDamageReportFromItem(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: CreateDamageReportFromItemDto,
  ) {
    return this.inventoryChecksService.createDamageReportFromItem(currentUser, id, itemId, dto);
  }

  @Post(':id/items/:itemId/create-maintenance-record')
  @Roles('ADMIN', 'QL_CSVC')
  createMaintenanceRecordFromItem(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: CreateMaintenanceRecordFromItemDto,
  ) {
    return this.inventoryChecksService.createMaintenanceRecordFromItem(
      currentUser,
      id,
      itemId,
      dto,
    );
  }

  @Post(':id/items/:itemId/create-maintenance-plan')
  @Roles('ADMIN', 'QL_CSVC')
  createMaintenancePlanFromItem(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: CreateMaintenancePlanFromItemDto,
  ) {
    return this.inventoryChecksService.createMaintenancePlanFromItem(currentUser, id, itemId, dto);
  }
}
