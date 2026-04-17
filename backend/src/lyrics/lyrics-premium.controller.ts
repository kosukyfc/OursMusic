/**
 * Controller de Lyrics Premium - Endpoints da API
 * Gerencia requisições de letras sincronizadas com o sistema karaokê
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
  Optional,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { LyricsPremiumService, LyricsApiResponse, LyricsPremium } from './lyrics-premium.service';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Lyrics Premium - Karaokê')
@Controller('api/v1/lyrics-premium')
export class LyricsPremiumController {
  private readonly logger = new Logger(LyricsPremiumController.name);

  constructor(private lyricsService: LyricsPremiumService) {}

  /**
   * Obtém letras com sincronização completa
   * GET /api/v1/lyrics-premium/:trackId
   */
  @Get(':trackId')
  @ApiOperation({
    summary: 'Obtém letras sincronizadas de uma música',
    description:
      'Retorna letras com timestamps por verso e por palavra. Suporta cache automático.',
  })
  @ApiParam({ name: 'trackId', type: 'string', description: 'ID da música' })
  @ApiQuery({
    name: 'title',
    type: 'string',
    required: true,
    description: 'Título da música',
  })
  @ApiQuery({
    name: 'artist',
    type: 'string',
    required: true,
    description: 'Nome do artista',
  })
  @ApiQuery({
    name: 'albumArt',
    type: 'string',
    required: false,
    description: 'URL da capa do álbum',
  })
  @ApiQuery({
    name: 'bpm',
    type: 'number',
    required: false,
    description: 'BPM da música (para calcular duração de verso)',
  })
  @ApiResponse({
    status: 200,
    description: 'Letras encontradas com sucesso',
    schema: {
      example: {
        success: true,
        data: {
          trackId: 'spotify-123',
          title: 'Song Name',
          artist: 'Artist Name',
          albumArt: 'https://...',
          bpm: 120,
          duration: 240000,
          lyrics: [
            {
              id: 'verse_1',
              text: 'Primeira linha',
              startTime: 0,
              endTime: 2000,
              type: 'verse',
              words: [
                { word: 'Primeira', startTime: 0, endTime: 800 },
                { word: 'linha', startTime: 800, endTime: 2000 },
              ],
            },
          ],
          language: 'pt-BR',
          hasWordSync: true,
          updatedAt: '2026-04-16T12:00:00Z',
        },
        cached: false,
        timestamp: 1713270000000,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Letras não encontradas',
  })
  async getLyrics(
    @Param('trackId') trackId: string,
    @Query('title') title: string,
    @Query('artist') artist: string,
    @Query('albumArt') albumArt?: string,
    @Query('bpm') bpm?: string,
  ): Promise<LyricsApiResponse> {
    this.logger.log(`Buscando letras para ${title} - ${artist} (${trackId})`);

    if (!title || !artist) {
      throw new HttpException(
        {
          success: false,
          error: {
            type: 'INVALID_REQUEST',
            message: 'Título e artista são obrigatórios',
          },
          timestamp: Date.now(),
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const bpmNumber = bpm ? parseInt(bpm, 10) : 120;

    return this.lyricsService.getLyricsWithSync(
      trackId,
      title,
      artist,
      albumArt,
      bpmNumber
    );
  }

  /**
   * Calibra sincronização de letras
   * POST /api/v1/lyrics-premium/:trackId/calibrate
   */
  @Post(':trackId/calibrate')
  @ApiOperation({
    summary: 'Calibra sincronização de letras',
    description:
      'Calcula offset de sincronização entre verso atual e tempo de áudio',
  })
  @ApiParam({ name: 'trackId', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Calibração realizada',
    schema: {
      example: {
        offset: 50,
        confidence: 0.95,
      },
    },
  })
  async calibrateSync(
    @Param('trackId') trackId: string,
    @Body() body: { verseStartTime: number; audioTime: number }
  ): Promise<{ offset: number; confidence: number }> {
    this.logger.debug(
      `Calibrando sync para ${trackId}: verso=${body.verseStartTime}, audio=${body.audioTime}`
    );

    if (typeof body.verseStartTime !== 'number' || typeof body.audioTime !== 'number') {
      throw new HttpException(
        'verseStartTime e audioTime devem ser números',
        HttpStatus.BAD_REQUEST
      );
    }

    return this.lyricsService.calibrateSync(
      trackId,
      body.verseStartTime,
      body.audioTime
    );
  }

  /**
   * Salva letras customizadas
   * PUT /api/v1/lyrics-premium/:trackId
   */
  @Put(':trackId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Salva letras customizadas',
    description: 'Permite que usuários salvem suas próprias letras sincronizadas',
  })
  @ApiParam({ name: 'trackId', type: 'string' })
  @ApiHeader({
    name: 'Authorization',
    description: 'JWT Token',
  })
  @ApiResponse({
    status: 200,
    description: 'Letras salvas com sucesso',
  })
  async saveLyrics(
    @Param('trackId') trackId: string,
    @Body() lyricsData: LyricsPremium
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Salvando letras customizadas para ${trackId}`);

    if (!lyricsData.lyrics || lyricsData.lyrics.length === 0) {
      throw new HttpException(
        'Letras não podem estar vazias',
        HttpStatus.BAD_REQUEST
      );
    }

    await this.lyricsService.saveLyrics(trackId, lyricsData);

    return {
      success: true,
      message: 'Letras salvas com sucesso',
    };
  }

  /**
   * Exporta letras em formato LRC
   * GET /api/v1/lyrics-premium/:trackId/export/lrc
   */
  @Get(':trackId/export/lrc')
  @ApiOperation({
    summary: 'Exporta letras em formato LRC',
    description: 'Retorna letras no formato LRC (Lyrics Romanized Chinese)',
  })
  @ApiParam({ name: 'trackId', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Arquivo LRC',
    schema: {
      example: '[ti:Song Name]\n[ar:Artist Name]\n[00:00.00]Lyrics text',
    },
  })
  async exportLRC(
    @Param('trackId') trackId: string,
    @Query('title') title: string,
    @Query('artist') artist: string
  ): Promise<{ format: string; content: string; filename: string }> {
    this.logger.log(`Exportando LRC para ${trackId}`);

    const response = await this.lyricsService.getLyricsWithSync(
      trackId,
      title,
      artist
    );

    if (!response.success || !response.data) {
      throw new HttpException(
        'Letras não encontradas',
        HttpStatus.NOT_FOUND
      );
    }

    const lrcContent = this.lyricsService.exportAsLRC(response.data);

    return {
      format: 'lrc',
      content: lrcContent,
      filename: `${title}-${artist}.lrc`,
    };
  }

  /**
   * Health check
   * GET /api/v1/lyrics-premium/health
   */
  @Get('health/status')
  @ApiOperation({ summary: 'Health check do serviço de lyrics' })
  async health(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
