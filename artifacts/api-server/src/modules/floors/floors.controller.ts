import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { FloorsService } from './floors.service';
import { db, floorsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { getUserAccessInfo, assertCanManageFloor } from '../../common/utils/access-control';

@Controller('floors')
@UseGuards(JwtAuthGuard)
export class FloorsController {
  constructor(private readonly svc: FloorsService) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload, @Query() q: any) {
    const access = await getUserAccessInfo(user);
    const allowedBranchIds = access.isGlobal ? null : access.branchIds;
    return this.svc.findAll(q, allowedBranchIds);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const floor = await this.svc.findOne(id);
    const access = await getUserAccessInfo(user);
    if (!access.isGlobal) {
      await assertCanManageFloor(user, floor.buildingId);
    }
    return floor;
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() body: any) {
    await assertCanManageFloor(user, body.buildingId);
    return this.svc.create({ ...body, createdBy: user.userId });
  }

  @Patch(':id')
  async update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: any) {
    const [flr] = await db.select({ buildingId: floorsTable.buildingId }).from(floorsTable).where(eq(floorsTable.id, id));
    if (!flr) throw new NotFoundException('Floor not found');
    await assertCanManageFloor(user, flr.buildingId);
    return this.svc.update(id, { ...body, updatedBy: user.userId });
  }

  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const [flr] = await db.select({ buildingId: floorsTable.buildingId }).from(floorsTable).where(eq(floorsTable.id, id));
    if (!flr) throw new NotFoundException('Floor not found');
    await assertCanManageFloor(user, flr.buildingId);
    return this.svc.remove(id);
  }
}
