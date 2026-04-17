import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TempoControlService {
  constructor(private prisma: PrismaService) {}

  async setTempoPreset(userId: string, speed: number, presetName?: string) {
    const normalizedSpeed = Math.max(0.5, Math.min(2, speed));
    
    return {
      userId,
      speed: normalizedSpeed,
      presetName: presetName || 'custom',
      availablePresets: [
        { name: 'slowmo', speed: 0.5 },
        { name: 'normal', speed: 1 },
        { name: 'faster', speed: 1.5 },
        { name: 'fast', speed: 2 },
      ],
      timestamp: new Date(),
    };
  }

  async getTempoHistory(userId: string, limit = 10) {
    return {
      userId,
      recentSpeeds: [1, 1.5, 0.5, 1, 1, 0.75, 1, 1, 1, 1].slice(0, limit),
    };
  }
}
