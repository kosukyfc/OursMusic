import { Controller, Get, Post, Body, UseGuards, Req, Query, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DiscoveryService } from './discovery.service';

@ApiTags('Discovery')
@Controller('discovery')
@UseGuards(JwtAuthGuard)
export class DiscoveryController {
  constructor(private discoveryService: DiscoveryService) {}

  // MOOD-BASED DISCOVERY
  @Get('mood')
  @ApiOperation({ summary: 'Get songs by mood' })
  async getSongsByMood(
    @Query('mood') mood: string,
    @Query('limit') limit: number = 50,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.discoveryService.getSongsByMood(userId, mood, limit);
  }

  @Get('moods')
  @ApiOperation({ summary: 'Get available moods' })
  async getAvailableMoods() {
    const moods = [
      'happy', 'energetic', 'sad', 'calm', 'focus',
      'romantic', 'aggressive', 'melancholic', 'uplifting',
      'dark', 'lively', 'peaceful', 'inspiring', 'party',
    ];
    return { moods };
  }

  // TRENDING
  @Get('trending')
  @ApiOperation({ summary: 'Get trending songs globally' })
  async getTrendingGlobal(
    @Query('limit') limit: number = 50,
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' = 'week',
  ) {
    return this.discoveryService.getTrendingGlobal(limit, timeframe);
  }

  @Get('trending-by-genre/:genre')
  @ApiOperation({ summary: 'Get trending by genre' })
  async getTrendingByGenre(
    @Param('genre') genre: string,
    @Query('limit') limit: number = 50,
  ) {
    return this.discoveryService.getTrendingByGenre(genre, limit);
  }

  @Get('trending-by-region/:region')
  @ApiOperation({ summary: 'Get trending by region' })
  async getTrendingByRegion(
    @Param('region') region: string,
    @Query('limit') limit: number = 50,
  ) {
    return this.discoveryService.getTrendingByRegion(region, limit);
  }

  @Get('trending-by-language/:language')
  @ApiOperation({ summary: 'Get trending by language' })
  async getTrendingByLanguage(
    @Param('language') language: string,
    @Query('limit') limit: number = 50,
  ) {
    return this.discoveryService.getTrendingByLanguage(language, limit);
  }

  // DISCOVER WEEKLY / RELEASE RADAR / NEW MUSIC DAILY
  @Get('discover-weekly')
  @ApiOperation({ summary: 'Get personalized Discover Weekly' })
  async getDiscoverWeekly(@Req() req: any) {
    const userId = req.user.id;
    return this.discoveryService.getDiscoverWeekly(userId);
  }

  @Get('release-radar')
  @ApiOperation({ summary: 'Get new releases from followed artists' })
  async getReleaseRadar(@Req() req: any, @Query('limit') limit: number = 50) {
    const userId = req.user.id;
    return this.discoveryService.getReleaseRadar(userId, limit);
  }

  @Get('new-music-daily/:day')
  @ApiOperation({ summary: 'Get daily curated new music' })
  async getNewMusicDaily(
    @Param('day') day: string, // YYYY-MM-DD
    @Query('genre') genre?: string,
  ) {
    return this.discoveryService.getNewMusicDaily(day, genre);
  }

  // GENRE & CATEGORY BROWSING
  @Get('genres')
  @ApiOperation({ summary: 'Get all available genres' })
  async getGenres() {
    return this.discoveryService.getGenres();
  }

  @Get('genre/:genreName')
  @ApiOperation({ summary: 'Get songs by genre' })
  async getSongsByGenre(
    @Param('genreName') genreName: string,
    @Query('limit') limit: number = 50,
  ) {
    return this.discoveryService.getSongsByGenre(genreName, limit);
  }

  @Get('genre/:genreName/related')
  @ApiOperation({ summary: 'Get related genres' })
  async getRelatedGenres(@Param('genreName') genreName: string) {
    return this.discoveryService.getRelatedGenres(genreName);
  }

  @Get('genre/:genreName/history')
  @ApiOperation({ summary: 'Get genre evolution timeline' })
  async getGenreHistory(@Param('genreName') genreName: string) {
    return this.discoveryService.getGenreHistory(genreName);
  }

  // LABEL & PRODUCER
  @Get('label/:labelName')
  @ApiOperation({ summary: 'Browse by label' })
  async getSongsByLabel(
    @Param('labelName') labelName: string,
    @Query('limit') limit: number = 50,
  ) {
    return this.discoveryService.getSongsByLabel(labelName, limit);
  }

  @Get('producer/:producerName')
  @ApiOperation({ summary: 'Get producer discography' })
  async getProducerDiscography(
    @Param('producerName') producerName: string,
    @Query('limit') limit: number = 100,
  ) {
    return this.discoveryService.getProducerDiscography(producerName, limit);
  }

  @Get('label/:labelName/history')
  @ApiOperation({ summary: 'Get label history' })
  async getLabelHistory(@Param('labelName') labelName: string) {
    return this.discoveryService.getLabelHistory(labelName);
  }

  // COVERS & REMIXES
  @Get('covers/:originalSongId')
  @ApiOperation({ summary: 'Find all covers of a song' })
  async getCovers(
    @Param('originalSongId') originalSongId: string,
    @Query('limit') limit: number = 50,
  ) {
    return this.discoveryService.getCovers(originalSongId, limit);
  }

  @Get('remixes/:originalSongId')
  @ApiOperation({ summary: 'Find remixes of a song' })
  async getRemixes(
    @Param('originalSongId') originalSongId: string,
    @Query('limit') limit: number = 50,
  ) {
    return this.discoveryService.getRemixes(originalSongId, limit);
  }

  @Get('mashups')
  @ApiOperation({ summary: 'Browse user mashups' })
  async getBrowseMashups(@Query('limit') limit: number = 50) {
    return this.discoveryService.getBrowseMashups(limit);
  }

  // EVENTS & FESTIVALS
  @Get('festivals')
  @ApiOperation({ summary: 'Get upcoming music festivals' })
  async getUpcomingFestivals() {
    return this.discoveryService.getUpcomingFestivals();
  }

  @Get('festival/:festivalId/artists')
  @ApiOperation({ summary: 'Get festival lineup' })
  async getFestivalLineup(@Param('festivalId') festivalId: string) {
    return this.discoveryService.getFestivalLineup(festivalId);
  }

  @Get('festival/:festivalId/playlist')
  @ApiOperation({ summary: 'Get festival playlist' })
  async getFestivalPlaylist(@Param('festivalId') festivalId: string) {
    return this.discoveryService.getFestivalPlaylist(festivalId);
  }

  // GEOGRAPHIC DISCOVERY
  @Get('countries')
  @ApiOperation({ summary: 'Get all countries' })
  async getCountries() {
    return this.discoveryService.getCountries();
  }

  @Get('country/:countryCode/artists')
  @ApiOperation({ summary: 'Get artists by country' })
  async getArtistsByCountry(
    @Param('countryCode') countryCode: string,
    @Query('limit') limit: number = 50,
  ) {
    return this.discoveryService.getArtistsByCountry(countryCode, limit);
  }

  @Get('country/:countryCode/trending')
  @ApiOperation({ summary: 'Get trending in country' })
  async getTrendingByCountry(
    @Param('countryCode') countryCode: string,
    @Query('limit') limit: number = 50,
  ) {
    return this.discoveryService.getTrendingByCountry(countryCode, limit);
  }

  @Get('language/:language/songs')
  @ApiOperation({ summary: 'Get songs by language' })
  async getSongsByLanguage(
    @Param('language') language: string,
    @Query('limit') limit: number = 50,
  ) {
    return this.discoveryService.getSongsByLanguage(language, limit);
  }

  // LIVE SESSION PLAYLISTS
  @Get('live-sessions')
  @ApiOperation({ summary: 'Get available live sessions' })
  async getLiveSessions() {
    return this.discoveryService.getLiveSessions();
  }

  @Get('live-session/:sessionId')
  @ApiOperation({ summary: 'Get live session playlist' })
  async getLiveSession(@Param('sessionId') sessionId: string) {
    return this.discoveryService.getLiveSession(sessionId);
  }

  // SOUND ISOLATION
  @Post('isolate-sound')
  @ApiOperation({ summary: 'Isolate specific frequencies' })
  async isolateSound(
    @Body() data: { songId: string; isolation: 'vocals' | 'drums' | 'bass' | 'other' },
  ) {
    return this.discoveryService.isolateSound(data.songId, data.isolation);
  }

  // DECADE BROWSING
  @Get('decades')
  @ApiOperation({ summary: 'Get music decades' })
  async getDecades() {
    const decades = ['1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];
    return { decades };
  }

  @Get('decade/:decade')
  @ApiOperation({ summary: 'Get songs from decade' })
  async getSongsByDecade(
    @Param('decade') decade: string,
    @Query('genre') genre?: string,
    @Query('limit') limit: number = 50,
  ) {
    return this.discoveryService.getSongsByDecade(decade, genre, limit);
  }
}
