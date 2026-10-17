import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(private readonly svc: AuditLogsService) {}

  @Get('stats')
  getStats() {
    return this.svc.getStats();
  }

  @Post()
  create(@Body() b: any) {
    return this.svc.create(b);
  }

  @Get()
  findAll(@Query() q: any) {
    return this.svc.findAll(q);
  }
}
