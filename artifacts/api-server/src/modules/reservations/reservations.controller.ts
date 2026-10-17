import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('reservations')
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private readonly svc: ReservationsService) {}

  // Static routes FIRST to avoid conflicts with /:id
  @Get('today-arrivals')
  todayArrivals() {
    return this.svc.todayArrivals();
  }

  @Get('today-departures')
  todayDepartures() {
    return this.svc.todayDepartures();
  }

  @Get('in-house')
  inHouseGuests() {
    return this.svc.inHouseGuests();
  }

  @Get('no-shows')
  noShows() {
    return this.svc.noShows();
  }

  @Get('calendar')
  getCalendar(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.svc.getCalendar(startDate, endDate);
  }

  @Get('availability')
  checkAvailability(
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
    @Query('roomTypeId') roomTypeId?: string,
  ) {
    return this.svc.checkAvailability(checkIn, checkOut, roomTypeId);
  }

  @Get()
  findAll(@Query() q: any) {
    return this.svc.findAll(q);
  }

  @Post()
  create(@Body() body: any) {
    return this.svc.create(body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Body() body: any) {
    return this.svc.cancel(id, body?.reason);
  }

  @Post(':id/confirm')
  @HttpCode(200)
  confirm(@Param('id') id: string) {
    return this.svc.confirm(id);
  }

  @Post(':id/check-in')
  @HttpCode(200)
  checkIn(@Param('id') id: string, @Body() body: any) {
    return this.svc.checkIn(id, body ?? {});
  }

  @Post(':id/check-out')
  @HttpCode(200)
  checkOut(@Param('id') id: string, @Body() body: any) {
    return this.svc.checkOut(id, body ?? {});
  }
}
