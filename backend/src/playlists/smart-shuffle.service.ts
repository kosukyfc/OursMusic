import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface SmartQueueContext {
  currentMood: string;
  energyLevel: number;
  timeOfDay: 'morning' | 'work' | 'evening' | 'night';
  activity: string; // running, focus, party, etc
  listeningHistory: string[];
  preferences: {
    genreVariety: number; // 0-1
    artistVariety: number; // 0-1
    tempoSmoothing: boolean;
    energyCurve: 'ascending' | 'descending' | 'stable';
  };
}

interface SmartShuffleResult {
  songId: string;
  score: number;
  reason: string; // Why this song was selected
  bpm: number;
  energy: number;
  valence: number;
}

@Injectable()
export class SmartShuffleService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate smart shuffled queue based on multiple factors
   */
  async generateSmartQueue(
    userId: string,
    playlistId: string,
    context: SmartQueueContext,
  ): Promise<SmartShuffleResult[]> {
    // Get all tracks in playlist
    const playlist = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        songs: {
          include: {
            song: true,
          },
        },
      },
    });

    if (!playlist) return [];

    const tracks = (playlist.songs || []).map((pt) => ({
      ...pt.song,
      index: pt.position,
    }));

    // Calculate score for each track
    const scoredTracks = tracks.map((track) => {
      const score = this.calculateTrackScore(track, context);
      return {
        ...track,
        score,
        reason: this.getSelectionReason(track, context, score),
      };
    });

    // Apply genre variety constraint (avoid consecutive same genre)
    const diversified = this.applyGenreDiversity(scoredTracks, context.preferences.genreVariety);

    // Apply artist variety constraint (avoid consecutive same artist)
    const artistDiversified = this.applyArtistDiversity(diversified, context.preferences.artistVariety);

    // Apply tempo smoothing if enabled
    let final = artistDiversified;
    if (context.preferences.tempoSmoothing) {
      final = this.applyTempoSmoothing(artistDiversified);
    }

    // Apply energy curve
    final = this.applyEnergyCurve(final, context.preferences.energyCurve);

    return final.slice(0, 100); // Return top 100
  }

  /**
   * Calculate score for a track based on context
   */
  private calculateTrackScore(track: any, context: SmartQueueContext): number {
    let score = 0;

    // 1. Mood alignment (30% weight)
    const moodScore = this.calculateMoodAlignment(track, context.currentMood);
    score += moodScore * 0.3;

    // 2. Energy level alignment (25% weight)
    const energyScore = Math.abs(track.audioFeatures.energy - context.energyLevel) ? 0 : 1;
    score += (1 - Math.abs(track.audioFeatures.energy - context.energyLevel)) * 0.25;

    // 3. Time of day preference (15% weight)
    const timeScore = this.calculateTimeOfDayScore(track, context.timeOfDay);
    score += timeScore * 0.15;

    // 4. Activity match (15% weight)
    const activityScore = this.calculateActivityScore(track, context.activity);
    score += activityScore * 0.15;

    // 5. User preferences (10% weight)
    const prefScore = this.calculatePreferenceScore(track, context.listeningHistory);
    score += prefScore * 0.1;

    // 6. Recency boost - avoid recently played
    const recencyBoost = context.listeningHistory.includes(track.id) ? -0.2 : 0;
    score += recencyBoost;

    // Normalize to 0-1
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate mood alignment score
   */
  private calculateMoodAlignment(track: any, mood: string): number {
    const moodFeatures: Record<string, { valence: [number, number]; acousticness: [number, number] }> = {
      happy: { valence: [0.7, 1.0], acousticness: [0.0, 0.6] },
      energetic: { valence: [0.6, 1.0], acousticness: [0.0, 0.7] },
      sad: { valence: [0.0, 0.3], acousticness: [0.3, 1.0] },
      calm: { valence: [0.3, 0.6], acousticness: [0.5, 1.0] },
      focus: { valence: [0.4, 0.7], acousticness: [0.0, 0.5] },
      romantic: { valence: [0.5, 0.8], acousticness: [0.4, 0.9] },
      dark: { valence: [0.0, 0.4], acousticness: [0.0, 0.4] },
      party: { valence: [0.7, 1.0], acousticness: [0.0, 0.3] },
    };

    const features = moodFeatures[mood];
    if (!features) return 0.5;

    const valenceInRange =
      track.audioFeatures.valence >= features.valence[0] &&
      track.audioFeatures.valence <= features.valence[1]
        ? 1
        : 0;

    const acousticnessInRange =
      track.audioFeatures.acousticness >= features.acousticness[0] &&
      track.audioFeatures.acousticness <= features.acousticness[1]
        ? 1
        : 0;

    return (valenceInRange + acousticnessInRange) / 2;
  }

  /**
   * Calculate time of day score
   */
  private calculateTimeOfDayScore(track: any, timeOfDay: string): number {
    const timeScores: Record<string, { energy: [number, number]; tempo: [number, number] }> = {
      morning: { energy: [0.6, 1.0], tempo: [100, 140] },
      work: { energy: [0.5, 0.8], tempo: [90, 130] },
      evening: { energy: [0.3, 0.6], tempo: [80, 110] },
      night: { energy: [0.0, 0.3], tempo: [60, 100] },
    };

    const scores = timeScores[timeOfDay];
    if (!scores) return 0.5;

    const energyMatch =
      track.audioFeatures.energy >= scores.energy[0] && track.audioFeatures.energy <= scores.energy[1] ? 1 : 0;

    const tempoMatch =
      track.audioFeatures.tempo >= scores.tempo[0] && track.audioFeatures.tempo <= scores.tempo[1] ? 1 : 0;

    return (energyMatch + tempoMatch) / 2;
  }

  /**
   * Calculate activity-specific score
   */
  private calculateActivityScore(track: any, activity: string): number {
    const activityBands: Record<string, { bpmMin: number; bpmMax: number; energy: [number, number] }> = {
      running: { bpmMin: 140, bpmMax: 180, energy: [0.7, 1.0] },
      cycling: { bpmMin: 120, bpmMax: 160, energy: [0.6, 0.9] },
      gym: { bpmMin: 130, bpmMax: 170, energy: [0.7, 1.0] },
      yoga: { bpmMin: 60, bpmMax: 100, energy: [0.2, 0.5] },
      focus: { bpmMin: 80, bpmMax: 120, energy: [0.3, 0.6] },
      party: { bpmMin: 110, bpmMax: 140, energy: [0.8, 1.0] },
      sleep: { bpmMin: 50, bpmMax: 80, energy: [0.0, 0.2] },
    };

    const band = activityBands[activity];
    if (!band) return 0.5;

    const bpmMatch = track.audioFeatures.tempo >= band.bpmMin && track.audioFeatures.tempo <= band.bpmMax ? 1 : 0;

    const energyMatch =
      track.audioFeatures.energy >= band.energy[0] && track.audioFeatures.energy <= band.energy[1] ? 1 : 0;

    return (bpmMatch + energyMatch) / 2;
  }

  /**
   * Calculate user preference score
   */
  private calculatePreferenceScore(track: any, listeningHistory: string[]): number {
    const recentPlays = listeningHistory.slice(0, 50).length;
    const decayFactor = 1 - recentPlays / 100;
    return decayFactor;
  }

  /**
   * Apply genre diversity constraint
   */
  private applyGenreDiversity(
    tracks: any[],
    varietyFactor: number,
  ): any[] {
    if (varietyFactor === 0) return tracks; // No diversity needed

    const result: any[] = [];
    const genreCounts: Record<string, number> = {};

    // Sort by score descending
    const sorted = [...tracks].sort((a, b) => b.score - a.score);

    for (const track of sorted) {
      const genre = track.genre || 'unknown';
      const count = genreCounts[genre] || 0;

      // Allow more of the same genre as varietyFactor increases (0-1)
      const maxSameGenre = Math.max(1, Math.floor((1 - varietyFactor) * 5));

      if (count < maxSameGenre) {
        result.push(track);
        genreCounts[genre] = count + 1;
      }
    }

    return result;
  }

  /**
   * Apply artist diversity constraint
   */
  private applyArtistDiversity(tracks: any[], varietyFactor: number): any[] {
    if (varietyFactor === 0) return tracks;

    const result: any[] = [];
    const artistCounts: Record<string, number> = {};

    for (const track of tracks) {
      const artist = track.artistId || 'unknown';
      const count = artistCounts[artist] || 0;
      const maxSameArtist = Math.max(1, Math.floor((1 - varietyFactor) * 3));

      if (count < maxSameArtist) {
        result.push(track);
        artistCounts[artist] = count + 1;
      }
    }

    return result;
  }

  /**
   * Apply tempo smoothing - avoid big tempo jumps
   */
  private applyTempoSmoothing(tracks: any[]): any[] {
    if (tracks.length === 0) return tracks;

    const result = [tracks[0]];
    let prevTempo = tracks[0].audioFeatures.tempo;

    for (let i = 1; i < tracks.length; i++) {
      const tempoJump = Math.abs(tracks[i].audioFeatures.tempo - prevTempo);

      // Prefer songs that are close in tempo to previous
      if (tempoJump < 30) {
        result.push(tracks[i]);
        prevTempo = tracks[i].audioFeatures.tempo;
      }
    }

    return result.length > 10 ? result : tracks;
  }

  /**
   * Apply energy curve preference
   */
  private applyEnergyCurve(tracks: any[], curve: 'ascending' | 'descending' | 'stable'): any[] {
    if (curve === 'stable') return tracks;

    const sorted = [...tracks];

    if (curve === 'ascending') {
      // Sort by energy ascending
      sorted.sort((a, b) => a.audioFeatures.energy - b.audioFeatures.energy);
    } else if (curve === 'descending') {
      // Sort by energy descending
      sorted.sort((a, b) => b.audioFeatures.energy - a.audioFeatures.energy);
    }

    return sorted;
  }

  /**
   * Get explanation for why track was selected
   */
  private getSelectionReason(track: any, context: SmartQueueContext, score: number): string {
    const reasons: string[] = [];

    if (score > 0.8) reasons.push(`Perfect match for ${context.currentMood} mood`);
    if (score > 0.6) reasons.push(`Fits ${context.timeOfDay} routine`);
    if (score > 0.4) reasons.push(`Popular in your collection`);

    return reasons.length > 0 ? reasons.join(', ') : 'Recommended ';
  }
}
