import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  /**
   * Prometheus-compatible metrics scrape endpoint.
   * Marked @Public() — no bearer token required, matching the standard Prometheus pull model.
   * In production this path should be restricted at the ingress/firewall level to
   * allow only your monitoring infra (e.g. a VPC-internal scrape target).
   */
  @Public()
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  getMetrics(): string {
    return this.metrics.toPrometheus();
  }
}
