import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
@Controller('dashboard') @UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}
  @Get('stats') getStats() { return this.svc.getStats(); }
  @Get('occupancy') getOccupancy(@Query('period') period?: string) { return this.svc.getOccupancy(period); }
  @Get('revenue') getRevenue(@Query('period') period?: string) { return this.svc.getRevenue(period); }
  @Get('activity') getActivity() { return this.svc.getActivity(); }
}
