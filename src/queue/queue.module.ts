import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OrderJobsProducer } from './jobs/order-jobs.producer';
import { EmailProcessor } from './processors/email.processor';
import { ActivityLogProcessor } from './processors/activity-log.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { FailedJob } from './entities/failed-job.entity';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

const queueNames = ['order-email', 'order-log', 'order-notif'];

@Module({
  imports: [
    TypeOrmModule.forFeature([FailedJob]),
    ActivityLogsModule,
    ...queueNames.map((name) =>
      BullModule.registerQueueAsync({
        name,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          redis: {
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        }),
      }),
    ),
  ],
  providers: [
    OrderJobsProducer,
    EmailProcessor,
    ActivityLogProcessor,
    NotificationProcessor,
  ],
  exports: [OrderJobsProducer],
})
export class QueueModule {}
