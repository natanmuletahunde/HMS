import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { BranchesService } from './branches.service';
import { assertCanManageBranches, getUserAccessInfo } from '../../common/utils/access-control';

@Controller('branches')
@UseGuards(JwtAuthGuard)
export class BranchesController {
  constructor(private readonly svc: BranchesService) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload, @Query() q: any) {
    const access = await getUserAccessInfo(user);
    const allowedBranchIds = access.isGlobal ? null : access.branchIds;
    return this.svc.findAll(q, allowedBranchIds);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const access = await getUserAccessInfo(user);
    if (!access.isGlobal && !access.branchIds.includes(id)) {
      throw new NotFoundException('Branch not found');
    }
    return this.svc.findOne(id);
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() body: any) {
    await assertCanManageBranches(user);
    return this.svc.create(body);
  }

  @Patch(':id')
  async update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: any) {
    await assertCanManageBranches(user);
    return this.svc.update(id, body);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await assertCanManageBranches(user);
    return this.svc.remove(id);
  }
}
