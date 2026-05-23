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
import { CompleteDamageReportDto } from './dto/complete-damage-report.dto';
import { CreateDamageReportDto } from './dto/create-damage-report.dto';
import { QueryDamageReportsDto } from './dto/query-damage-reports.dto';
import { UpdateDamageReportDto } from './dto/update-damage-report.dto';
import { WorkflowNoteDto } from './dto/workflow-note.dto';
import { DamageReportsService } from './damage-reports.service';

@Controller('damage-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DamageReportsController {
  constructor(private readonly damageReportsService: DamageReportsService) {}

  @Post()
  @Roles('STUDENT')
  create(@CurrentUser() currentUser: AuthUser, @Body() dto: CreateDamageReportDto) {
    return this.damageReportsService.create(currentUser, dto);
  }

  @Get()
  @Roles('ADMIN', 'QL_CSVC', 'STUDENT')
  findAll(@CurrentUser() currentUser: AuthUser, @Query() query: QueryDamageReportsDto) {
    return this.damageReportsService.findAll(currentUser, query);
  }

  @Get('my-assets')
  @Roles('STUDENT')
  findMyAssets(@CurrentUser() currentUser: AuthUser) {
    return this.damageReportsService.findMyAssets(currentUser);
  }

  @Get(':id')
  @Roles('ADMIN', 'QL_CSVC', 'STUDENT')
  findOne(@CurrentUser() currentUser: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.damageReportsService.findOne(currentUser, id);
  }

  @Get(':id/export')
  @Roles('ADMIN', 'QL_CSVC', 'STUDENT')
  exportData(@CurrentUser() currentUser: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.damageReportsService.exportData(currentUser, id);
  }

  @Patch(':id')
  @Roles('STUDENT')
  update(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDamageReportDto,
  ) {
    return this.damageReportsService.update(currentUser, id, dto);
  }

  @Post(':id/accept')
  @Roles('ADMIN', 'QL_CSVC')
  accept(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: WorkflowNoteDto,
  ) {
    return this.damageReportsService.accept(currentUser, id, dto);
  }

  @Post(':id/reject')
  @Roles('ADMIN', 'QL_CSVC')
  reject(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: WorkflowNoteDto,
  ) {
    return this.damageReportsService.reject(currentUser, id, dto);
  }

  @Post(':id/start-processing')
  @Roles('ADMIN', 'QL_CSVC')
  startProcessing(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: WorkflowNoteDto,
  ) {
    return this.damageReportsService.startProcessing(currentUser, id, dto);
  }

  @Post(':id/complete')
  @Roles('ADMIN', 'QL_CSVC')
  complete(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteDamageReportDto,
  ) {
    return this.damageReportsService.complete(currentUser, id, dto);
  }

  @Post(':id/cancel')
  @Roles('STUDENT')
  cancel(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: WorkflowNoteDto,
  ) {
    return this.damageReportsService.cancel(currentUser, id, dto);
  }
}
