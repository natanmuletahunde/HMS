import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { AfroMessageService } from './afromessage.service';
import { OtpService } from './otp.service';
import { requireSessionSecret } from '../../common/config/runtime-secrets';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: requireSessionSecret(),
      signOptions: { expiresIn: '30d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AfroMessageService, OtpService],
  exports: [JwtModule, AuthService, AfroMessageService, OtpService],
})
export class AuthModule {}
