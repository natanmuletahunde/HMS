import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@Controller('departments')
@UseGuards(JwtAuthGuard)
export class DepartmentsController {
  constructor(private readonly svc: DepartmentsService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Post()
  @RequirePermissions('users:create')
  create(@Body() b: any) {
    return this.svc.create(b);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('users:update')
  update(@Param('id') id: string, @Body() b: any) {
    return this.svc.update(id, b);
  }

  @Delete(':id')
  @RequirePermissions('users:delete')
  remove(@Param('id') id: string, @Query('reassignToDepartmentId') reassignToDepartmentId?: string) {
    return this.svc.remove(id, { reassignToDepartmentId });
  }
}
