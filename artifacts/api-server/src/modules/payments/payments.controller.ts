import { Controller, Get, Post, Body, Query, UseGuards, HttpCode } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly svc: PaymentsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query() q: any) { return this.svc.findAll(q); }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() b: any) { return this.svc.create(b); }

  @Post('initialize')
  @UseGuards(JwtAuthGuard)
  initialize(@Body() b: any) {
    return this.svc.initializeGatewayPayment(b);
  }

  @Post('webhook')
  @HttpCode(200)
  handleWebhook(@Body() payload: any) {
    return this.svc.handlePaymentWebhook(payload);
  }
}
