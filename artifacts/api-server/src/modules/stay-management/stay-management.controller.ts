import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { StayManagementService } from './stay-management.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('stay-management')
@UseGuards(JwtAuthGuard)
export class StayManagementController {
  constructor(private readonly svc: StayManagementService) {}

  @Get()
  findAll(@Query() q: any) {
    return this.svc.findAll({
      reservationId: q.reservationId,
      guestId: q.guestId,
      page: q.page ? +q.page : 1,
      limit: q.limit ? +q.limit : 20,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.svc.create(body);
  }
}
