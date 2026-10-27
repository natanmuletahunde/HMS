import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { BranchesService } from './branches.service';
import { db, rolesTable } from '@workspace/db';
import { eq } from 'drizzle-orm';

@Controller('branches')
@UseGuards(JwtAuthGuard)
export class BranchesController {
  constructor(private readonly svc: BranchesService) {}

  private async checkCanManage(user: JwtPayload) {
    if (!user) throw new ForbiddenException('Authentication required');
    if (user.roleName === 'Admin' || user.roleName === 'System Admin') return;

    if (user.roleId) {
      const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, user.roleId));
      const perms: string[] = role?.permissions || [];
      if (perms.includes('*') || perms.includes('hotel:*') || role?.scope === 'global') {
        return;
      }
    }
    throw new ForbiddenException('You do not have permission to create or manage hotel branches.');
  }

  @Get() findAll(@Query() q: any) { return this.svc.findAll(q); }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() body: any) {
    await this.checkCanManage(user);
    return this.svc.create(body);
  }

  @Patch(':id')
  async update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: any) {
    await this.checkCanManage(user);
    return this.svc.update(id, body);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.checkCanManage(user);
    return this.svc.remove(id);
  }
}
