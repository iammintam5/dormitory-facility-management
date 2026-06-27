import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  async findAll(@Query('buildingId') buildingId?: string) {
    return this.roomsService.findAll(buildingId ? parseInt(buildingId, 10) : undefined);
  }

  @Post()
  async create(@Body() body: { roomCode: string; floorId: number; capacity?: number; note?: string }) {
    return this.roomsService.create(body);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { roomCode?: string; capacity?: number; note?: string },
  ) {
    return this.roomsService.update(parseInt(id, 10), body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.roomsService.delete(parseInt(id, 10));
  }

  @Get(':id/students')
  async getStudents(@Param('id') id: string) {
    return this.roomsService.getStudents(parseInt(id, 10));
  }

  @Post(':id/students')
  async assignStudent(@Param('id') id: string, @Body() body: { studentId: number }) {
    return this.roomsService.assignStudent(parseInt(id, 10), body.studentId);
  }

  @Post(':id/transfer')
  async transferStudent(@Param('id') id: string, @Body() body: { studentId: number }) {
    return this.roomsService.transferStudent(body.studentId, parseInt(id, 10));
  }

  @Delete(':id/students/:studentId')
  async removeStudent(@Param('id') id: string, @Param('studentId') studentId: string) {
    return this.roomsService.removeStudent(parseInt(id, 10), parseInt(studentId, 10));
  }

  @Get(':id/assets')
  async getAssets(@Param('id') id: string) {
    return this.roomsService.getAssets(parseInt(id, 10));
  }
}
