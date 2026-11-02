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

  @Get('verify-resident')
  verifyResident(@Query('roomNumber') roomNumber: string) {
    return this.svc.verifyResident(roomNumber);
  }

  @Get('coordinators')
  getCoordinators() {
    return this.svc.getCoordinators();
  }

  @Patch('orders/:id')
  updateOrder(@Param('id') id: string, @Body() b: any) {
    return this.svc.updateOrder(id, b);
  }

  @Patch('orders/:id/dispatch-kitchen')
  dispatchToKitchen(@Param('id') id: string, @Body() b: any) {
    return this.svc.dispatchToKitchen(id, b?.coordinatorId, b?.notes);
  }

  @Patch('orders/:id/notify-ready')
  notifyReady(@Param('id') id: string, @Body() b: any) {
    return this.svc.notifyReady(id, b?.notifiedParty, b?.kitchenOfficerId, b?.notes);
  }

  @Get('cashier-feed')
  getCashierOrders(@Query() q: any) {
    return this.svc.getCashierOrders(q);
  }

  @Patch('orders/:id/request-bill')
  requestBill(@Param('id') id: string, @Body() b: any) {
    return this.svc.requestBill(id, b?.notes);
  }

  @Patch('orders/:id/print-receipt')
  printReceipt(@Param('id') id: string, @Body() b: any) {
    return this.svc.printReceipt(id, b?.cashierId, b?.notes);
  }

  @Patch('orders/:id/deliver-receipt')
  deliverReceipt(@Param('id') id: string) {
    return this.svc.deliverReceipt(id);
  }
}
