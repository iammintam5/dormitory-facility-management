import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  async getMyProfile(@CurrentUser('sub') userId: number) {
    return this.profilesService.getMyProfile(userId);
  }

  @Patch('me')
  async updateMyProfile(
    @CurrentUser('sub') userId: number,
    @Body() body: {
      fullName?: string;
      email?: string | null;
      phone?: string | null;
      gender?: string | null;
      dateOfBirth?: string | null;
      address?: string | null;
      notes?: string | null;
    },
  ) {
    return this.profilesService.updateMyProfile(userId, body);
  }
}
