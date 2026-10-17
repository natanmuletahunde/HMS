import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TransportService } from './transport.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('transport')
@UseGuards(JwtAuthGuard)
export class TransportController {
  constructor(private readonly svc: TransportService) {}

  @Get('dashboard')
  getDashboard() { return this.svc.getDashboard(); }

  @Get('vehicles')
  getVehicles(@Query() q: any) { return this.svc.getVehicles(q); }

  @Post('vehicles')
  createVehicle(@Body() b: any) { return this.svc.createVehicle(b); }

  @Patch('vehicles/:id')
  updateVehicle(@Param('id') id: string, @Body() b: any) { return this.svc.updateVehicle(id, b); }

  @Get('drivers')
  getDrivers(@Query() q: any) { return this.svc.getDrivers(q); }

  @Post('drivers')
  createDriver(@Body() b: any) { return this.svc.createDriver(b); }

  @Patch('drivers/:id')
  updateDriver(@Param('id') id: string, @Body() b: any) { return this.svc.updateDriver(id, b); }

  @Get('trips')
  getTrips(@Query() q: any) { return this.svc.getTrips(q); }

  @Post('trips')
  createTrip(@Body() b: any) { return this.svc.createTrip(b); }

  @Get('trips/:id')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Patch('trips/:id')
  updateTrip(@Param('id') id: string, @Body() b: any) { return this.svc.updateTrip(id, b); }
}
