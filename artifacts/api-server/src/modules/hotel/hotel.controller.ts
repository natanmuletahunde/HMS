import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { HotelService } from './hotel.service';

@Controller('hotel')
@UseGuards(JwtAuthGuard)
export class HotelController {
  constructor(private readonly svc: HotelService) {}

  @Get() findAll() { return this.svc.findAll(); }
  @Get('stats') getStats() { return this.svc.getStats(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() create(@Body() body: any) { return this.svc.create(body); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
