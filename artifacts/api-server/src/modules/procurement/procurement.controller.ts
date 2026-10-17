import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProcurementService } from './procurement.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('procurement')
@UseGuards(JwtAuthGuard)
export class ProcurementController {
  constructor(private readonly svc: ProcurementService) {}

  @Get('suppliers')
  getSuppliers(@Query() q: any) { return this.svc.getSuppliers(q); }

  @Post('suppliers')
  createSupplier(@Body() b: any) { return this.svc.createSupplier(b); }

  @Patch('suppliers/:id')
  updateSupplier(@Param('id') id: string, @Body() b: any) { return this.svc.updateSupplier(id, b); }

  @Get('purchase-requests')
  getPurchaseRequests(@Query() q: any) { return this.svc.getPurchaseRequests(q); }

  @Post('purchase-requests')
  createPurchaseRequest(@Body() b: any) { return this.svc.createPurchaseRequest(b); }

  @Patch('purchase-requests/:id')
  updatePurchaseRequest(@Param('id') id: string, @Body() b: any) { return this.svc.updatePurchaseRequest(id, b); }

  @Get('purchase-orders')
  getPurchaseOrders(@Query() q: any) { return this.svc.getPurchaseOrders(q); }

  @Post('purchase-orders')
  createPurchaseOrder(@Body() b: any) { return this.svc.createPurchaseOrder(b); }

  @Patch('purchase-orders/:id')
  updatePurchaseOrder(@Param('id') id: string, @Body() b: any) { return this.svc.updatePurchaseOrder(id, b); }

  @Get('goods-receipts')
  getGoodsReceipts(@Query() q: any) { return this.svc.getGoodsReceipts(q); }

  @Post('goods-receipts')
  createGoodsReceipt(@Body() b: any) { return this.svc.createGoodsReceipt(b); }

  @Patch('goods-receipts/:id')
  updateGoodsReceipt(@Param('id') id: string, @Body() b: any) { return this.svc.updateGoodsReceipt(id, b); }
}
