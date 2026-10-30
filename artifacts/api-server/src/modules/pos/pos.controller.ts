import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PosService } from './pos.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('pos')
@UseGuards(JwtAuthGuard)
export class PosController {
  constructor(private readonly svc: PosService) {}

  @Get('summary')
  getSummary() {
    return this.svc.getSummary();
  }

  @Get('verify-resident')
  verifyResident(@Query('roomNumber') roomNumber: string) {
    return this.svc.verifyResident(roomNumber);
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

  @Post('orders/:id/items')
  addItem(@Param('id') id: string, @Body() b: any) {
    return this.svc.addItem(id, b);
  }

  @Delete('orders/:id/items/:itemId')
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.svc.removeItem(id, itemId);
  }

  @Post('orders/:id/void')
  voidOrder(@Param('id') id: string) {
    return this.svc.voidOrder(id);
  }
}
