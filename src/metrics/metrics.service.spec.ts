import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { MetricsService } from './metrics.service';

const mockQueue = () => ({
  getWaitingCount: jest.fn().mockResolvedValue(0),
  getActiveCount: jest.fn().mockResolvedValue(0),
  getFailedCount: jest.fn().mockResolvedValue(0),
});

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MetricsService,
        { provide: getQueueToken('order-email'), useFactory: mockQueue },
        { provide: getQueueToken('order-activity'), useFactory: mockQueue },
        { provide: getQueueToken('order-notification'), useFactory: mockQueue },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  it('should start with zero metrics', async () => {
    const metrics = await service.getMetrics();
    expect(metrics.total_requests).toBe(0);
    expect(metrics.total_errors).toBe(0);
    expect(metrics.avg_response_time_ms).toBe(0);
  });

  it('should increment total_requests', async () => {
    service.increment();
    service.increment();
    const metrics = await service.getMetrics();
    expect(metrics.total_requests).toBe(2);
  });

  it('should increment total_errors', async () => {
    service.incrementErrors();
    const metrics = await service.getMetrics();
    expect(metrics.total_errors).toBe(1);
  });

  it('should calculate average response time', async () => {
    service.recordResponseTime(100);
    service.recordResponseTime(200);
    service.recordResponseTime(300);
    const metrics = await service.getMetrics();
    expect(metrics.avg_response_time_ms).toBe(200);
  });

  it('should return zero avg when no response times recorded', async () => {
    const metrics = await service.getMetrics();
    expect(metrics.avg_response_time_ms).toBe(0);
  });

  it('should cap response times at 1000 entries', async () => {
    for (let i = 0; i < 1001; i++) {
      service.recordResponseTime(50);
    }
    const metrics = await service.getMetrics();
    expect(metrics.avg_response_time_ms).toBe(50);
  });

  it('should include queue_pending and queue_failed in metrics', async () => {
    const metrics = await service.getMetrics();
    expect(metrics).toHaveProperty('queue_pending');
    expect(metrics).toHaveProperty('queue_failed');
    expect(metrics.queue_pending).toBe(0);
    expect(metrics.queue_failed).toBe(0);
  });
});
