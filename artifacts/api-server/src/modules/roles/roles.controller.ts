import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly svc: RolesService) {}

  @Get()
  @RequirePermissions('roles:read')
  findAll() {
    return this.svc.findAll();
  }

  @Post()
  @RequirePermissions('roles:create')
  create(@Body() b: any) {
    return this.svc.create(b);
  }

  @Get(':id')
  @RequirePermissions('roles:read')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('roles:update')
  update(@Param('id') id: string, @Body() b: any) {
    return this.svc.update(id, b);
  }

  @Delete(':id')
  @RequirePermissions('roles:delete')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
