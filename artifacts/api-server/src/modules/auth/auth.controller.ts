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

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getMe(@CurrentUser() user: JwtPayload) {
    return this.auth.getMe(user.userId);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() body: { currentPassword?: string; newPassword: string },
  ) {
    return this.auth.changePassword(user.userId, body.currentPassword, body.newPassword);
  }
}
