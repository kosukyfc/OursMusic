import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SmartQueueService {
  constructor(private prisma: PrismaService) {}

  async recordPlay(userId: string, songId: string, duration: number) {
    return this.prisma.listeningHistory.create({
      data: {
        userId,
        songId,
        duration,
        completed: duration > 30000, // 30+ sec = completed
        playedAt: new Date(),
      },
    });
  }

  async getNextSuggestion(userId: string, mood: string, limit = 5) {
    const suggestions = await this.prisma.smartQueueSuggestion.findMany({
      where: { userId, mood },
      orderBy: { score: 'desc' },
      take: limit,
    });

    return suggestions;
  }

  async generateSuggestions(userId: string) {
    const history = await this.prisma.listeningHistory.findMany({
      where: { userId, completed: true },
      orderBy: { playedAt: 'desc' },
      take: 50,
    });

    // Mood-based grouping
    const moodMap: Record<string, string[]> = {
      happy: ['pop', 'funk', 'electronic'],
      sad: ['ballad', 'acoustic', 'indie'],
      energetic: ['rock', 'punk', 'dance'],
      chill: ['ambient', 'lo-fi', 'jazz'],
    };

    for (const [mood, genres] of Object.entries(moodMap)) {
      const score = Math.random() * 0.5 + 0.5; // 0.5-1.0
      // Link songs from those genres and create suggestions
    }
  }
}
