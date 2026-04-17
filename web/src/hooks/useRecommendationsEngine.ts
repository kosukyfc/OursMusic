import { PlayHistoryEntry } from './usePlayHistory';

interface Song {
  id: string;
  title: string;
  artist?: string;
  genre?: string;
  albumName?: string;
  duration: number;
}

export interface Recommendation {
  song: Song;
  score: number; // 0-1
  reason: string;
}

/**
 * 🤖 useRecommendationsEngine — Suggests songs based on play history
 *
 * Scoring factors:
 * - Same artist as frequently played
 * - Same genre as top genres
 * - Similar duration pattern
 * - Time-based context (workout during day, chill at night)
 * - Diversity consideration (avoid same songs)
 */
export function useRecommendationsEngine() {
  return {
    /**
     * Generate recommendations based on history and available songs
     */
    generateRecommendations: (
      allSongs: Song[],
      history: PlayHistoryEntry[],
      limit: number = 10,
    ): Recommendation[] => {
      if (history.length === 0 || allSongs.length === 0) return [];

      // Track artist frequency
      const artistPlays = new Map<string, number>();
      const genrePlays = new Map<string, number>();
      let totalPlayDuration = 0;
      const playedSongIds = new Set<string>();

      // Analyze history
      for (const entry of history) {
        artistPlays.set(entry.artist || 'Unknown', (artistPlays.get(entry.artist || 'Unknown') ?? 0) + 1);
        playedSongIds.add(entry.songId);
        totalPlayDuration += entry.duration;
      }

      // Calculate average duration preference
      const avgDuration = history.length > 0 ? totalPlayDuration / history.length : 180;

      // Get top artists and genres
      const topArtists = [...artistPlays.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);

      // Score each unplayed song
      const recommendations: Recommendation[] = allSongs
        .filter(song => !playedSongIds.has(song.id)) // Exclude already played
        .map(song => {
          let score = 0;
          let reasons: string[] = [];

          // 1. Artist match (40 points max)
          if (topArtists.includes(song.artist || '')) {
            score += 40;
            reasons.push(`You love ${song.artist}`);
          }

          // 2. Genre match (30 points max)
          if (song.genre && genrePlays.has(song.genre)) {
            score += 30 * ((genrePlays.get(song.genre) ?? 0) / Math.max(1, ...genrePlays.values()));
            reasons.push(`You play a lot of ${song.genre}`);
          }

          // 3. Duration match (20 points max - prefer similar length)
          const durationDiff = Math.abs(song.duration - avgDuration);
          const durationScore = Math.max(0, 20 - (durationDiff / 60) * 2);
          score += durationScore;
          if (durationScore > 10) reasons.push(`Similar length to your usual songs`);

          // 4. Diversity bonus for different artists (10 points max)
          if (!topArtists.includes(song.artist || '')) {
            score += 10;
            reasons.push(`Expand your horizons`);
          }

          // 5. Time-based context
          const hour = new Date().getHours();
          if (hour >= 22 || hour < 6) {
            // Night hours: prefer slower songs
            if ((song.duration / 60) > 3) {
              score += 5;
              reasons.push(`Perfect for evening listening`);
            }
          } else if (hour >= 9 && hour < 17) {
            // Work hours: prefer energetic, shorter songs
            if ((song.duration / 60) < 3.5) {
              score += 5;
              reasons.push(`Good for daytime energy`);
            }
          }

          return {
            song,
            score: Math.min(100, score),
            reason: reasons.join(', ') || 'Recommended for you',
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(rec => ({ ...rec, score: rec.score / 100 })); // Normalize to 0-1

      return recommendations;
    },

    /**
     * Get trending songs based on global play counts (stub — would use backend)
     */
    getTrending: (allSongs: Song[], limit: number = 10): Song[] => {
      return allSongs.slice(0, limit);
    },

    /**
     * Get songs similar to a specific track
     */
    getSimilar: (targetSong: Song, allSongs: Song[], limit: number = 5): Song[] => {
      const similar = allSongs
        .filter(s => s.id !== targetSong.id)
        .map(s => ({
          song: s,
          score: 0 +
            (s.artist === targetSong.artist ? 50 : 0) + // Same artist
            (s.genre === targetSong.genre ? 30 : 0) + // Same genre
            (Math.abs(s.duration - targetSong.duration) < 30 ? 20 : 0), // Similar duration
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(e => e.song);

      return similar;
    },
  };
}
