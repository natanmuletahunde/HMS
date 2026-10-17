import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RoomServiceService } from './room-service.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('room-service')
@UseGuards(JwtAuthGuard)
export class RoomServiceController {
  constructor(private readonly svc: RoomServiceService) {}

  @Get('dashboard')
  getDashboard() {
    return this.svc.getDashboard();
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
