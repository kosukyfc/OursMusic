import { Module } from '@nestjs/common';
// TODO: Install @willsoto/nestjs-prometheus and prom-client to enable metrics
// import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MetricsController } from './metrics.controller';
import { PrometheusService } from './prometheus.service';

@Module({
  imports: [
    // PrometheusModule.register({
    //   path: '/metrics',
    //   defaultMetrics: {
    //     enabled: true,
    //   },
    //   defaultLabels: {
    //     app: 'oursmusic-backend',
    //     environment: process.env.NODE_ENV || 'development',
    //   },
    // }),
  ],
  // controllers: [MetricsController],
  providers: [PrometheusService],
  exports: [PrometheusService],
})
export class MetricsModule {}
