import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AssignStudentRoomDto } from './dto/assign-student-room.dto';
import { CreateDormBuildingDto } from './dto/create-dorm-building.dto';
import { CreateFloorDto } from './dto/create-floor.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateDormBuildingDto } from './dto/update-dorm-building.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { LocationsService } from './locations.service';

@Controller('locations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'QL_CSVC')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post('buildings')
  createDormBuilding(@Body() dto: CreateDormBuildingDto) {
    return this.locationsService.createDormBuilding(dto);
  }

  @Get('buildings')
  findDormBuildings() {
    return this.locationsService.findDormBuildings();
  }

  @Patch('buildings/:id')
  updateDormBuilding(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDormBuildingDto) {
    return this.locationsService.updateDormBuilding(id, dto);
  }

  @Delete('buildings/:id')
  removeDormBuilding(@Param('id', ParseIntPipe) id: number) {
    return this.locationsService.removeDormBuilding(id);
  }

  @Post('floors')
  createFloor(@Body() dto: CreateFloorDto) {
    return this.locationsService.createFloor(dto);
  }

  @Get('floors')
  findFloors() {
    return this.locationsService.findFloors();
  }

  @Patch('floors/:id')
  updateFloor(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFloorDto) {
    return this.locationsService.updateFloor(id, dto);
  }

  @Delete('floors/:id')
  removeFloor(@Param('id', ParseIntPipe) id: number) {
    return this.locationsService.removeFloor(id);
  }

  @Post('rooms')
  createRoom(@Body() dto: CreateRoomDto) {
    return this.locationsService.createRoom(dto);
  }

  @Get('rooms')
  findRooms() {
    return this.locationsService.findRooms();
  }

  @Get('rooms/:id/students')
  findRoomStudents(@Param('id', ParseIntPipe) id: number) {
    return this.locationsService.findRoomStudents(id);
  }

  @Patch('rooms/:id')
  updateRoom(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoomDto) {
    return this.locationsService.updateRoom(id, dto);
  }

  @Delete('rooms/:id')
  removeRoom(@Param('id', ParseIntPipe) id: number) {
    return this.locationsService.removeRoom(id);
  }

  @Post('rooms/:id/students')
  assignStudentToRoom(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignStudentRoomDto,
  ) {
    return this.locationsService.assignStudentToRoom(id, dto);
  }

  @Patch('rooms/:roomId/students/:studentId/unassign')
  unassignStudentFromRoom(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ) {
    return this.locationsService.unassignStudentFromRoom(roomId, studentId);
  }
}
