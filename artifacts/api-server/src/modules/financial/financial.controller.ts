import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { FinancialService } from './financial.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('financial')
@UseGuards(JwtAuthGuard)
export class FinancialController {
  constructor(private readonly svc: FinancialService) {}

  @Get('dashboard')
  getDashboard() { return this.svc.getDashboard(); }

  @Get('transactions')
  getTransactions(@Query() q: any) { return this.svc.getTransactions(q); }

  @Post('transactions')
  createTransaction(@Body() b: any) { return this.svc.createTransaction(b); }

  @Get('cash-registers')
  getCashRegisters() { return this.svc.getCashRegisters(); }

  @Post('cash-registers')
  createCashRegister(@Body() b: any) { return this.svc.createCashRegister(b); }

  @Patch('cash-registers/:id')
  updateCashRegister(@Param('id') id: string, @Body() b: any) { return this.svc.updateCashRegister(id, b); }

  @Get('cash-shifts')
  getCashShifts(@Query() q: any) { return this.svc.getCashShifts(q); }

  @Post('cash-shifts/open')
  openShift(@Body() b: any) { return this.svc.openShift(b); }

  @Patch('cash-shifts/:id/close')
  closeShift(@Param('id') id: string, @Body() b: any) { return this.svc.closeShift(id, b); }

  @Get('credit-notes')
  getCreditNotes(@Query() q: any) { return this.svc.getCreditNotes(q); }

  @Post('credit-notes')
  createCreditNote(@Body() b: any) { return this.svc.createCreditNote(b); }

  @Get('revenue-summary')
  getRevenueSummary(@Query() q: any) { return this.svc.getRevenueSummary(q); }

  @Get('expense-summary')
  getExpenseSummary(@Query() q: any) { return this.svc.getExpenseSummary(q); }
}
