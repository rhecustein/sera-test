import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('activity_logs')
@Index(['userId'])
@Index(['action'])
@Index(['createdAt'])
export class ActivityLog {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ format: 'uuid', nullable: true, required: false })
  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @ApiProperty()
  @Column({ length: 255 })
  action: string;

  @ApiProperty({ nullable: true, required: false })
  @Column({ length: 255, nullable: true })
  entity: string;

  @ApiProperty({ nullable: true, required: false })
  @Column({ name: 'entity_id', length: 255, nullable: true })
  entityId: string;

  @ApiProperty({ nullable: true, required: false })
  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any>;

  @ApiProperty({ nullable: true, required: false })
  @Column({ name: 'ip_address', length: 50, nullable: true })
  ipAddress: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
