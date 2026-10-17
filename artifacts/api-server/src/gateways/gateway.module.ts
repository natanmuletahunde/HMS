import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway';
import { MetricsModule } from '../modules/metrics/metrics.module';
import { requireSessionSecret } from '../common/config/runtime-secrets';

@Module({
  imports: [
    MetricsModule,
    JwtModule.register({
      secret: requireSessionSecret(),
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class GatewayModule {}
