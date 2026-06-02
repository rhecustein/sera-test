import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Order } from '../../orders/entities/order.entity';

export interface OrderEmailJobData {
  orderId: string;
  userEmail: string;
  userName: string;
  order: Partial<Order>;
}

export interface OrderActivityJobData {
  orderId: string;
  userId: string;
  action: string;
  payload: Record<string, any>;
  ipAddress?: string;
}

export interface OrderNotificationJobData {
  orderId: string;
  userId: string;
  message: string;
}

const JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: true,
  removeOnFail: false,
};

@Injectable()
export class OrderJobsProducer {
  constructor(
    @InjectQueue('order-email') private readonly emailQueue: Queue,
    @InjectQueue('order-log') private readonly activityQueue: Queue,
    @InjectQueue('order-notif')
    private readonly notificationQueue: Queue,
  ) {}

  async dispatchInvoiceEmail(data: OrderEmailJobData): Promise<void> {
    await this.emailQueue.add('send-invoice', data, JOB_OPTIONS);
  }

  async dispatchActivityLog(data: OrderActivityJobData): Promise<void> {
    await this.activityQueue.add('save-log', data, JOB_OPTIONS);
  }

  async dispatchNotification(data: OrderNotificationJobData): Promise<void> {
    await this.notificationQueue.add('send-notification', data, JOB_OPTIONS);
  }
}
