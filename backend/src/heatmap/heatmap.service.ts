import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HeatmapService {
  constructor(private prisma: PrismaService) {}

  async recordListening(userId: string) {
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7;
    const hour = now.getHours();

    return this.prisma.listeningHeatmap.upsert({
      where: { userId_dayOfWeek_hour: { userId, dayOfWeek, hour } },
      update: { count: { increment: 1 }, updatedAt: new Date() },
      create: { userId, dayOfWeek, hour, count: 1 },
    });
  }

  async getHeatmap(userId: string) {
    const entries = await this.prisma.listeningHeatmap.findMany({
      where: { userId },
      orderBy: [{ dayOfWeek: 'asc' }, { hour: 'asc' }],
    });

    // Build 7x24 grid
    const grid: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
    const total = entries.reduce((sum, e) => sum + e.count, 0);

    for (const entry of entries) {
      grid[entry.dayOfWeek][entry.hour] = entry.count;
    }

    return { grid, total, entries };
  }

  async getPeakTimes(userId: string) {
    const data = await this.getHeatmap(userId);
    let maxCount = 0;
    let peakDay = 0;
    let peakHour = 0;

    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        if (data.grid[d][h] > maxCount) {
          maxCount = data.grid[d][h];
          peakDay = d;
          peakHour = h;
        }
      }
    }

    return { peakDay, peakHour, maxCount };
  }
}
