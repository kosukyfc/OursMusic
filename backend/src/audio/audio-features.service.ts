import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AudioFeaturesService {
  constructor(private prisma: PrismaService) {}

  // Crossfade
  async setCrossfade(userId: string, enabled: boolean, duration: number) {
    return {
      userId,
      feature: 'crossfade',
      enabled,
      duration: Math.max(100, Math.min(10000, duration)),
      timestamp: new Date(),
    };
  }

  // Karaoke Mode
  async setKaraoke(userId: string, enabled: boolean, vocalReduction: number) {
    return {
      userId,
      feature: 'karaoke',
      enabled,
      vocalReduction: Math.max(0, Math.min(1, vocalReduction)),
      timestamp: new Date(),
    };
  }

  // Audio Ducking
  async setDucking(userId: string, enabled: boolean, reduction: number) {
    return {
      userId,
      feature: 'ducking',
      enabled,
      reductionAmount: Math.max(0, Math.min(1, reduction)),
      timestamp: new Date(),
    };
  }

  // Gapless Playback
  async setGapless(userId: string, enabled: boolean, queueOverlap?: number, preloadThreshold?: number) {
    return {
      userId,
      feature: 'gapless',
      enabled,
      queueOverlapMs: Math.max(0, Math.min(2000, queueOverlap || 500)),
      preloadThresholdMs: Math.max(1000, Math.min(10000, preloadThreshold || 3000)),
      timestamp: new Date(),
    };
  }
}
