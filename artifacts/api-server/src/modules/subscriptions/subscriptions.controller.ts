import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { getCallerCtx } from '../../common/context/tenant-context';

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly svc: SubscriptionsService) {}

  // Plans are public — no auth required
  @Get('plans')
  getPlans() { return this.svc.getPlans(); }

  @UseGuards(JwtAuthGuard)
  @Get('current')
  getCurrent(@Req() req: any) { return this.svc.getCurrent(getCallerCtx(req)); }

  @UseGuards(JwtAuthGuard)
  @Get('usage')
  getUsage(@Req() req: any) { return this.svc.getUsage(getCallerCtx(req)); }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  getHistory(@Req() req: any) { return this.svc.getHistory(getCallerCtx(req)); }

  @UseGuards(JwtAuthGuard)
  @Post('activate')
  activate(@Req() req: any, @Body() body: { planCode: string; billingCycle?: string }) {
    return this.svc.activate(getCallerCtx(req), body);
  }
}
