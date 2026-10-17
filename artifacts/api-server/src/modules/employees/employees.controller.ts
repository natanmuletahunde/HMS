import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(private readonly svc: EmployeesService) {}

  @Get('stats')
  getStats() { return this.svc.getStats(); }

  @Get()
  findAll(@Query() q: any) { return this.svc.findAll(q); }

  @Post()
  create(@Body() b: any) { return this.svc.create(b); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() b: any) { return this.svc.update(id, b); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}
