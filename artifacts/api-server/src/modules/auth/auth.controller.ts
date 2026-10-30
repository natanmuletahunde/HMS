import { Controller, Post, Get, Body, HttpCode, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { JwtPayload } from './jwt.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body.email, body.password);
  }

  /**
   * MFA second-factor verification.
   * Called after /auth/login returns { mfaRequired: true, mfaToken }.
   * Validates the 5-minute mfa-pending token + TOTP/backup code, then issues full JWT tokens.
   */
  @Public()
  @Post('mfa-verify')
  @HttpCode(200)
  mfaVerify(@Body() body: { mfaToken: string; totpCode: string }) {
    if (!body.mfaToken || !body.totpCode) {
      throw new BadRequestException('mfaToken and totpCode are required');
    }
    return this.auth.mfaVerify(body.mfaToken, body.totpCode);
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  logout() {
    return { message: 'Logged out successfully' };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() body: { refreshToken: string }) {
    return this.auth.refresh(body.refreshToken);
  }

  @Public()
  @Post('forgot-password/request-otp')
  @HttpCode(200)
  requestStaffOtp(@Body() body: { identifier: string }) {
    if (!body?.identifier) {
      throw new BadRequestException('Please provide your work email or registered mobile phone number');
    }
    return this.auth.requestStaffOtp(body.identifier);
  }

  @Public()
  @Post('forgot-password/verify-otp')
  @HttpCode(200)
  verifyStaffOtp(@Body() body: { phone?: string; identifier?: string; code: string }) {
    const phone = body?.phone || body?.identifier;
    if (!phone || !body?.code) {
      throw new BadRequestException('Phone number and verification code are required');
    }
    return this.auth.verifyStaffOtp(phone, body.code);
  }

  @Public()
  @Post('forgot-password/reset-password')
  @HttpCode(200)
  resetPassword(@Body() body: { resetToken: string; newPassword: string }) {
    if (!body?.resetToken || !body?.newPassword) {
      throw new BadRequestException('Reset token and new password are required');
    }
    return this.auth.resetPasswordWithToken(body.resetToken, body.newPassword);
  }

  @Public()
  @Post('otp-login')
  @HttpCode(200)
  otpLogin(@Body() body: { phone?: string; identifier?: string; code: string }) {
    const phone = body?.phone || body?.identifier;
    if (!phone || !body?.code) {
      throw new BadRequestException('Phone number and verification code are required');
    }
    return this.auth.otpLogin(phone, body.code);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getMe(@CurrentUser() user: JwtPayload) {
    return this.auth.getMe(user.userId);
  }
}
