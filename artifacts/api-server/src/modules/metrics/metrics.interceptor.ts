import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') return next.handle();
    const start = Date.now();
    const req = context.switchToHttp().getRequest();
    const method = req.method as string;
    const route = (req.route?.path as string) ?? req.url;

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          this.metrics.increment('http_requests_total');
          this.metrics.increment(`http_requests_by_method{method="${method}"}`);
          this.metrics.observe('http_request_duration_ms', ms);
          if (route) {
            this.metrics.increment(`http_requests_by_route{route="${route.replace(/:[^/]+/g, ':id')}",method="${method}"}`);
          }
        },
        error: () => {
          const ms = Date.now() - start;
          this.metrics.increment('http_requests_total');
          this.metrics.increment('http_errors_total');
          this.metrics.observe('http_request_duration_ms', ms);
        },
      }),
    );
  }
}
