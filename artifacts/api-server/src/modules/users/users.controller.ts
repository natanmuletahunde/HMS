import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { assertCanManageUsers } from '../../common/utils/access-control';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Get()
  findAll(@Query() q: any) {
    return this.svc.findAll(+q.page || 1, +q.limit || 20, q.search, q.roleId, q.isActive, q.branchId);
  }

  @Post()
  create(@Body() b: any) {
    return this.svc.create(b);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() b: any) {
    return this.svc.update(id, b);
  }

  @Post(':id/branches')
  assignBranches(@Param('id') id: string, @Body() b: any) {
    return this.svc.assignBranches(id, b);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await assertCanManageUsers(user);
    return this.svc.remove(id, user);
  }
}
