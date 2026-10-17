import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('maintenance')
@UseGuards(JwtAuthGuard)
export class MaintenanceController {
  constructor(private readonly svc: MaintenanceService) {}

  @Get('dashboard')
  getDashboard() {
    return this.svc.getDashboard();
  }

  @Get('categories')
  getCategories() {
    return this.svc.getCategories();
  }

  @Post('categories')
  createCategory(@Body() b: any) {
    return this.svc.createCategory(b);
  }

  @Get('inspections')
  getInspections(@Query('requestId') requestId: string) {
    return this.svc.getInspections(requestId);
  }

  @Post('inspections')
  createInspection(@Body() b: any) {
    return this.svc.createInspection(b);
  }

  @Get()
  findAll(@Query() q: any) {
    return this.svc.findAll(q);
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
}
