import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ConferenceService } from './conference.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('conference')
@UseGuards(JwtAuthGuard)
export class ConferenceController {
  constructor(private readonly svc: ConferenceService) {}

  @Get('dashboard')
  getDashboard() { return this.svc.getDashboard(); }

  @Get('halls')
  getHalls(@Query() q: any) { return this.svc.getHalls(q); }

  @Post('halls')
  createHall(@Body() b: any) { return this.svc.createHall(b); }

  @Patch('halls/:id')
  updateHall(@Param('id') id: string, @Body() b: any) { return this.svc.updateHall(id, b); }

  @Get('equipment')
  getEquipment(@Query('hallId') hallId?: string) { return this.svc.getEquipment(hallId); }

  @Post('equipment')
  createEquipment(@Body() b: any) { return this.svc.createEquipment(b); }

  @Get('calendar')
  getCalendar(@Query('month') month: string) { return this.svc.getCalendar(month); }

  @Get('bookings')
  getBookings(@Query() q: any) { return this.svc.getBookings(q); }

  @Post('bookings')
  createBooking(@Body() b: any) { return this.svc.createBooking(b); }

  @Get('bookings/:id')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Patch('bookings/:id')
  updateBooking(@Param('id') id: string, @Body() b: any) { return this.svc.updateBooking(id, b); }
}
