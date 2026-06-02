import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Queue } from 'bull';

@Injectable()
export class MetricsService {
  private totalRequests = 0;
  private totalErrors = 0;
  private responseTimes: number[] = [];

  constructor(
    @InjectQueue('order-email') private readonly emailQueue: Queue,
    @InjectQueue('order-log') private readonly activityQueue: Queue,
    @InjectQueue('order-notif') private readonly notificationQueue: Queue,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  increment() {
    this.totalRequests++;
  }

  incrementErrors() {
    this.totalErrors++;
  }

  recordResponseTime(ms: number) {
    this.responseTimes.push(ms);
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }
  }

  async getMetrics() {
    const avg =
      this.responseTimes.length > 0
        ? Math.round(
            this.responseTimes.reduce((a, b) => a + b, 0) /
              this.responseTimes.length,
          )
        : 0;

    const [
      emailWaiting, emailActive, emailFailed,
      activityWaiting, activityActive, activityFailed,
      notifWaiting, notifActive, notifFailed,
    ] = await Promise.all([
      this.emailQueue.getWaitingCount(),
      this.emailQueue.getActiveCount(),
      this.emailQueue.getFailedCount(),
      this.activityQueue.getWaitingCount(),
      this.activityQueue.getActiveCount(),
      this.activityQueue.getFailedCount(),
      this.notificationQueue.getWaitingCount(),
      this.notificationQueue.getActiveCount(),
      this.notificationQueue.getFailedCount(),
    ]);

    const pool = (this.dataSource.driver as any)?.master?.pool;
    const dbPoolActive: number = pool?.totalCount ?? pool?.numUsed?.() ?? 0;

    const errorRatePercent =
      this.totalRequests > 0
        ? parseFloat(((this.totalErrors / this.totalRequests) * 100).toFixed(2))
        : 0;

    return {
      total_requests: this.totalRequests,
      total_errors: this.totalErrors,
      error_rate_percent: errorRatePercent,
      avg_response_time_ms: avg,
      queue_pending: emailWaiting + emailActive + activityWaiting + activityActive + notifWaiting + notifActive,
      queue_failed: emailFailed + activityFailed + notifFailed,
      database_pool_active: dbPoolActive,
      uptime_seconds: Math.floor(process.uptime()),
    };
  }
}
