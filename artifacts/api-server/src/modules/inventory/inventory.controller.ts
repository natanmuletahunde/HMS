import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly svc: InventoryService) {}

  @Get('dashboard')
  getDashboard() { return this.svc.getDashboard(); }

  @Get('categories')
  getCategories() { return this.svc.getCategories(); }

  @Post('categories')
  createCategory(@Body() b: any) { return this.svc.createCategory(b); }

  @Get('alerts')
  getAlerts() { return this.svc.getAlerts(); }

  @Get('movements')
  getMovements(@Query() q: any) { return this.svc.getMovements(q); }

  @Post('stock-in')
  stockIn(@Body() b: any) { return this.svc.stockIn(b); }

  @Post('stock-out')
  stockOut(@Body() b: any) { return this.svc.stockOut(b); }

  @Post('stock-adjustment')
  stockAdjustment(@Body() b: any) { return this.svc.stockAdjustment(b); }

  @Get()
  findAll(@Query() q: any) { return this.svc.findAll(q); }

  @Post()
  create(@Body() b: any) { return this.svc.create(b); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() b: any) { return this.svc.update(id, b); }
}
