// Database query analysis and optimization utilities

import { PrismaClient } from '@prisma/client';

/**
 * Helper class to optimize Prisma queries and reduce N+1 problems
 */
export class QueryOptimizer {
  private prisma: PrismaClient;
  private queryLog: Map<string, QueryMetrics> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get songs with related data (album, uploader)
   * Avoid N+1 by using include
   */
  async getSongsOptimized(limit: number = 100) {
    return this.prisma.song.findMany({
      include: {
        album: true,
        uploader: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      take: limit,
    });
  }

  /**
   * Get recommendations efficiently with select() to minimize data transfer
   */
  async getRecommendationsOptimized(limit: number = 50) {
    return this.prisma.song.findMany({
      select: {
        id: true,
        title: true,
        artist: true,
        albumName: true,
        duration: true,
        coverUrl: true,
        popularity: true,
      },
      where: {
        available: true,
      },
      orderBy: {
        popularity: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get user playlists efficiently
   */
  async getUserPlaylistsOptimized(userId: string, limit: number = 20) {
    return this.prisma.playlist.findMany({
      select: {
        id: true,
        title: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            songs: true,
          },
        },
      },
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Batch fetch users efficiently
   */
  async getUsersBatch(userIds: string[]) {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        plan: true,
      },
      where: {
        id: { in: userIds },
      },
    });
  }

  /**
   * Track query performance
   */
  recordQuery(query: string, duration: number) {
    const existing = this.queryLog.get(query) || {
      count: 0,
      totalTime: 0,
      maxTime: 0,
      minTime: Infinity,
    };

    this.queryLog.set(query, {
      count: existing.count + 1,
      totalTime: existing.totalTime + duration,
      maxTime: Math.max(existing.maxTime, duration),
      minTime: Math.min(existing.minTime, duration),
    });
  }

  /**
   * Get slowest queries for optimization
   */
  getSlowestQueries(limit: number = 10) {
    return Array.from(this.queryLog.entries())
      .sort((a, b) => b[1].totalTime - a[1].totalTime)
      .slice(0, limit)
      .map(([query, metrics]) => ({
        query,
        avgTime: metrics.totalTime / metrics.count,
        maxTime: metrics.maxTime,
        count: metrics.count,
      }));
  }
}

interface QueryMetrics {
  count: number;
  totalTime: number;
  maxTime: number;
  minTime: number;
}

export default QueryOptimizer;
