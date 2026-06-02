import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLog } from './entities/activity-log.entity';

describe('ActivityLogsService', () => {
  let service: ActivityLogsService;

  const mockLog: ActivityLog = {
    id: 'log-uuid-1',
    userId: 'user-uuid-1',
    action: 'ORDER_CREATED',
    entity: 'order',
    entityId: 'order-uuid-1',
    payload: { totalPrice: 500000 },
    ipAddress: '127.0.0.1',
    createdAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogsService,
        {
          provide: getRepositoryToken(ActivityLog),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ActivityLogsService>(ActivityLogsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an activity log', async () => {
      mockRepository.create.mockReturnValue(mockLog);
      mockRepository.save.mockResolvedValue(mockLog);

      const result = await service.create({
        userId: 'user-uuid-1',
        action: 'ORDER_CREATED',
        entity: 'order',
        entityId: 'order-uuid-1',
        payload: { totalPrice: 500000 },
        ipAddress: '127.0.0.1',
      });

      expect(result).toEqual(mockLog);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('findByUser', () => {
    it('should return logs for a user', async () => {
      mockRepository.find.mockResolvedValue([mockLog]);

      const result = await service.findByUser('user-uuid-1');

      expect(result).toHaveLength(1);
      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-uuid-1' } }),
      );
    });

    it('should return empty array when no logs', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findByUser('nonexistent');
      expect(result).toHaveLength(0);
    });
  });
});
