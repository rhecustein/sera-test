import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { OrderNotificationJobData } from '../jobs/order-jobs.producer';
import { FailedJob } from '../entities/failed-job.entity';

@Processor('order-notif')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    @InjectRepository(FailedJob)
    private readonly failedJobRepository: Repository<FailedJob>,
  ) {}

  @Process('send-notification')
  async handleSendNotification(
    job: Job<OrderNotificationJobData>,
  ): Promise<void> {
    const { orderId, userId, message } = job.data;

    this.logger.log(
      `[WhatsApp Placeholder] Notification for order ${orderId}, user ${userId}: ${message}`,
    );

    // TODO: Integrate with WhatsApp Business API
    // Example: await whatsAppService.send({ to: userPhone, message })
  }

  @OnQueueFailed()
  async onFailed(job: Job, error: Error) {
    this.logger.error(`Notification job ${job.id} failed: ${error.message}`);
    try {
      await this.failedJobRepository.save({
        jobId: String(job.id),
        jobName: job.name,
        queueName: 'order-notif',
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
