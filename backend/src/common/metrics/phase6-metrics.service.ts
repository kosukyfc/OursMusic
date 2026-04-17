import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram } from 'prom-client';

@Injectable()
export class Phase6MetricsService {
  // Counters
  private featureToggleCounter = new Counter({
    name: 'phase6_feature_toggle_total',
    help: 'Total feature toggle count',
    labelNames: ['feature_name', 'action'],
  });

  private voiceCommandCounter = new Counter({
    name: 'phase6_voice_commands_total',
    help: 'Total voice commands processed',
    labelNames: ['command_type', 'success'],
  });

  private setlistOperationCounter = new Counter({
    name: 'phase6_setlist_operations_total',
    help: 'Total setlist operations',
    labelNames: ['operation_type'],
  });

  // Gauges
  private activeUsersGauge = new Gauge({
    name: 'phase6_active_users_gauge',
    help: 'Current active Phase 6 users',
    labelNames: ['feature_name'],
  });

  private heatmapExpensiveGauge = new Gauge({
    name: 'phase6_heatmap_peak_users_gauge',
    help: 'Users listening during peak times',
  });

  // Histograms
  private featureResponseTime = new Histogram({
    name: 'phase6_feature_response_time_ms',
    help: 'Response time for Phase 6 endpoints in milliseconds',
    labelNames: ['endpoint'],
    buckets: [10, 50, 100, 500, 1000, 2000, 5000],
  });

  private analyzeLatency = new Histogram({
    name: 'phase6_music_theory_analyze_duration_ms',
    help: 'Duration of music theory analysis',
    buckets: [5, 10, 25, 50, 100, 250, 500],
  });

  // Track feature toggle
  trackFeatureToggle(featureName: string, action: 'enable' | 'disable') {
    this.featureToggleCounter.inc({ feature_name: featureName, action });
  }

  // Track voice command
  trackVoiceCommand(commandType: string, success: boolean) {
    this.voiceCommandCounter.inc({ command_type: commandType, success: success ? 'true' : 'false' });
  }

  // Track setlist operation
  trackSetlistOperation(operationType: 'create' | 'update' | 'delete' | 'reorder') {
    this.setlistOperationCounter.inc({ operation_type: operationType });
  }

  // Update active users
  updateActiveUsers(featureName: string, count: number) {
    this.activeUsersGauge.set({ feature_name: featureName }, count);
  }

  // Update heatmap peak
  updateHeatmapPeak(count: number) {
    this.heatmapExpensiveGauge.set(count);
  }

  // Record feature response time
  recordFeatureResponseTime(endpoint: string, duration: number) {
    this.featureResponseTime.observe({ endpoint }, duration);
  }

  // Record analyze latency
  recordAnalyzeLatency(duration: number) {
    this.analyzeLatency.observe(duration);
  }
}
