import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrometheusService } from './prometheus.service';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private prometheus: PrometheusService) {}

  /**
   * Prometheus metrics endpoint
   * Scrape this endpoint for metrics collection
   */
  @Get()
  @ApiOperation({ summary: 'Prometheus metrics' })
  async getMetrics(): Promise<string> {
    return this.prometheus.getMetrics();
  }

  /**
   * System health check
   */
  @Get('health')
  @ApiOperation({ summary: 'Application health status' })
  async health() {
    return {
      status: 'ok',
      timestamp: new Date(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid,
    };
  }
}
