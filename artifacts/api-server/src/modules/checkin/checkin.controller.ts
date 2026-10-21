import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller(['checkins', 'checkin'])
@UseGuards(JwtAuthGuard)
export class CheckinController {
  constructor(private readonly svc: CheckinService) {}

  @Get()
  findAll(@Query() q: any) {
    return this.svc.findAll({
      page: q.page ? +q.page : 1,
      limit: q.limit ? +q.limit : 20,
      search: q.search,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, body);
  }

  @Post(':id/encode-keycard')
  encodeKeycard(@Param('id') id: string, @Body() body: any) {
    return this.svc.encodeKeycard(id, body ?? {});
  }
}
