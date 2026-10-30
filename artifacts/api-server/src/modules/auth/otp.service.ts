import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { CacheService } from '../cache/cache.service';
import { AfroMessageService } from './afromessage.service';

export interface OtpSession {
  hash: string;
  phone: string;
  userType: 'staff' | 'guest';
  userId?: string;
  metadata?: Record<string, any>;
  attempts: number;
  createdAt: number;
  expiresAt: number;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  // Configuration constants
  private readonly OTP_TTL_SECONDS = 300; // 5 minutes
  private readonly COOLDOWN_SECONDS = 60; // 60 seconds resend interval
  private readonly MAX_VERIFY_ATTEMPTS = 5; // 5 failed attempts locks OTP
  private readonly RESET_TOKEN_TTL_SECONDS = 600; // 10 minutes

  constructor(
    private readonly cache: CacheService,
    private readonly afroMessage: AfroMessageService,
  ) {}

  /**
   * Hashes a 6-digit OTP code using SHA-256 so plain codes are never stored in memory
   */
  private hashOtp(phone: string, code: string): string {
    return crypto
      .createHash('sha256')
      .update(`${phone}:${code.trim()}`)
      .digest('hex');
  }

  /**
   * Generates and dispatches a 6-digit OTP code via AfroMessage SMS
   */
  async requestOtp(
    rawPhone: string,
    userType: 'staff' | 'guest',
    metadata?: Record<string, any>,
  ): Promise<{
    success: boolean;
    maskedPhone: string;
    cooldownSeconds: number;
    devCode?: string;
  }> {
    const normalizedPhone = this.afroMessage.normalizePhone(rawPhone);
    if (!normalizedPhone || normalizedPhone.length < 9) {
      throw new BadRequestException('Please provide a valid Ethiopian mobile number (09... or 07...)');
    }

    // Rate-limiting: check 60s resend cooldown
    const cooldownKey = `otp_cooldown:${normalizedPhone}`;
    if (this.cache.get(cooldownKey)) {
      throw new BadRequestException(
        'A verification code was recently sent. Please wait 60 seconds before requesting another code.',
      );
    }

    // Generate cryptographically secure 6-digit numeric OTP (100000 - 999999)
    const code = crypto.randomInt(100000, 1000000).toString();
    const hash = this.hashOtp(normalizedPhone, code);

    const session: OtpSession = {
      hash,
      phone: normalizedPhone,
      userType,
      userId: metadata?.userId,
      metadata: metadata || {},
      attempts: 0,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.OTP_TTL_SECONDS * 1000,
    };

    // Store in cache with 5m TTL
    const otpKey = `otp:${userType}:${normalizedPhone}`;
    this.cache.set(otpKey, session, this.OTP_TTL_SECONDS);

    // Set 60s cooldown key
    this.cache.set(cooldownKey, true, this.COOLDOWN_SECONDS);

    // Send SMS via AfroMessage
    const smsResult = await this.afroMessage.sendOtpSms(
      normalizedPhone,
      code,
      'Nexus Hotel Management',
    );

    const maskedPhone = this.afroMessage.maskPhone(normalizedPhone);

    return {
      success: true,
      maskedPhone,
      cooldownSeconds: this.COOLDOWN_SECONDS,
      // Provide devCode in sandbox/dev mode so local demo & verification is seamless
      ...(smsResult.devMode ? { devCode: code } : {}),
    };
  }

  /**
   * Verifies the submitted 6-digit OTP code against stored session hash
   */
  async verifyOtp(
    rawPhone: string,
    submittedCode: string,
    userType: 'staff' | 'guest',
  ): Promise<{
    success: boolean;
    phone: string;
    userId?: string;
    metadata?: Record<string, any>;
  }> {
    const normalizedPhone = this.afroMessage.normalizePhone(rawPhone);
    const otpKey = `otp:${userType}:${normalizedPhone}`;
    const session = this.cache.get<OtpSession>(otpKey);

    if (!session) {
      throw new BadRequestException(
        'Verification code has expired or was not requested. Please request a new code.',
      );
    }

    // Check attempts limit
    session.attempts += 1;
    if (session.attempts > this.MAX_VERIFY_ATTEMPTS) {
      this.cache.del(otpKey);
      throw new BadRequestException(
        'Too many incorrect attempts. For security, this verification code has been locked. Please request a new one.',
      );
    }

    const expectedHash = session.hash;
    const providedHash = this.hashOtp(normalizedPhone, submittedCode);

    if (expectedHash !== providedHash) {
      // Re-save session with incremented attempts
      const remainingSeconds = Math.max(1, Math.round((session.expiresAt - Date.now()) / 1000));
      this.cache.set(otpKey, session, remainingSeconds);
      const remainingAttempts = this.MAX_VERIFY_ATTEMPTS - session.attempts;
      throw new BadRequestException(
        `Incorrect verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
      );
    }

    // Success! Invalidate OTP immediately to prevent replay attacks
    this.cache.del(otpKey);

    return {
      success: true,
      phone: normalizedPhone,
      userId: session.userId,
      metadata: session.metadata,
    };
  }

  /**
   * Creates a single-use password reset authorization token valid for 10 minutes
   */
  createResetToken(userId: string): string {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetKey = `reset_token:${resetToken}`;
    this.cache.set(resetKey, userId, this.RESET_TOKEN_TTL_SECONDS);
    return resetToken;
  }

  /**
   * Verifies and consumes a password reset token
   */
  consumeResetToken(resetToken: string): string | null {
    if (!resetToken) return null;
    const resetKey = `reset_token:${resetToken}`;
    const userId = this.cache.get<string>(resetKey);
    if (!userId) return null;
    this.cache.del(resetKey);
    return userId;
  }
}
