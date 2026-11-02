import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RoomTypesService } from './room-types.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { assertCanManageGlobalCatalog } from '../../common/utils/access-control';

@Controller('room-types')
@UseGuards(JwtAuthGuard)
export class RoomTypesController {
  constructor(private readonly svc: RoomTypesService) {}

  @Get()
  findAll(@Query('categoryId') categoryId?: string) {
    return this.svc.findAll(categoryId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() b: any) {
    await assertCanManageGlobalCatalog(user, 'room types');
    return this.svc.create({ ...b, createdBy: user.userId });
  }

  @Patch(':id')
  async update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() b: any) {
    await assertCanManageGlobalCatalog(user, 'room types');
    return this.svc.update(id, { ...b, updatedBy: user.userId });
  }

  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await assertCanManageGlobalCatalog(user, 'room types');
    return this.svc.remove(id);
  }
}
