import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { HousekeepingService } from './housekeeping.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('housekeeping')
@UseGuards(JwtAuthGuard)
export class HousekeepingController {
  constructor(private readonly svc: HousekeepingService) {}

  @Get('dashboard')
  getDashboard() {
    return this.svc.getDashboard();
  }

  @Get('areas')
  getAreas() {
    return this.svc.getAreas();
  }

  @Post('areas')
  createArea(@Body() b: any) {
    return this.svc.createArea(b);
  }

  @Get('inspections')
  getInspections(@Query('taskId') taskId: string) {
    return this.svc.getInspections(taskId);
  }

  @Post('inspections')
  createInspection(@Body() b: any) {
    return this.svc.createInspection(b);
  }

  // ─── Pre-Checkout Inspections ───

  @Post('pre-checkout/request')
  requestPreCheckoutInspection(@Body() b: any) {
    return this.svc.requestPreCheckoutInspection(b);
  }

  @Get('pre-checkout')
  getPreCheckoutInspections(@Query() q: any) {
    return this.svc.getPreCheckoutInspections(q);
  }

  @Get('pre-checkout/reservation/:reservationId')
  getPreCheckoutInspectionByReservation(@Param('reservationId') reservationId: string) {
    return this.svc.getPreCheckoutInspectionByReservation(reservationId);
  }

  @Patch('pre-checkout/:id/submit')
  submitPreCheckoutInspection(@Param('id') id: string, @Body() b: any) {
    return this.svc.submitPreCheckoutInspection(id, b);
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
