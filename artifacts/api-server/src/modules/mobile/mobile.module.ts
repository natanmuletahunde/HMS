import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';
import { requireSessionSecret } from '../../common/config/runtime-secrets';

@Module({
  imports: [JwtModule.register({ secret: requireSessionSecret(), signOptions: { expiresIn: '1d' } })],
  controllers: [MobileController],
  providers: [MobileService],
})
export class MobileModule {}
