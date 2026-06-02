import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Optional,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { MetricsService } from '../../metrics/metrics.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(@Optional() private readonly metricsService?: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const startTime = Date.now();

    const { method, url, headers, ip } = request;
    const requestId = headers['x-request-id'] as string;
    const userId = (request as any).user?.id;

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - startTime;
          this.metricsService?.increment();
          this.metricsService?.recordResponseTime(responseTime);
          this.logger.log(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              level: 'info',
              requestId,
              method,
              path: url,
              statusCode: response.statusCode,
              responseTime: `${responseTime}ms`,
              userId: userId || null,
              ip,
            }),
          );
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          this.metricsService?.increment();
          this.metricsService?.incrementErrors();
          this.metricsService?.recordResponseTime(responseTime);
          this.logger.error(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              level: 'error',
              requestId,
              method,
              path: url,
              statusCode: error.status || 500,
              responseTime: `${responseTime}ms`,
              userId: userId || null,
              ip,
              error: error.message,
            }),
          );
        },
      }),
    );
  }
}
