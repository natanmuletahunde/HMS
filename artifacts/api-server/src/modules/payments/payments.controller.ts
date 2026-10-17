import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
@Controller('payments') @UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly svc: PaymentsService) {}
  @Get() findAll(@Query() q: any) { return this.svc.findAll(q); }
  @Post() create(@Body() b: any) { return this.svc.create(b); }
}
