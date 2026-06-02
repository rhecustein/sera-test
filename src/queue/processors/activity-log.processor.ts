import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ActivityLogsService } from '../../activity-logs/activity-logs.service';
import { OrderActivityJobData } from '../jobs/order-jobs.producer';
import { FailedJob } from '../entities/failed-job.entity';

@Processor('order-log')
export class ActivityLogProcessor {
  private readonly logger = new Logger(ActivityLogProcessor.name);
  private readonly redis: Redis;

  constructor(
    private readonly activityLogsService: ActivityLogsService,
    private readonly configService: ConfigService,
    @InjectRepository(FailedJob)
    private readonly failedJobRepository: Repository<FailedJob>,
  ) {
    this.redis = new Redis({
      host: configService.get<string>('REDIS_HOST', 'localhost'),
      port: configService.get<number>('REDIS_PORT', 6379),
    });
  }

  @Process('save-log')
  async handleSaveLog(job: Job<OrderActivityJobData>): Promise<void> {
    const { orderId, userId, action, payload, ipAddress } = job.data;
    const idempotencyKey = `job:log:${orderId}`;

    const alreadyProcessed = await this.redis.setnx(idempotencyKey, '1');
    if (!alreadyProcessed) {
      this.logger.warn(`Activity log for order ${orderId} already saved — skipping`);
      return;
    }
    await this.redis.expire(idempotencyKey, 86400);

    try {
      await this.activityLogsService.create({
        userId,
        action,
        entity: 'order',
        entityId: orderId,
        payload,
        ipAddress,
      });
      this.logger.log(`Activity log saved for order ${orderId}`);
    } catch (error) {
      await this.redis.del(idempotencyKey);
      this.logger.error(`Failed to save activity log for order ${orderId}: ${error.message}`);
      throw error;
    }
  }

  @OnQueueFailed()
  async onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} (${job.name}) failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
    try {
      await this.failedJobRepository.save({
        jobId: String(job.id),
        jobName: job.name,
        queueName: 'order-log',
        payload: job.data,
        errorMessage: error.message,
        stackTrace: error.stack,
        attemptCount: job.attemptsMade,
      });
    } catch (e) {
      this.logger.error(`Failed to persist failed job to DB: ${e.message}`);
    }
  }
}
