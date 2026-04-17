import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TimeBasedPlaylistService } from './time-based-playlist.service';

@ApiTags('Time-Based Playlists')
@Controller('playlists/time-based')
@UseGuards(JwtAuthGuard)
export class TimeBasedPlaylistController {
  constructor(private timeBasedService: TimeBasedPlaylistService) {}

  @Post('create/:period')
  @ApiOperation({ summary: 'Create time-based playlist' })
  async createTimeBasedPlaylist(
    @Req() req: any,
    @Param('period') period: 'morning' | 'work' | 'evening' | 'night' | 'workout' | 'chill',
    @Body() data: { genre?: string; limit?: number },
  ) {
    const userId = req.user.id;
    return this.timeBasedService.createTimeBasedPlaylist(
      userId,
      period,
      data.genre,
      data.limit || 50,
    );
  }

  @Get('recommendations/:period')
  @ApiOperation({ summary: 'Get recommendations for time period' })
  async getRecommendations(
    @Req() req: any,
    @Param('period') period: string,
    @Body('limit') limit: number = 20,
  ) {
    const userId = req.user.id;
    return this.timeBasedService.getRecommendations(userId, period, limit);
  }

  @Put(':playlistId/auto-populate')
  @ApiOperation({ summary: 'Auto-populate playlist for period' })
  async autoPopulatePlaylist(
    @Req() req: any,
    @Param('playlistId') playlistId: string,
    @Body() data: { recurrence: 'daily' | 'weekly' | 'monthly' },
  ) {
    const userId = req.user.id;
    return this.timeBasedService.enableAutoPopulation(userId, playlistId, data.recurrence);
  }

  @Get('schedule')
  @ApiOperation({ summary: 'Get your daily music schedule' })
  async getYourSchedule(@Req() req: any) {
    const userId = req.user.id;
    return this.timeBasedService.getUserSchedule(userId);
  }

  @Post('workout/create')
  @ApiOperation({ summary: 'Create workout playlist' })
  async createWorkoutPlaylist(
    @Req() req: any,
    @Body() data: {
      type: 'hiit' | 'running' | 'gym' | 'yoga' | 'cycling';
      duration: number; // minutes
      intensity: number; // 1-10
    },
  ) {
    const userId = req.user.id;
    return this.timeBasedService.createWorkoutPlaylist(userId, data.type, data.duration);
  }

  @Get('workout/:playlistId/progress')
  @ApiOperation({ summary: 'Get workout progress' })
  async getWorkoutProgress(@Param('playlistId') playlistId: string) {
    return this.timeBasedService.getWorkoutProgress(playlistId);
  }
}
