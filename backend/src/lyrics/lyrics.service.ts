import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
// TODO: Enable caching when CacheModule is configured
// import { CACHE_MANAGER } from '@nestjs/cache-manager';
// import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface Lyric {
  time: number; // timestamp in ms
  text: string;
}

export interface SongLyrics {
  id: string;
  title: string;
  artist: string;
  lyrics: Lyric[];
  provider: 'genius' | 'musixmatch' | 'cached';
  syncedAt?: Date;
}

@Injectable()
export class LyricsService {
  private readonly geniusToken = process.env.GENIUS_ACCESS_TOKEN;
  private readonly musixmatchKey = process.env.MUSIXMATCH_API_KEY;
  private readonly cacheTtl = 7 * 24 * 60 * 60; // 7 days

  constructor(
    private httpService: HttpService,
    // TODO: Inject cache when available
    // @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  /**
   * Get lyrics for a song
   */
  async getLyrics(
    songId: string,
    title: string,
    artist: string,
  ): Promise<SongLyrics> {
    // TODO: Add caching when CacheModule is available
    // const cacheKey = `lyrics:${songId}`;
    // const cached = await this.cache.get<SongLyrics>(cacheKey);
    // if (cached) {
    //   return { ...cached, provider: 'cached' };
    // }

    try {
      // Try Genius first (better syncing)
      const lyrics = await this.fetchFromGenius(title, artist);
      if (lyrics) {
        // TODO: Cache when available
        // await this.cache.set(cacheKey, lyrics, this.cacheTtl);
        return lyrics;
      }

      // Fallback to Musixmatch
      const musixLyrics = await this.fetchFromMusixmatch(title, artist);
      if (musixLyrics) {
        // TODO: Cache when available
        // await this.cache.set(cacheKey, musixLyrics, this.cacheTtl);
        return musixLyrics;
      }

      throw new HttpException('Lyrics not found', HttpStatus.NOT_FOUND);
    } catch (error) {
      throw new HttpException(
        `Failed to fetch lyrics: ${error.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Fetch from Genius API
   * https://genius.com/api-clients
   */
  private async fetchFromGenius(title: string, artist: string): Promise<SongLyrics | null> {
    if (!this.geniusToken) return null;

    try {
      const searchUrl = 'https://api.genius.com/search';
      const response = await firstValueFrom(
        this.httpService.get(searchUrl, {
          params: {
            q: `${title} ${artist}`,
            access_token: this.geniusToken,
          },
        }),
      );

      const hits = response.data?.response?.hits || [];
      if (hits.length === 0) return null;

      // Get top match
      const song = hits[0].result;
      
      // Return lyrics in expected format
      // Note: For production, integrate cheerio to scrape the actual lyrics
      const mockLyrics = this.generateMockLyrics(song.title);
      
      return {
        id: song.id,
        title: song.title,
        artist: song.primary_artist.name,
        lyrics: mockLyrics,
        provider: 'genius',
        syncedAt: new Date(),
      };
    } catch (error) {
      console.error('Genius API error:', error);
      return null;
    }
  }

  /**
   * Generate mock lyrics for demo/development
   * In production, implement actual web scraping with cheerio
   */
  private generateMockLyrics(title: string): Lyric[] {
    const demoLyrics = [
      { time: 0, text: `♪ ${title} ♪` },
      { time: 2000, text: 'Verse 1' },
      { time: 4000, text: 'This is synchronized lyrics' },
      { time: 6000, text: 'Following the music playback' },
      { time: 8000, text: 'Choir' },
      { time: 10000, text: 'Chorus section' },
      { time: 12000, text: 'Verse 2' },
      { time: 14000, text: 'More lyrics here' },
    ];
    return demoLyrics;
  }

  /**
   * Fetch from Musixmatch API
   * https://developer.musixmatch.com
   */
  private async fetchFromMusixmatch(title: string, artist: string): Promise<SongLyrics | null> {
    if (!this.musixmatchKey) return null;

    try {
      const matchUrl = 'https://api.musixmatch.com/ws/1.1/matcher.lyrics.get';
      const response = await firstValueFrom(
        this.httpService.get(matchUrl, {
          params: {
            q_track: title,
            q_artist: artist,
            apikey: this.musixmatchKey,
          },
        }),
      );

      const lyrics = response.data?.message?.body?.lyrics?.lyrics_body;
      if (!lyrics) return null;

      const lines = lyrics
        .split('\n')
        .filter((line: string) => line.trim())
        .map((text: string) => ({
          time: 0, // Musixmatch doesn't provide exact sync
          text,
        }));

      return {
        id: `mm_${Date.now()}`,
        title,
        artist,
        lyrics: lines as Lyric[],
        provider: 'musixmatch',
        syncedAt: new Date(),
      };
    } catch (error) {
      console.error('Musixmatch API error:', error);
      return null;
    }
  }

  /**
   * Parse LRC format (common lyrics sync format)
   * [00:12.00]Lyrics line here
   * [00:17.20]Next line
   */
  parseLrc(lrcContent: string): Lyric[] {
    const lrcRegex = /\[(\d{2}):(\d{2})\.(\d{2})\](.+)/g;
    const lyrics: Lyric[] = [];
    let match;

    while ((match = lrcRegex.exec(lrcContent)) !== null) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const centiseconds = parseInt(match[3]);
      const time = (minutes * 60 + seconds) * 1000 + centiseconds * 10;
      const text = match[4];

      lyrics.push({ time, text });
    }

    return lyrics;
  }

  /**
   * Convert lyrics to LRC format
   */
  toLrc(lyrics: Lyric[]): string {
    return lyrics
      .map(({ time, text }) => {
        const totalSeconds = Math.floor(time / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const centiseconds = Math.floor((time % 1000) / 10);
        return `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}]${text}`;
      })
      .join('\n');
  }
}
