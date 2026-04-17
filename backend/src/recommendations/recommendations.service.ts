import { Injectable } from '@nestjs/common';
// TODO: Enable caching when CacheModule is configured
// import { CACHE_MANAGER } from '@nestjs/cache-manager';
// import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';

export interface Recommendation {
  id: string;
  title: string;
  artist: string;
  genre: string;
  similarity: number; // 0-1 score
  reason: string; // "Similar to your favorite", "Popular in Jazz"
}

@Injectable()
export class RecommendationsService {
  private readonly cacheTtl = 24 * 60 * 60; // 24 hours

  constructor(
    private prisma: PrismaService,
    // TODO: Inject cache when available
    // @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  /**
   * Get personalized recommendations for user
   */
  async getRecommendations(userId: string, limit = 20): Promise<Recommendation[]> {
    // TODO: Add caching when CacheModule is available
    // const cacheKey = `recommendations:${userId}`;
    // const cached = await this.cache.get<Recommendation[]>(cacheKey);
    // if (cached) {
    //   return cached;
    // }

    // Get user's listening history
    const history = await this.getUserListeningHistory(userId);
    if (history.length === 0) {
      // Return popular songs if no history
      return this.getPopularSongs(limit);
    }

    // Extract features from user's favorite songs
    const userProfile = this.buildUserProfile(history);

    // Find similar songs
    const recommendations = await this.findSimilarSongs(userProfile, limit);

    // TODO: Cache results when CacheModule is available
    // await this.cache.set(cacheKey, recommendations, this.cacheTtl);

    return recommendations;
  }

  /**
   * Get user's recent listening history
   */
  private async getUserListeningHistory(userId: string): Promise<any[]> {
    return this.prisma.activityLog.findMany({
      where: {
        userId,
        action: 'play',
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: { song: true },
    });
  }

  /**
   * Build user profile from listening history
   * Extracts: genres, artists, features
   */
  private buildUserProfile(history: any[]): Record<string, any> {
    const genres: Record<string, number> = {};
    const artists: Record<string, number> = {};
    let totalDuration = 0;

    history.forEach(({ song }) => {
      // Genre frequency
      if (song.genre) {
        genres[song.genre] = (genres[song.genre] || 0) + 1;
      }

      // Artist frequency
      if (song.artist) {
        artists[song.artist] = (artists[song.artist] || 0) + 1;
      }

      totalDuration += song.duration || 0;
    });

    const topGenres = Object.entries(genres)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([genre]) => genre);

    const topArtists = Object.entries(artists)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([artist]) => artist);

    return {
      topGenres,
      topArtists,
      avgDuration: totalDuration / history.length,
      listeningCount: history.length,
    };
  }

  /**
   * Find songs similar to user profile
   */
  private async findSimilarSongs(
    userProfile: Record<string, any>,
    limit: number,
  ): Promise<Recommendation[]> {
    const { topGenres, topArtists } = userProfile;

    // Query songs matching genres or artists
    const songs = await this.prisma.song.findMany({
      where: {
        OR: [
          { genre: { in: topGenres } },
          { artist: { in: topArtists } },
        ],
      },
      orderBy: [{ popularity: 'desc' }, { playCount: 'desc' }],
      take: limit * 2,
    });

    // Calculate similarity scores and convert to recommendations
    return songs.slice(0, limit).map((song) => ({
      id: song.id,
      title: song.title,
      artist: song.artist || 'Unknown',
      genre: song.genre || 'Unknown',
      similarity: this.calculateSimilarity(song, topGenres, topArtists),
      reason: this.getRecommendationReason(song, topGenres, topArtists),
    }));
  }

  /**
   * Calculate similarity score (0-1)
   */
  private calculateSimilarity(
    song: any,
    userGenres: string[],
    userArtists: string[],
  ): number {
    let score = 0;

    // Genre match
    if (userGenres.includes(song.genre)) {
      score += 0.4;
    }

    // Artist match
    if (userArtists.includes(song.artist)) {
      score += 0.3;
    }

    // Popularity score
    const popularityNormalized = (song.popularity || 0) / 100;
    score += popularityNormalized * 0.3;

    return Math.min(score, 1);
  }

  /**
   * Get reason why song is recommended
   */
  private getRecommendationReason(
    song: any,
    userGenres: string[],
    userArtists: string[],
  ): string {
    if (userArtists.includes(song.artist)) {
      return `More from ${song.artist}`;
    }

    if (userGenres.includes(song.genre)) {
      return `Popular in ${song.genre}`;
    }

    return `You might like this`;
  }

  /**
   * Get popular songs (fallback for new users)
   */
  private async getPopularSongs(limit: number): Promise<Recommendation[]> {
    const songs = await this.prisma.song.findMany({
      orderBy: [{ popularity: 'desc' }, { playCount: 'desc' }],
      take: limit,
    });

    return songs.map((song) => ({
      id: song.id,
      title: song.title,
      artist: song.artist || 'Unknown',
      genre: song.genre || 'Unknown',
      similarity: 0.5,
      reason: 'Trending now',
    }));
  }

  /**
   * Get recommendations based on a specific song
   */
  async getSimilarSongs(songId: string, limit = 10): Promise<Recommendation[]> {
    const song = await this.prisma.song.findUnique({
      where: { id: songId },
    });

    if (!song) {
      throw new Error('Song not found');
    }

    const similar = await this.prisma.song.findMany({
      where: {
        AND: [
          { id: { not: songId } },
          {
            OR: [
              { genre: song.genre },
              { artist: song.artist },
            ],
          },
        ],
      },
      take: limit,
    });

    return similar.map((s) => ({
      id: s.id,
      title: s.title,
      artist: s.artist || 'Unknown',
      genre: s.genre || 'Unknown',
      similarity: this.calculateSongSimilarity(song, s),
      reason: `Similar to "${song.title}"`,
    }));
  }

  /**
   * Calculate similarity between two songs
   */
  private calculateSongSimilarity(song1: any, song2: any): number {
    let score = 0;

    if (song1.genre === song2.genre) score += 0.5;
    if (song1.artist === song2.artist) score += 0.5;

    return score;
  }
}
