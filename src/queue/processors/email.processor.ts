import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import Redis from 'ioredis';
import { OrderEmailJobData } from '../jobs/order-jobs.producer';
import { FailedJob } from '../entities/failed-job.entity';

@Processor('order-email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);
  private readonly redis: Redis;
  private readonly transporter: nodemailer.Transporter;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(FailedJob)
    private readonly failedJobRepository: Repository<FailedJob>,
  ) {
    this.redis = new Redis({
      host: configService.get<string>('REDIS_HOST', 'localhost'),
      port: configService.get<number>('REDIS_PORT', 6379),
    });

    this.transporter = nodemailer.createTransport({
      host: configService.get<string>('MAIL_HOST', 'smtp.hostinger.com'),
      port: configService.get<number>('MAIL_PORT', 465),
      secure: configService.get<string>('MAIL_SECURE', 'true') === 'true',
      auth: {
        user: configService.get<string>('MAIL_USER', ''),
        pass: configService.get<string>('MAIL_PASS', ''),
      },
    });
  }

  @Process('send-invoice')
  async handleSendInvoice(job: Job<OrderEmailJobData>): Promise<void> {
    const { orderId, userEmail, userName, order } = job.data;
    const idempotencyKey = `job:email:${orderId}`;

    const alreadyProcessed = await this.redis.setnx(idempotencyKey, '1');
    if (!alreadyProcessed) {
      this.logger.warn(`Invoice email for order ${orderId} already sent — skipping`);
      return;
    }
    await this.redis.expire(idempotencyKey, 86400);

    try {
      const html = this.buildInvoiceHtml({ orderId, userName, order });
      const from = this.configService.get<string>(
        'MAIL_FROM',
        'SERA System <noreply@sera.co.id>',
      );

      await this.transporter.sendMail({
        from,
        to: userEmail,
        subject: `SERA — Invoice Order #${orderId.slice(0, 8).toUpperCase()}`,
        html,
      });

      this.logger.log(`Invoice email sent to ${userEmail} for order ${orderId}`);
    } catch (error) {
      await this.redis.del(idempotencyKey);
      this.logger.error(`Failed to send invoice email for order ${orderId}: ${error.message}`);
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
        queueName: 'order-email',
        payload: job.data,
        errorMessage: error.message,
        stackTrace: error.stack,
        attemptCount: job.attemptsMade,
      });
    } catch (e) {
      this.logger.error(`Failed to persist failed job to DB: ${e.message}`);
    }
  }

  private buildInvoiceHtml(params: {
    orderId: string;
    userName: string;
    order: any;
  }): string {
    const { orderId, userName, order } = params;
    const items = order?.items || [];
    const itemRows = items
      .map(
        (item: any) => `
        <tr>
          <td style="padding:8px;border:1px solid #ddd">${item.product?.name || 'Product'}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center">${item.quantity}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right">Rp ${Number(item.price).toLocaleString('id-ID')}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right">Rp ${(Number(item.price) * item.quantity).toLocaleString('id-ID')}</td>
        </tr>`,
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Invoice SERA</title></head>
      <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:#1a1a2e;color:white;padding:20px;border-radius:8px 8px 0 0">
          <h1 style="margin:0">🚗 SERA</h1>
          <p style="margin:4px 0 0">PT Serasi Autoraya — Astra Group</p>
        </div>
        <div style="border:1px solid #ddd;border-top:none;padding:24px;border-radius:0 0 8px 8px">
          <h2>Invoice Order</h2>
          <p>Halo <strong>${userName}</strong>,</p>
          <p>Terima kasih atas pesanan Anda. Berikut detail invoice:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <thead>
              <tr style="background:#f5f5f5">
                <th style="padding:8px;border:1px solid #ddd;text-align:left">Produk</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:center">Qty</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:right">Harga Satuan</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:right">Subtotal</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
            <tfoot>
              <tr style="background:#f5f5f5;font-weight:bold">
                <td colspan="3" style="padding:8px;border:1px solid #ddd;text-align:right">Total</td>
                <td style="padding:8px;border:1px solid #ddd;text-align:right">Rp ${Number(order?.totalPrice || 0).toLocaleString('id-ID')}</td>
              </tr>
            </tfoot>
          </table>
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Status:</strong> ${order?.status || 'pending'}</p>
          <p><strong>Tanggal:</strong> ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
          <hr style="margin:24px 0">
          <p style="color:#666;font-size:12px">Email ini dikirim otomatis oleh sistem SERA. Jangan balas email ini.</p>
        </div>
      </body>
      </html>`;
  }
}
