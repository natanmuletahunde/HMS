import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { assertCanManageUsers } from '../../common/utils/access-control';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Get()
  @RequirePermissions('users:read')
  findAll(@Query() q: any) {
    return this.svc.findAll(+q.page || 1, +q.limit || 20, q.search, q.roleId, q.isActive, q.branchId, q.buildingId);
  }

  @Post()
  @RequirePermissions('users:create')
  create(@Body() b: any) {
    return this.svc.create(b);
  }

  @Get(':id')
  @RequirePermissions('users:read')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('users:update')
  update(@Param('id') id: string, @Body() b: any) {
    return this.svc.update(id, b);
  }

  @Post(':id/branches')
  @RequirePermissions('users:update')
  assignBranches(@Param('id') id: string, @Body() b: any) {
    return this.svc.assignBranches(id, b);
  }

  @Delete(':id')
  @RequirePermissions('users:delete')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await assertCanManageUsers(user);
    return this.svc.remove(id, user);
  }
}
