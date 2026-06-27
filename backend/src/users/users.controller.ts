import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { getRequestIp } from '../common/utils/request-ip';
import { CreateUserDto, UpdateUserDto, ResetPasswordDto } from './dto/create-user.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('ADMIN')
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('roleCode') roleCode?: string,
    @Query('status') status?: string,
    @Query('studentCode') studentCode?: string,
  ) {
    return this.usersService.findAll({
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 10,
      keyword,
      roleCode,
      status,
      studentCode,
    });
  }

  @Roles('ADMIN')
  @Get('roles')
  async getRoles() {
    return this.usersService.getRoles();
  }

  @Roles('ADMIN')
  @Post()
  async create(
    @Body() body: CreateUserDto,
    @CurrentUser('sub') actorUserId: number,
    @Req() request: any,
  ) {
    return this.usersService.create(body, actorUserId, getRequestIp(request));
  }

  @Roles('ADMIN')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
    @CurrentUser('sub') actorUserId: number,
    @Req() request: any,
  ) {
    return this.usersService.update(parseInt(id, 10), body, actorUserId, getRequestIp(request));
  }

  @Roles('ADMIN')
  @Patch(':id/lock')
  async lock(@Param('id') id: string, @CurrentUser('sub') actorUserId: number, @Req() request: any) {
    return this.usersService.lock(parseInt(id, 10), actorUserId, getRequestIp(request));
  }

  @Roles('ADMIN')
  @Patch(':id/unlock')
  async unlock(@Param('id') id: string, @CurrentUser('sub') actorUserId: number, @Req() request: any) {
    return this.usersService.unlock(parseInt(id, 10), actorUserId, getRequestIp(request));
  }

  @Roles('ADMIN')
  @Post(':id/reset-password')
  async resetPassword(
    @Param('id') id: string,
    @Body() body: ResetPasswordDto,
    @CurrentUser('sub') actorUserId: number,
    @Req() request: any,
  ) {
    return this.usersService.resetPassword(parseInt(id, 10), body.newPassword, actorUserId, getRequestIp(request));
  }
}
