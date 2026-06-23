import { Controller, Post, Body, Get, UseGuards, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    return this.authService.login(body.username, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser('sub') userId: number) {
    return this.authService.getMe(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @CurrentUser('sub') userId: number,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(userId, body.currentPassword, body.newPassword);
  }
}
