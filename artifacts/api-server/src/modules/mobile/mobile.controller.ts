import { Controller, Post, Get, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MobileService } from './mobile.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { getCallerCtx } from '../../common/context/tenant-context';

@ApiTags('mobile')
@Controller('mobile')
export class MobileController {
  constructor(private readonly svc: MobileService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('register-device')
  registerDevice(@Req() req: any, @Body() body: any) {
    const ctx = getCallerCtx(req);
    return this.svc.registerDevice(ctx.userId, body);
  }

  /**
   * Refresh an expired access token using a refresh token.
   * This endpoint MUST be public — the whole point is that the caller's access token is expired.
   * Refresh-token verification is performed by MobileService.tokenRefresh().
   */
  @Public()
  @Post('token-refresh')
  tokenRefresh(@Body() body: { refreshToken: string }) {
    return this.svc.tokenRefresh(body.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('sync/delta')
  syncDelta(@Req() req: any, @Query('since') since: string) {
    const ctx = getCallerCtx(req);
    const sinceDate = since ?? new Date(Date.now() - 24 * 3600000).toISOString();
    return this.svc.syncDelta(ctx, sinceDate);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('sync/push')
  pushSync(@Req() req: any, @Body() body: { changes: any[] }) {
    const ctx = getCallerCtx(req);
    return this.svc.pushSync(ctx, ctx.userId, body.changes ?? []);
  }
}
