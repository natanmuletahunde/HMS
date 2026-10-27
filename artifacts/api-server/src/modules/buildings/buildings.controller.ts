import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { BuildingsService } from './buildings.service';
import { db, buildingsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { getUserAccessInfo, assertCanManageBuilding } from '../../common/utils/access-control';

@Controller('buildings')
@UseGuards(JwtAuthGuard)
export class BuildingsController {
  constructor(private readonly svc: BuildingsService) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload, @Query() q: any) {
    const access = await getUserAccessInfo(user);
    const allowedBranchIds = access.isGlobal ? null : access.branchIds;
    return this.svc.findAll(q, allowedBranchIds);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const building = await this.svc.findOne(id);
    const access = await getUserAccessInfo(user);
    if (!access.isGlobal && !access.branchIds.includes(building.branchId)) {
      throw new NotFoundException('Building not found');
    }
    return building;
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() body: any) {
    await assertCanManageBuilding(user, body.branchId);
    return this.svc.create({ ...body, createdBy: user.userId });
  }

  @Patch(':id')
  async update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: any) {
    const [bld] = await db.select({ branchId: buildingsTable.branchId }).from(buildingsTable).where(eq(buildingsTable.id, id));
    if (!bld) throw new NotFoundException('Building not found');
    await assertCanManageBuilding(user, bld.branchId);
    return this.svc.update(id, { ...body, updatedBy: user.userId });
  }

  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const [bld] = await db.select({ branchId: buildingsTable.branchId }).from(buildingsTable).where(eq(buildingsTable.id, id));
    if (!bld) throw new NotFoundException('Building not found');
    await assertCanManageBuilding(user, bld.branchId);
    return this.svc.remove(id);
  }
}
