import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GuestPortalController } from './guest-portal.controller';
import { GuestPortalService } from './guest-portal.service';
import { requireSessionSecret } from '../../common/config/runtime-secrets';

@Module({
  imports: [
    JwtModule.register({
      secret: requireSessionSecret(),
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [GuestPortalController],
  providers: [GuestPortalService],
  exports: [GuestPortalService],
})
export class GuestPortalModule {}
