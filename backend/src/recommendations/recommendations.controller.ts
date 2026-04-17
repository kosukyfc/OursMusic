import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { RecommendationsService, Recommendation } from './recommendations.service';

@ApiTags('Recommendations')
@Controller('api/v1/recommendations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class RecommendationsController {
  constructor(private recommendationsService: RecommendationsService) {}

  /**
   * Get personalized recommendations for authenticated user
   */
  @Get()
  @ApiOperation({ summary: 'Get personalized recommendations' })
  async getRecommendations(@Req() req: any): Promise<Recommendation[]> {
    const userId = req.user.sub; // From JWT
    return this.recommendationsService.getRecommendations(userId);
  }

  /**
   * Get similar songs to a specific song
   */
  @Get('similar/:songId')
  @ApiOperation({ summary: 'Get songs similar to a specific song' })
  async getSimilarSongs(@Param('songId') songId: string): Promise<Recommendation[]> {
    return this.recommendationsService.getSimilarSongs(songId);
  }
}
