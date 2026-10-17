import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('restaurant')
@UseGuards(JwtAuthGuard)
export class RestaurantController {
  constructor(private readonly svc: RestaurantService) {}

  @Get('dashboard')
  getDashboard() {
    return this.svc.getDashboard();
  }

  @Get('menu-items')
  getMenuItems(@Query() q: any) {
    return this.svc.getMenuItems(q);
  }

  @Post('menu-items')
  createMenuItem(@Body() b: any) {
    return this.svc.createMenuItem(b);
  }

  @Patch('menu-items/:id')
  updateMenuItem(@Param('id') id: string, @Body() b: any) {
    return this.svc.updateMenuItem(id, b);
  }

  @Delete('menu-items/:id')
  deleteMenuItem(@Param('id') id: string) {
    return this.svc.deleteMenuItem(id);
  }

  @Get('tables')
  getTables(@Query() q: any) {
    return this.svc.getTables(q);
  }

  @Post('tables')
  createTable(@Body() b: any) {
    return this.svc.createTable(b);
  }

  @Patch('tables/:id')
  updateTable(@Param('id') id: string, @Body() b: any) {
    return this.svc.updateTable(id, b);
  }

  @Get('kitchen')
  getKitchenOrders() {
    return this.svc.getKitchenOrders();
  }

  @Get('orders')
  getOrders(@Query() q: any) {
    return this.svc.getOrders(q);
  }

  @Post('orders')
  createOrder(@Body() b: any) {
    return this.svc.createOrder(b);
  }

  @Get('orders/:id')
  getOrder(@Param('id') id: string) {
    return this.svc.getOrder(id);
  }

  @Patch('orders/:id')
  updateOrder(@Param('id') id: string, @Body() b: any) {
    return this.svc.updateOrder(id, b);
  }
}
