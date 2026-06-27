import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateBuildingDto, UpdateBuildingDto, BatchUpdateRoomsDto } from './dto/create-building.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Roles('MANAGER')
  @Get('buildings')
  async getBuildings() {
    return this.locationsService.getBuildings();
  }

  @Roles('MANAGER')
  @Post('buildings')
  async createBuilding(@Body() body: CreateBuildingDto) {
    return this.locationsService.createBuilding(body);
  }

  @Roles('MANAGER')
  @Patch('buildings/:id')
  async updateBuilding(
    @Param('id') id: string,
    @Body() body: UpdateBuildingDto,
  ) {
    return this.locationsService.updateBuilding(parseInt(id, 10), body);
  }

  @Roles('MANAGER')
  @Delete('buildings/:id')
  async deleteBuilding(@Param('id') id: string) {
    return this.locationsService.deleteBuilding(parseInt(id, 10));
  }

  @Roles('MANAGER')
  @Patch('buildings/:id/rooms/batch')
  async batchUpdateRooms(
    @Param('id') id: string,
    @Body() body: BatchUpdateRoomsDto,
  ) {
    return this.locationsService.batchUpdateRooms(parseInt(id, 10), body);
  }

  @Roles('MANAGER', 'STUDENT')
  @Get('rooms')
  async getRooms(@Query('buildingId') buildingId?: string) {
    return this.locationsService.getRooms(buildingId ? parseInt(buildingId, 10) : undefined);
  }
}
