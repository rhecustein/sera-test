import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './entities/activity-log.entity';

export interface CreateActivityLogDto {
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  payload?: Record<string, any>;
  ipAddress?: string;
}

@Injectable()
export class ActivityLogsService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
  ) {}

  async create(dto: CreateActivityLogDto): Promise<ActivityLog> {
    const log = this.activityLogRepository.create(dto);
    return this.activityLogRepository.save(log);
  }

  async findByUser(userId: string): Promise<ActivityLog[]> {
    return this.activityLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
