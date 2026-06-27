import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateRoomDto, UpdateRoomDto, AssignStudentDto, TransferStudentDto } from './dto/create-room.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Roles('MANAGER')
  @Get()
  async findAll(@Query('buildingId') buildingId?: string) {
    return this.roomsService.findAll(buildingId ? parseInt(buildingId, 10) : undefined);
  }

  @Roles('MANAGER')
  @Post()
  async create(@Body() body: CreateRoomDto) {
    return this.roomsService.create(body);
  }

  @Roles('MANAGER')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateRoomDto,
  ) {
    return this.roomsService.update(parseInt(id, 10), body);
  }

  @Roles('MANAGER')
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.roomsService.delete(parseInt(id, 10));
  }

  @Roles('MANAGER', 'STUDENT')
  @Get(':id/students')
  async getStudents(@Param('id') id: string) {
    return this.roomsService.getStudents(parseInt(id, 10));
  }

  @Roles('MANAGER')
  @Post(':id/students')
  async assignStudent(@Param('id') id: string, @Body() body: AssignStudentDto) {
    return this.roomsService.assignStudent(parseInt(id, 10), body.studentId);
  }

  @Roles('MANAGER')
  @Post(':id/transfer')
  async transferStudent(@Param('id') id: string, @Body() body: TransferStudentDto) {
    return this.roomsService.transferStudent(body.studentId, parseInt(id, 10));
  }

  @Roles('MANAGER')
  @Delete(':id/students/:studentId')
  async removeStudent(@Param('id') id: string, @Param('studentId') studentId: string) {
    return this.roomsService.removeStudent(parseInt(id, 10), parseInt(studentId, 10));
  }

  @Roles('MANAGER', 'STUDENT')
  @Get(':id/assets')
  async getAssets(@Param('id') id: string) {
    return this.roomsService.getAssets(parseInt(id, 10));
  }
}
