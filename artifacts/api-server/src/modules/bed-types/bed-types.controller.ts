import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { BedTypesService } from './bed-types.service';
import { assertCanManageGlobalCatalog } from '../../common/utils/access-control';

@Controller('bed-types')
@UseGuards(JwtAuthGuard)
export class BedTypesController {
  constructor(private readonly svc: BedTypesService) {}

  @Get() findAll(@Query() q: any) { return this.svc.findAll(q); }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() body: any) {
    await assertCanManageGlobalCatalog(user, 'bed types');
    return this.svc.create({ ...body, createdBy: user.userId });
  }

  @Patch(':id')
  async update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: any) {
    await assertCanManageGlobalCatalog(user, 'bed types');
    return this.svc.update(id, { ...body, updatedBy: user.userId });
  }

  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await assertCanManageGlobalCatalog(user, 'bed types');
    return this.svc.remove(id);
  }
}
