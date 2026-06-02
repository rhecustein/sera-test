import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('failed_jobs')
export class FailedJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_id', type: 'varchar', length: 255 })
  jobId: string;

  @Column({ name: 'job_name', type: 'varchar', length: 255 })
  jobName: string;

  @Column({ name: 'queue_name', type: 'varchar', length: 100 })
  queueName: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any>;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'stack_trace', type: 'text', nullable: true })
  stackTrace: string;

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount: number;

  @CreateDateColumn({ name: 'failed_at' })
  failedAt: Date;
}
