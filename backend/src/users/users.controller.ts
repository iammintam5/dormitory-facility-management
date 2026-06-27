import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('ADMIN', 'MANAGER')
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

  @Roles('ADMIN', 'MANAGER')
  @Get('roles')
  async getRoles() {
    return this.usersService.getRoles();
  }

  @Roles('ADMIN', 'MANAGER')
  @Post()
  async create(@Body() body: {
    roleId: string;
    fullName: string;
    username: string;
    password: string;
    email?: string;
    phone?: string;
    studentCode?: string;
  }) {
    return this.usersService.create(body);
  }

  @Roles('ADMIN', 'MANAGER')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: {
      roleId?: string;
      fullName?: string;
      username?: string;
      email?: string | null;
      phone?: string | null;
      studentCode?: string | null;
    },
  ) {
    return this.usersService.update(parseInt(id, 10), body);
  }

  @Roles('ADMIN', 'MANAGER')
  @Patch(':id/lock')
  async lock(@Param('id') id: string) {
    return this.usersService.lock(parseInt(id, 10));
  }

  @Roles('ADMIN', 'MANAGER')
  @Patch(':id/unlock')
  async unlock(@Param('id') id: string) {
    return this.usersService.unlock(parseInt(id, 10));
  }

  @Roles('ADMIN', 'MANAGER')
  @Post(':id/reset-password')
  async resetPassword(@Param('id') id: string, @Body() body: { newPassword: string }) {
    return this.usersService.resetPassword(parseInt(id, 10), body.newPassword);
  }
}
