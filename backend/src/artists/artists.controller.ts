import { Controller, Get, Post, Delete, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators';
import { ArtistsService } from './artists.service';

type AuthReq = any & { user?: { userId: string } };

@Controller('artists')
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  /**
   * GET /artists/profile/:name — Obter perfil de um artista (público)
   */
  @Public()
  @Get('profile/:name')
  async getArtistProfile(@Param('name') name: string, @Req() req: AuthReq) {
    return this.artistsService.getArtistProfile(decodeURIComponent(name), req.user?.userId);
  }

  /**
   * GET /artists/search — Buscar artistas (público)
   */
  @Public()
  @Get('search')
  async searchArtists(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.artistsService.searchArtists(q, limit ? parseInt(limit) : 20);
  }

  /**
   * GET /artists/top — Artistas mais populares (público)
   */
  @Public()
  @Get('top')
  async getTopArtists(@Query('limit') limit?: string) {
    return this.artistsService.getTopArtists(limit ? parseInt(limit) : 50);
  }

  /**
   * POST /artists/:name/follow — Seguir um artista
   */
  @UseGuards(JwtAuthGuard)
  @Post(':name/follow')
  async followArtist(@Param('name') name: string, @Req() req: AuthReq) {
    await this.artistsService.followArtist(req.user.userId, decodeURIComponent(name));
    return { success: true };
  }

  /**
   * DELETE /artists/:name/follow — Deixar de seguir um artista
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':name/follow')
  async unfollowArtist(@Param('name') name: string, @Req() req: AuthReq) {
    await this.artistsService.unfollowArtist(req.user.userId, decodeURIComponent(name));
    return { success: true };
  }
}
