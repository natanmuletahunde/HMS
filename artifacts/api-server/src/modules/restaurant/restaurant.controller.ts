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

  @Patch('tables/assign-section')
  assignSection(@Body() b: { section: string; waiterId: string | null }) {
    return this.svc.assignWaiterToSection(b.section, b.waiterId);
  }

  @Patch('tables/:id')
  updateTable(@Param('id') id: string, @Body() b: any) {
    return this.svc.updateTable(id, b);
  }

  @Get('kitchen')
  getKitchenOrders() {
    return this.svc.getKitchenOrders();
  }

  @Get('bar')
  getBarOrders() {
    return this.svc.getBarOrders();
  }

  @Get('coffee')
  getCoffeeOrders() {
    return this.svc.getCoffeeOrders();
  }

  @Get('beverages')
  getBeverageOrders() {
    return this.svc.getBeverageOrders();
  }

  @Patch('orders/:id/start-prep')
  startPrep(
    @Param('id') id: string,
    @Body() b: { stationSource?: 'kitchen' | 'bar' | 'coffee' | 'juice'; notes?: string },
  ) {
    return this.svc.startPrep(id, b?.stationSource || 'kitchen', b?.notes);
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

  @Get('waiters')
  getWaiters() {
    return this.svc.getWaiters();
  }

  @Patch('orders/:id')
  updateOrder(@Param('id') id: string, @Body() b: any) {
    return this.svc.updateOrder(id, b);
  }

  @Patch('orders/:orderId/items/:itemId/status')
  updateItemStatus(
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Body() b: { status: string; notes?: string },
  ) {
    return this.svc.updateItemStatus(orderId, itemId, b.status, b?.notes);
  }

  @Post('orders/:orderId/items')
  appendItemsToOrder(
    @Param('orderId') orderId: string,
    @Body() b: { items: any[]; roundNumber?: number; notes?: string },
  ) {
    return this.svc.appendItemsToOrder(orderId, b);
  }

  @Post('orders/:orderId/add-items')
  addItemsAlias(
    @Param('orderId') orderId: string,
    @Body() b: { items: any[]; roundNumber?: number; notes?: string },
  ) {
    return this.svc.appendItemsToOrder(orderId, b);
  }

  @Patch('orders/:id/dispatch-kitchen')
  dispatchToKitchen(@Param('id') id: string, @Body() b: any) {
    return this.svc.dispatchToKitchen(id, b?.coordinatorId, b?.notes);
  }

  @Patch('orders/:id/notify-ready')
  notifyReady(@Param('id') id: string, @Body() b: any) {
    return this.svc.notifyReady(id, b?.notifiedParty, b?.kitchenOfficerId, b?.notes, b?.readyItemIds, b?.stationSource, b?.status || b?.targetStatus);
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
