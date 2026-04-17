import { Controller, Get, Param, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MusicTheoryService } from './music-theory.service';

@Controller('theory')
export class MusicTheoryController {
  constructor(private theoryService: MusicTheoryService) {}

  @Get('song/:songId')
  async analyzeSong(@Param('songId') songId: string) {
    return this.theoryService.getSongTheory(songId);
  }

  @Post('analyze/:songId')
  @UseGuards(JwtAuthGuard)
  async analyzeSongManual(@Param('songId') songId: string) {
    return this.theoryService.analyzeSongTheory(songId);
  }

  @Get('queue/:key')
  async getQueueByKey(@Param('key') key: string) {
    return this.theoryService.getQueueByKey(key, 10);
  }
}
