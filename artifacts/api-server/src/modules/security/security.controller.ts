import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SecurityService } from './security.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { getCallerCtx } from '../../common/context/tenant-context';

@ApiTags('security')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('security')
export class SecurityController {
  constructor(private readonly svc: SecurityService) {}

  // ─── Password Policy ───────────────────────────────────────────────────────
  @Get('password-policy')
  getPolicy() { return this.svc.getPasswordPolicy(); }

  @Put('password-policy')
  updatePolicy(@Req() req: any, @Body() body: any) {
    return this.svc.updatePasswordPolicy(getCallerCtx(req), body);
  }

  // ─── MFA ──────────────────────────────────────────────────────────────────
  @Get('mfa/status')
  mfaStatus(@Req() req: any) {
    return this.svc.getMfaStatus(getCallerCtx(req).userId);
  }

  @Post('mfa/setup')
  setupMfa(@Req() req: any) {
    const ctx = getCallerCtx(req);
    return this.svc.setupMfa(ctx.userId, (req.user as any).email);
  }

  @Post('mfa/verify')
  verifyMfa(@Req() req: any, @Body() body: { token: string }) {
    return this.svc.verifyMfa(getCallerCtx(req).userId, body.token);
  }

  @Delete('mfa/disable')
  disableMfa(@Req() req: any, @Body() body: { token: string }) {
    if (!body.token) throw new BadRequestException('TOTP token required to disable MFA');
    return this.svc.disableMfa(getCallerCtx(req).userId, body.token);
  }

  // ─── IP Restrictions ──────────────────────────────────────────────────────
  @Get('ip-restrictions')
  getIpRestrictions(@Req() req: any) {
    return this.svc.getIpRestrictions(getCallerCtx(req));
  }

  @Post('ip-restrictions')
  addIpRestriction(@Req() req: any, @Body() body: any) {
    return this.svc.addIpRestriction(getCallerCtx(req), body);
  }

  @Delete('ip-restrictions/:id')
  removeIpRestriction(@Req() req: any, @Param('id') id: string) {
    return this.svc.removeIpRestriction(getCallerCtx(req), id);
  }

  // ─── Devices ──────────────────────────────────────────────────────────────
  @Get('devices')
  getDevices(@Req() req: any) {
    return this.svc.getDevices(getCallerCtx(req).userId);
  }

  @Delete('devices/:id')
  revokeDevice(@Req() req: any, @Param('id') id: string) {
    return this.svc.revokeDevice(id, getCallerCtx(req).userId);
  }
}
