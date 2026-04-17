import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MusicTheoryService {
  constructor(private prisma: PrismaService) {}

  async analyzeSongTheory(songId: string, audioBuffer?: Buffer) {
    // Mock analysis - in production would use librosa/essentia
    const analysis = {
      bpm: Math.floor(Math.random() * 120) + 60, // 60-180
      key: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][
        Math.floor(Math.random() * 12)
      ],
      scale: Math.random() > 0.5 ? 'Major' : 'Minor',
      energy: Math.random(),
      danceability: Math.random(),
    };

    return this.prisma.musicTheoryAnalysis.upsert({
      where: { songId },
      update: analysis,
      create: { ...analysis, songId },
    });
  }

  async getSongTheory(songId: string) {
    let theory = await this.prisma.musicTheoryAnalysis.findUnique({
      where: { songId },
    });

    if (!theory) {
      theory = await this.analyzeSongTheory(songId);
    }

    return theory;
  }

  async getQueueByKey(baseKey: string, limit = 10) {
    // Find songs with same or related key
    const keyMap: Record<string, string[]> = {
      C: ['C', 'G', 'F', 'Am'],
      'C#': ['C#', 'G#', 'F#', 'A#m'],
      D: ['D', 'A', 'G', 'Bm'],
      // ... etc
    };

    const relatedKeys = keyMap[baseKey] || [baseKey];

    return this.prisma.musicTheoryAnalysis.findMany({
      where: { key: { in: relatedKeys } },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}
