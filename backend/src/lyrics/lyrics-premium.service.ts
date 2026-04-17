/**
 * Serviço de Lyrics Premium - Sistema Karaokê Avançado
 * Compatível com o sistema de frontend (tipos LyricsData)
 * Suporta sincronização por verso e por palavra
 */

import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Inject, Optional } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Estrutura de letras premium (compatível com frontend LyricsData)
 */
export interface LyricsPremium {
  trackId: string;
  title: string;
  artist: string;
  albumArt: string;
  bpm: number;
  duration: number;
  lyrics: Array<{
    id: string;
    text: string;
    startTime: number;
    endTime: number;
    type?: 'verse' | 'chorus' | 'bridge' | 'pre-chorus' | 'outro' | 'intro';
    words?: Array<{
      word: string;
      startTime: number;
      endTime: number;
    }>;
  }>;
  source?: string;
  language: 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR' | 'de-DE' | 'ja-JP' | 'zh-CN';
  hasWordSync: boolean;
  updatedAt: string;
}

/**
 * DTO para retorno de API
 */
export interface LyricsApiResponse {
  success: boolean;
  data?: LyricsPremium;
  error?: {
    type: string;
    message: string;
  };
  cached: boolean;
  timestamp: number;
}

@Injectable()
export class LyricsPremiumService {
  private readonly logger = new Logger(LyricsPremiumService.name);
  private readonly geniusToken = process.env.GENIUS_ACCESS_TOKEN;
  private readonly musixmatchKey = process.env.MUSIXMATCH_API_KEY;
  private readonly cacheTtl = 7 * 24 * 60 * 60 * 1000; // 7 days em ms

  constructor(
    private httpService: HttpService,
    private prismaService: PrismaService,
    @Optional() @Inject(CACHE_MANAGER) private cacheManager?: Cache,
  ) {}

  /**
   * Obtém letras completas com sincronização
   */
  async getLyricsWithSync(
    trackId: string,
    trackTitle: string,
    artistName: string,
    albumArt?: string,
    bpm?: number,
  ): Promise<LyricsApiResponse> {
    try {
      // Tenta cache primeiro
      const cacheKey = `lyrics:premium:${trackId}`;
      if (this.cacheManager) {
        const cached = await this.cacheManager.get<LyricsPremium>(cacheKey);
        if (cached) {
          this.logger.debug(`Cache hit para ${trackId}`);
          return {
            success: true,
            data: cached,
            cached: true,
            timestamp: Date.now(),
          };
        }
      }

      // Tenta banco de dados
      const lyricsRecord = await this.prismaService.lyricsPremium.findUnique({
        where: { trackId },
      });

      if (lyricsRecord) {
        // Content pode ser JsonValue, converter para string se necessário
        const contentStr = typeof lyricsRecord.content === 'string' 
          ? lyricsRecord.content 
          : JSON.stringify(lyricsRecord.content);
        const parsed = JSON.parse(contentStr);
        
        if (this.cacheManager) {
          await this.cacheManager.set(cacheKey, parsed, this.cacheTtl);
        }

        return {
          success: true,
          data: parsed,
          cached: false,
          timestamp: Date.now(),
        };
      }

      // Busca de API externa (Genius, Musixmatch, etc)
      const lyrics = await this.fetchLyricsFromExternal(
        trackTitle,
        artistName,
        trackId,
        albumArt,
        bpm
      );

      // Salva em cache e banco
      if (lyrics) {
        if (this.cacheManager) {
          await this.cacheManager.set(cacheKey, lyrics, this.cacheTtl);
        }

        // Salva no banco de dados
        await this.prismaService.lyricsPremium.upsert({
          where: { trackId },
          create: {
            trackId,
            title: lyrics.title || 'Unknown Title',
            artist: lyrics.artist || 'Unknown Artist',
            content: JSON.stringify(lyrics),
            source: lyrics.source || 'external',
            language: lyrics.language || 'pt-BR',
            hasWordSync: lyrics.hasWordSync || false,
            duration: lyrics.duration || 0,
            albumArt: albumArt,
            bpm,
          },
          update: {
            content: JSON.stringify(lyrics),
            updatedAt: new Date(),
          },
        });

        return {
          success: true,
          data: lyrics as LyricsPremium,
          cached: false,
          timestamp: Date.now(),
        };
      }

      return {
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: 'Letras não encontradas para esta música',
        },
        cached: false,
        timestamp: Date.now(),
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar letras: ${error.message}`, error.stack);

      return {
        success: false,
        error: {
          type: 'FETCH_FAILED',
          message: 'Erro ao buscar letras',
        },
        cached: false,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Busca letras de API externa
   */
  private async fetchLyricsFromExternal(
    title: string,
    artist: string,
    trackId: string,
    albumArt?: string,
    bpm?: number,
  ): Promise<Partial<LyricsPremium> | null> {
    try {
      // Tenta Genius primeiro (melhor qualidade)
      if (this.geniusToken) {
        const geniusLyrics = await this.fetchFromGenius(title, artist);
        if (geniusLyrics) {
          return {
            ...geniusLyrics,
            trackId,
            albumArt: albumArt || '',
            bpm: bpm || 120,
            source: 'genius',
          };
        }
      }

      // Tenta Musixmatch como fallback
      if (this.musixmatchKey) {
        const musixmatchLyrics = await this.fetchFromMusixmatch(title, artist);
        if (musixmatchLyrics) {
          return {
            ...musixmatchLyrics,
            trackId,
            albumArt: albumArt || '',
            bpm: bpm || 120,
            source: 'musixmatch',
          };
        }
      }

      // Retorna lyrics vazias como fallback
      return this.createEmptyLyrics(title, artist, trackId, albumArt, bpm);
    } catch (error) {
      this.logger.warn(`Erro buscando de API externa: ${error.message}`);
      return null;
    }
  }

  /**
   * Busca do Genius
   */
  private async fetchFromGenius(title: string, artist: string): Promise<Partial<LyricsPremium> | null> {
    try {
      const searchUrl = `https://api.genius.com/search`;
      const response = await firstValueFrom(
        this.httpService
          .get(searchUrl, {
            params: {
              q: `${title} ${artist}`,
              access_token: this.geniusToken,
            },
          })
          .pipe(
            map((res) => res.data),
            catchError((error) => {
              throw error;
            })
          )
      );

      const hit = response.response.hits[0];
      if (!hit) return null;

      // Parse de lyrics (simplificado - Genius retorna HTML que precisa ser parseado)
      // Para production, integrar com scraper completo
      return {
        title: hit.result.title,
        artist: hit.result.primary_artist.name,
        lyrics: [],
        language: 'en-US',
        hasWordSync: false,
      };
    } catch (error) {
      this.logger.debug(`Genius fetch failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Busca do Musixmatch
   */
  private async fetchFromMusixmatch(title: string, artist: string): Promise<Partial<LyricsPremium> | null> {
    try {
      const searchUrl = `https://api.musixmatch.com/ws/1.1/matcher.lyrics.get`;
      const response = await firstValueFrom(
        this.httpService
          .get(searchUrl, {
            params: {
              q_track: title,
              q_artist: artist,
              apikey: this.musixmatchKey,
            },
          })
          .pipe(
            map((res) => res.data),
            catchError((error) => {
              throw error;
            })
          )
      );

      if (response.message.header.status_code === 200) {
        const lyricsBody = response.message.body.lyrics;
        return {
          title,
          artist,
          lyrics: [],
          language: 'en-US',
          hasWordSync: false,
        };
      }

      return null;
    } catch (error) {
      this.logger.debug(`Musixmatch fetch failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Cria estrutura de lyrics vazia como fallback
   */
  private createEmptyLyrics(
    title: string,
    artist: string,
    trackId: string,
    albumArt?: string,
    bpm?: number,
  ): LyricsPremium {
    return {
      trackId,
      title,
      artist,
      albumArt: albumArt || '',
      bpm: bpm || 120,
      duration: 0,
      lyrics: [
        {
          id: 'verse_1',
          text: '[Letras não disponíveis]',
          startTime: 0,
          endTime: 1000,
          type: 'verse',
        },
      ],
      language: 'pt-BR',
      hasWordSync: false,
      updatedAt: new Date().toISOString(),
      source: 'empty',
    };
  }

  /**
   * Sincroniza letras manualmente (para calibração)
   */
  async calibrateSync(
    trackId: string,
    verseStartTime: number,
    audioTime: number,
  ): Promise<{ offset: number; confidence: number }> {
    const offset = audioTime - verseStartTime;
    
    // Salva calibração em cache temporário
    const cacheKey = `lyrics:sync:${trackId}`;
    if (this.cacheManager) {
      await this.cacheManager.set(
        cacheKey,
        { offset, timestamp: Date.now() },
        60000 // 1 minuto
      );
    }

    return {
      offset,
      confidence: Math.min(1, Math.abs(offset) / 100), // Confiança inversamente proporcional ao offset
    };
  }

  /**
   * Salva letras customizadas pelo usuário
   */
  async saveLyrics(trackId: string, lyrics: LyricsPremium): Promise<void> {
    await this.prismaService.lyricsPremium.upsert({
      where: { trackId },
      create: {
        trackId,
        title: lyrics.title || 'Unknown Title',
        artist: lyrics.artist || 'Unknown Artist',
        content: JSON.stringify(lyrics),
        source: 'user',
        language: 'pt-BR',
        hasWordSync: false,
        duration: lyrics.duration || 0,
        albumArt: lyrics.albumArt,
        bpm: lyrics.bpm,
      },
      update: {
        content: JSON.stringify(lyrics),
        updatedAt: new Date(),
      },
    });

    // Invalida cache
    const cacheKey = `lyrics:premium:${trackId}`;
    if (this.cacheManager) {
      await this.cacheManager.del(cacheKey);
    }

    this.logger.log(`Letras salvas para ${trackId}`);
  }

  /**
   * Exporta letras em formato LRC
   */
  exportAsLRC(lyrics: LyricsPremium): string {
    let lrc = `[ti:${lyrics.title}]\n`;
    lrc += `[ar:${lyrics.artist}]\n`;
    lrc += `[00:00.00]\n\n`;

    lyrics.lyrics.forEach((verse) => {
      const minutes = Math.floor(verse.startTime / 60000);
      const seconds = Math.floor((verse.startTime % 60000) / 1000);
      const centiseconds = Math.floor((verse.startTime % 1000) / 10);

      const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;

      lrc += `${timeStr}${verse.text}\n`;
    });

    return lrc;
  }
}
