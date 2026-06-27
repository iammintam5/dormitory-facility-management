import { Controller, Get, UseGuards } from '@nestjs/common';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Roles('STUDENT')
  @Get('me/room')
  async getMyRoom(@CurrentUser('sub') userId: number) {
    return this.studentsService.getMyRoom(userId);
  }

  @Roles('STUDENT')
  @Get('me/roommates')
  async getMyRoommates(@CurrentUser('sub') userId: number) {
    return this.studentsService.getMyRoommates(userId);
  }

  @Roles('STUDENT')
  @Get('me/room-assets')
  async getMyRoomAssets(@CurrentUser('sub') userId: number) {
    return this.studentsService.getMyRoomAssets(userId);
  }
}
