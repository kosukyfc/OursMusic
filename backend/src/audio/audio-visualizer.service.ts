import { Injectable } from '@nestjs/common';

@Injectable()
export class AudioVisualizerService {
  getVisualizerConfig(type: 'bars' | 'waveform' | 'circular' | 'spectrum' = 'bars') {
    const configs = {
      bars: {
        type: 'bars',
        barCount: 32,
        barWidth: 2,
        barGap: 2,
        smoothing: 0.8,
        responseTime: 100,
      },
      waveform: {
        type: 'waveform',
        pointCount: 100,
        smoothing: 0.9,
        lineWidth: 2,
        responseTime: 50,
      },
      circular: {
        type: 'circular',
        radius: 150,
        particleCount: 360,
        smoothing: 0.85,
        responseTime: 80,
      },
      spectrum: {
        type: 'spectrum',
        bandCount: 128,
        frequencyMin: 20,
        frequencyMax: 20000,
        scale: 'logarithmic',
      },
    };

    return configs[type] || configs.bars;
  }

  async recordVisualizerPreference(userId: string, type: string) {
    return {
      userId,
      selectedVisualizer: type,
      timestamp: new Date(),
    };
  }
}
