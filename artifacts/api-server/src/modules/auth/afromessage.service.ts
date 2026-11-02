import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  recipient: string;
  devMode?: boolean;
  error?: string;
}

@Injectable()
export class AfroMessageService {
  private readonly logger = new Logger(AfroMessageService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Normalizes Ethiopian phone numbers to international standard without '+' prefix (2519... or 2517...)
   * Examples:
   *   "0911318622"   -> "251911318622"
   *   "+251911318622"-> "251911318622"
   *   "0712345678"   -> "251712345678"
   *   "911318622"    -> "251911318622"
   */
  normalizePhone(phone: string): string {
    const digits = (phone || '').replace(/\D/g, '');
    if (digits.startsWith('0') && (digits.startsWith('09') || digits.startsWith('07'))) {
      return '251' + digits.slice(1);
    }
    if (digits.startsWith('251') && digits.length >= 12) {
      return digits;
    }
    if ((digits.startsWith('9') || digits.startsWith('7')) && digits.length === 9) {
      return '251' + digits;
    }
    return digits;
  }

  /**
   * Format phone for user-friendly display with privacy masking
   * e.g. "251911318622" -> "+251 91 **** 8622"
   */
  maskPhone(phone: string): string {
    const normalized = this.normalizePhone(phone);
    if (normalized.length >= 12) {
      const country = normalized.slice(0, 3);
      const prefix = normalized.slice(3, 5);
      const last = normalized.slice(-4);
      return `+${country} ${prefix} **** ${last}`;
    }
    if (normalized.length >= 10) {
      return `${normalized.slice(0, 4)} **** ${normalized.slice(-2)}`;
    }
    return phone;
  }

  /**
   * Sends an SMS message using AfroMessage REST API
   * (https://afromessage.com/api/send)
   * If API key is missing or invalid, falls back to dev simulation mode so local development is never blocked.
   */
  async sendSms(to: string, message: string): Promise<SendSmsResult> {
    const recipient = this.normalizePhone(to);
    const apiKey =
      this.config.get<string>('AFROMESSAGE_API_KEY') ||
      process.env.AFROMESSAGE_API_KEY;
    const sender =
      this.config.get<string>('AFROMESSAGE_SENDER_NAME') ||
      process.env.AFROMESSAGE_SENDER_NAME ||
      '';
    const apiUrl =
      this.config.get<string>('AFROMESSAGE_API_URL') ||
      process.env.AFROMESSAGE_API_URL ||
      'https://api.afromessage.com/api/send';

    // Development / Sandbox mode if no API key is provided
    if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_afromessage_api_key')) {
      this.logger.log(
        `[AfroMessage DEV SIMULATION] 📱 To: ${recipient} | Sender: ${sender || 'Default'} | Message: "${message}"`,
      );
      return {
        success: true,
        recipient,
        devMode: true,
        messageId: `dev-${Date.now()}`,
      };
    }

    try {
      const payload: Record<string, any> = {
        to: recipient,
        message,
      };
      if (sender) {
        payload.sender = sender;
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.acknowledge === 'error')) {
        const errorMsg = data?.response?.errors?.[0] || data?.message || `HTTP ${res.status} ${res.statusText}`;
        this.logger.error(`AfroMessage API Error (${recipient}): ${errorMsg}`);
        return {
          success: false,
          recipient,
          error: errorMsg,
        };
      }

      this.logger.log(`AfroMessage SMS successfully sent to ${recipient}`);
      return {
        success: true,
        recipient,
        messageId: data?.response?.message_id || data?.message_id || `msg-${Date.now()}`,
      };
    } catch (err: any) {
      this.logger.error(`Failed to reach AfroMessage gateway: ${err.message}`);
      return {
        success: false,
        recipient,
        error: err.message,
      };
    }
  }

  /**
   * Helper to send 6-digit OTP SMS
   */
  async sendOtpSms(to: string, otpCode: string, brandName = 'Nexus Hotel'): Promise<SendSmsResult> {
    const text = `Your ${brandName} verification code is ${otpCode}. Valid for 5 minutes. Do not share this code with anyone.`;
    return this.sendSms(to, text);
  }
}
