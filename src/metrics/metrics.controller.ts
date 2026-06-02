import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get application metrics — requests, errors, latency, queue status' })
  async getMetrics() {
    return {
      message: 'Metrics fetched successfully',
      data: await this.metricsService.getMetrics(),
    };
  }
}
