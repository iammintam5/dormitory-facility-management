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
import { CreateHandoverDto } from './dto/create-handover.dto';
import { QueryHandoversDto } from './dto/query-handovers.dto';
import { UpdateHandoverDto } from './dto/update-handover.dto';
import { WorkflowNoteDto } from './dto/workflow-note.dto';
import { HandoversService } from './handovers.service';

@Controller('handovers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HandoversController {
  constructor(private readonly handoversService: HandoversService) {}

  @Post()
  @Roles('ADMIN', 'QL_CSVC')
  create(@CurrentUser() currentUser: AuthUser, @Body() dto: CreateHandoverDto) {
    return this.handoversService.create(currentUser, dto);
  }

  @Get()
  @Roles('ADMIN', 'QL_CSVC', 'STUDENT')
  findAll(@CurrentUser() currentUser: AuthUser, @Query() query: QueryHandoversDto) {
    return this.handoversService.findAll(currentUser, query);
  }

  @Get('room-students/:roomId')
  @Roles('ADMIN', 'QL_CSVC')
  findRoomStudents(@Param('roomId', ParseIntPipe) roomId: number) {
    return this.handoversService.findRoomStudents(roomId);
  }

  @Get('room-assets/:roomId')
  @Roles('ADMIN', 'QL_CSVC')
  findRoomAssets(@Param('roomId', ParseIntPipe) roomId: number) {
    return this.handoversService.findRoomAssets(roomId);
  }

  @Get(':id')
  @Roles('ADMIN', 'QL_CSVC', 'STUDENT')
  findOne(@CurrentUser() currentUser: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.handoversService.findOne(currentUser, id);
  }

  @Get(':id/export')
  @Roles('ADMIN', 'QL_CSVC', 'STUDENT')
  exportData(@CurrentUser() currentUser: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.handoversService.exportData(currentUser, id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'QL_CSVC')
  update(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHandoverDto,
  ) {
    return this.handoversService.update(currentUser, id, dto);
  }

  @Post(':id/send-confirmation')
  @Roles('ADMIN', 'QL_CSVC')
  sendConfirmation(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: WorkflowNoteDto,
  ) {
    return this.handoversService.sendConfirmation(currentUser, id, dto);
  }

  @Post(':id/confirm')
  @Roles('STUDENT')
  confirm(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: WorkflowNoteDto,
  ) {
    return this.handoversService.confirm(currentUser, id, dto);
  }

  @Post(':id/cancel')
  @Roles('ADMIN', 'QL_CSVC')
  cancel(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: WorkflowNoteDto,
  ) {
    return this.handoversService.cancel(currentUser, id, dto);
  }

  @Post(':id/mark-returned')
  @Roles('ADMIN', 'QL_CSVC')
  markReturned(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: WorkflowNoteDto,
  ) {
    return this.handoversService.markReturned(currentUser, id, dto);
  }
}
