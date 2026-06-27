import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { getRequestIp } from '../common/utils/request-ip';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() body: { username: string; password: string }, @Req() request: any) {
    return this.authService.login(body.username, body.password, getRequestIp(request));
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
    @Req() request: any,
  ) {
    return this.authService.changePassword(userId, body.currentPassword, body.newPassword, getRequestIp(request));
  }
}
