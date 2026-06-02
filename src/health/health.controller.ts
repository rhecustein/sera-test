import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/decorators/public.decorator';
import Redis from 'ioredis';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check — DB + Redis status' })
  async check() {
    let dbStatus = 'disconnected';
    let redisStatus = 'disconnected';

    try {
      const result = await this.health.check([
        () => this.db.pingCheck('database'),
      ]);
      dbStatus = result.details?.database?.status === 'up' ? 'connected' : 'disconnected';
    } catch {
      dbStatus = 'disconnected';
    }

    try {
      const redis = new Redis({
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        connectTimeout: 3000,
        lazyConnect: true,
      });
      await redis.connect();
      await redis.ping();
      await redis.quit();
      redisStatus = 'connected';
    } catch {
      redisStatus = 'disconnected';
    }

    const allOk = dbStatus === 'connected' && redisStatus === 'connected';

    if (!allOk) {
      throw new ServiceUnavailableException({
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        database: dbStatus,
        redis: redisStatus,
      });
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: dbStatus,
      redis: redisStatus,
    };
  }
}
