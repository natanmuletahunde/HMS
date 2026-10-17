import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BiService } from './bi.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { getCallerCtx } from '../../common/context/tenant-context';

@ApiTags('bi')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bi')
export class BiController {
  constructor(private readonly svc: BiService) {}

  @Get('kpis')
  getKpis(@Req() req: any, @Query('period') period: 'day' | 'week' | 'month' = 'month') {
    return this.svc.getKpis(getCallerCtx(req), period);
  }

  @Get('forecast/occupancy')
  forecastOccupancy(@Req() req: any, @Query('days') days: string = '30') {
    return this.svc.forecastOccupancy(getCallerCtx(req), parseInt(days));
  }

  @Get('forecast/revenue')
  forecastRevenue(@Req() req: any, @Query('days') days: string = '30') {
    return this.svc.forecastRevenue(getCallerCtx(req), parseInt(days));
  }

  @Get('drill-down/:metric')
  drillDown(
    @Req() req: any,
    @Param('metric') metric: 'occupancy' | 'revenue',
    @Query('groupBy') groupBy: 'branch' | 'category' = 'branch',
  ) {
    return this.svc.drillDown(getCallerCtx(req), metric, groupBy);
  }
}
