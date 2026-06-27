import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('buildings')
  async getBuildings() {
    return this.locationsService.getBuildings();
  }

  @Post('buildings')
  async createBuilding(@Body() body: {
    code: string;
    name: string;
    genderZone?: string | null;
    status?: 'ACTIVE' | 'INACTIVE';
    description?: string | null;
    floors?: number;
    rooms?: number;
    defaultCapacity?: number;
    defaultRoomType?: string | null;
    defaultAreaM2?: number | null;
    defaultCondition?: string | null;
    defaultNote?: string | null;
  }) {
    return this.locationsService.createBuilding(body);
  }

  @Patch('buildings/:id')
  async updateBuilding(
    @Param('id') id: string,
    @Body() body: {
      code?: string;
      name?: string;
      genderZone?: string | null;
      status?: 'ACTIVE' | 'INACTIVE';
      description?: string | null;
    },
  ) {
    return this.locationsService.updateBuilding(parseInt(id, 10), body);
  }

  @Delete('buildings/:id')
  async deleteBuilding(@Param('id') id: string) {
    return this.locationsService.deleteBuilding(parseInt(id, 10));
  }

  @Patch('buildings/:id/rooms/batch')
  async batchUpdateRooms(
    @Param('id') id: string,
    @Body() body: {
      roomIds: number[];
      capacity?: number;
      roomType?: string | null;
      areaM2?: number | null;
      condition?: string | null;
      note?: string | null;
    },
  ) {
    return this.locationsService.batchUpdateRooms(parseInt(id, 10), body);
  }

  @Get('rooms')
  async getRooms(@Query('buildingId') buildingId?: string) {
    return this.locationsService.getRooms(buildingId ? parseInt(buildingId, 10) : undefined);
  }
}
