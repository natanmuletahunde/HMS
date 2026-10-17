import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { GuestsService } from './guests.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('guests')
@UseGuards(JwtAuthGuard)
export class GuestsController {
  constructor(private readonly svc: GuestsService) {}

  @Get()
  findAll(@Query() q: any) {
    return this.svc.findAll({
      page: q.page ? +q.page : 1,
      limit: q.limit ? +q.limit : 20,
      search: q.search,
      guestType: q.guestType,
      vipStatus: q.vipStatus,
    });
  }

  @Get('stats')
  getStats() {
    return this.svc.getStats();
  }

  @Post()
  create(@Body() body: any) {
    return this.svc.create(body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.svc.getHistory(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
