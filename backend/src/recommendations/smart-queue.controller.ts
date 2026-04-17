import { Controller, Get, Post, Body, UseGuards, Request, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SmartQueueService } from './smart-queue.service';

@Controller('queue/smart')
export class SmartQueueController {
  constructor(private queueService: SmartQueueService) {}

  @Post('record/:songId')
  @UseGuards(JwtAuthGuard)
  async recordPlay(
    @Request() req,
    @Param('songId') songId: string,
    @Body() body: { duration: number },
  ) {
    return this.queueService.recordPlay(req.user.id, songId, body.duration);
  }

  @Get('next/:mood')
  @UseGuards(JwtAuthGuard)
  async getNextSuggestion(@Request() req, @Param('mood') mood: string) {
    return this.queueService.getNextSuggestion(req.user.id, mood, 5);
  }

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  async generateSuggestions(@Request() req) {
    await this.queueService.generateSuggestions(req.user.id);
    return { status: 'generating' };
  }
}
