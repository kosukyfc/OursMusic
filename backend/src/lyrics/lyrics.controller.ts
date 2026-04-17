import { Controller, Get, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { LyricsService, SongLyrics } from './lyrics.service';

@ApiTags('Lyrics')
@Controller('api/v1/lyrics')
export class LyricsController {
  constructor(private lyricsService: LyricsService) {}

  /**
   * Get lyrics for a song
   *
   * @param songId Song ID
   * @param title Song title (required if no ID)
   * @param artist Artist name (required if no ID)
   */
  @Get(':songId')
  @ApiOperation({ summary: 'Get song lyrics with sync' })
  @ApiParam({ name: 'songId', type: 'string' })
  async getLyrics(
    @Param('songId') songId: string,
    @Query('title') title?: string,
    @Query('artist') artist?: string,
  ): Promise<SongLyrics> {
    if (!title || !artist) {
      throw new HttpException(
        'Title and artist are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.lyricsService.getLyrics(songId, title, artist);
  }

  /**
   * Search lyrics by title and artist
   */
  @Get('search')
  @ApiOperation({ summary: 'Search lyrics' })
  async search(
    @Query('title') title: string,
    @Query('artist') artist: string,
  ): Promise<SongLyrics> {
    if (!title || !artist) {
      throw new HttpException(
        'Title and artist are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.lyricsService.getLyrics(`${title}_${artist}`, title, artist);
  }
}
