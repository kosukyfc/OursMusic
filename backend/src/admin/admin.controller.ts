import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Req, Res, UseGuards, UseInterceptors,
  UploadedFile, Query, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MaxFileSizeValidator, ParseFilePipe } from '@nestjs/common';
import { Request } from 'express';
import { AdminGuard } from '../auth/guards';
import { AdminService } from './admin.service';
import { MagicImportService } from './magic-import.service';
import { Public } from '../auth/decorators';
import { DevicesGateway } from '../devices/devices.gateway';

type AuthReq = Request & { user: { userId: string } };

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly magicImportService: MagicImportService,
    private readonly devicesGateway: DevicesGateway,
  ) {}

  // ── Dashboard stats ──────────────────────────────────────
  @Get('stats')
  stats() { return this.adminService.getStats(); }

  // ── Users ────────────────────────────────────────────────
  @Get('users')
  listUsers(@Query('q') q?: string) { return this.adminService.listUsers(q); }

  @Put('users/:id/plan')
  async updatePlan(
    @Param('id') id: string,
    @Body('plan') plan: string,
    @Body('durationDays') durationDays?: number,
  ) {
    const updated = await this.adminService.updateUserPlan(id, plan, durationDays);

    // Notify user via WebSocket if they're connected
    if (plan === 'premium' || plan === 'family') {
      const expiresAt = updated.premiumExpiresAt;
      const durationLabel = durationDays === -1
        ? 'Ilimitado'
        : durationDays === 30 ? '30 dias'
        : durationDays === 90 ? '90 dias'
        : `${durationDays} dias`;

      this.devicesGateway.notifyUser(id, 'premium:granted', {
        plan,
        durationLabel,
        expiresAt: expiresAt?.toISOString() ?? null,
        message: `🎉 Você recebeu o plano Premium${durationDays === -1 ? ' ilimitado' : ` por ${durationLabel}`}!`,
      });
    } else {
      // Notifica downgrade também
      this.devicesGateway.notifyUser(id, 'premium:granted', { plan, message: 'Seu plano foi alterado.' });
    }

    return updated;
  }

  @Put('users/:id/admin')
  toggleAdmin(@Param('id') id: string, @Body('isAdmin') isAdmin: boolean) {
    return this.adminService.toggleAdmin(id, isAdmin);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) { return this.adminService.deleteUser(id); }

  // ── Songs ────────────────────────────────────────────────
  @Get('songs')
  listSongs(@Query('q') q?: string) { return this.adminService.listSongs(q); }

  @Get('songs/play-stats')
  songPlayStats() { return this.adminService.getSongPlayStats(); }

  @Post('songs/upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadSong(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 500 * 1024 * 1024 }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Req() req: AuthReq,
    @Body('storageType') storageType = 'nas',
    @Body('autoEnrich') autoEnrich = 'true',
  ) {
    return this.adminService.uploadSong(file, req.user.userId, storageType as any, autoEnrich !== 'false');
  }

  @Post('songs/import-csv')
  @UseInterceptors(FileInterceptor('file'))
  importCsv(
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.adminService.importFromCsv(file.buffer.toString('utf-8'));
  }

  @Delete('songs/:id')
  deleteSong(@Param('id') id: string) { return this.adminService.deleteSong(id); }

  @Put('songs/:id')
  updateSong(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateSong(id, body);
  }

  @Post('songs/:id/audio')  @UseInterceptors(FileInterceptor('file'))
  uploadAudio(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 500 * 1024 * 1024 }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Req() req: AuthReq,
    @Body('storageType') storageType = 'nas',
  ) {
    return this.adminService.linkAudioToSong(id, file, req.user.userId, storageType as any);
  }

  // ── Import from Drive ────────────────────────────────────
  @Post('import/drive')
  importDrive(@Req() req: AuthReq) {
    return this.adminService.importFromDrive(req.user.userId);
  }

  @Post('import/drive/metadata')
  importDriveWithMetadata(@Req() req: AuthReq) {
    return this.adminService.importFromDriveWithMetadata(req.user.userId);
  }

  @Post('import/s3')
  importS3(@Body('prefix') prefix = '') {
    return this.adminService.importFromS3(prefix);
  }

  @Post('import/s3/enrich')
  enrichS3Metadata(@Query('all') all?: string) {
    return this.adminService.enrichS3Metadata(all !== 'true');
  }

  // ── Activity logs ────────────────────────────────────────
  @Get('activity')
  activityLogs(@Query('limit') limit = '50') {
    return this.adminService.getActivityLogs(Number(limit));
  }

  @Get('activity/users')
  activityUsers() {
    return this.adminService.getActivityUsers();
  }

  @Get('activity/users/:userId')
  activityByUser(@Param('userId') userId: string, @Query('limit') limit = '100') {
    return this.adminService.getActivityByUser(userId, Number(limit));
  }

  // ── Spotify enrichment ───────────────────────────────────
  @Post('drive/make-public')
  makeAllDriveFilesPublic(@Req() req: AuthReq) {
    return this.adminService.makeAllDriveFilesPublic(req.user.userId);
  }

  @Post('spotify/enrich')
  enrichWithSpotify(@Query('all') all?: string) {
    return this.adminService.enrichWithSpotify(all !== 'true');
  }

  @Post('spotify/enrich-lyrics')
  enrichLyrics(@Query('all') all?: string) {
    return this.adminService.enrichWithLyrics(all !== 'true');
  }

  @Post('spotify/enrich-genres')
  enrichGenres(@Query('all') all?: string) {
    return this.adminService.enrichGenres(all !== 'true');
  }

  @Post('spotify/enrich-videos')
  enrichVideos(@Query('all') all?: string) {
    return this.adminService.enrichWithVideos(all !== 'true');
  }

  @Post('spotify/enrich-covers')
  enrichCovers(@Query('all') all?: string) {
    return this.adminService.enrichCovers(all !== 'true');
  }

  @Post('spotify/catalog')
  importCatalog(@Body('query') query: string, @Body('limit') limit = 50, @Body('tracks') tracks?: any[]) {
    return this.adminService.importCatalogFromSpotify(query, limit, tracks);
  }

  @Post('spotify/preview')
  previewCatalog(@Body('query') query: string, @Body('limit') limit = 20) {
    return this.adminService.previewCatalog(query, Math.min(limit, 500));
  }

  @Post('spotify/import-playlist')
  async importPlaylist(@Body('url') url: string) {
    if (!url?.trim()) throw new BadRequestException('URL is required');
    return this.adminService.importPlaylistByUrl(url.trim());
  }

  // ── Make Drive files public ──────────────────────────────
  @Post('drive/make-public')
  makePublic(@Req() req: AuthReq) {
    return this.adminService.makeAllDriveFilesPublic(req.user.userId);
  }

  // ── Magic Import ─────────────────────────────────────────
  @Get('magic-import/artist-tracks')
  @Public()
  async searchArtistTracks(
    @Query('artist') artist: string,
    @Query('limit') limit = 50,
  ) {
    if (!artist?.trim()) throw new BadRequestException('artist is required');
    return this.magicImportService.deezerSearchArtistTracks(artist.trim(), Number(limit));
  }

  @Get('magic-import/artist-albums')
  @Public()
  async getArtistAlbums(@Query('artist') artist: string) {
    if (!artist?.trim()) throw new BadRequestException('artist is required');
    return this.magicImportService.deezerGetArtistAlbums(artist.trim());
  }

  @Post('magic-import/artist-albums')
  async importAllArtistAlbums(
    @Req() req: AuthReq,
    @Body('artist') artist: string,
    @Body('albumIds') albumIds: string[],
    @Body('jobId') jobId = `job-${Date.now()}`,
  ) {
    if (!artist?.trim()) throw new BadRequestException('artist is required');
    if (!albumIds?.length) throw new BadRequestException('albumIds are required');
    return this.magicImportService.magicImportAllArtistAlbums(req.user.userId, artist.trim(), albumIds, jobId);
  }

  @Post('magic-import/artist-tracks')
  async importArtistTracks(
    @Req() req: AuthReq,
    @Body('tracks') tracks: any[],
    @Body('jobId') jobId = `job-${Date.now()}`,
  ) {
    if (!tracks?.length) throw new BadRequestException('tracks are required');
    return this.magicImportService.magicImportArtistTracks(req.user.userId, tracks, jobId);
  }

  @Post('magic-import')
  async magicImport(
    @Req() req: AuthReq,
    @Body('artist') artist: string,
    @Body('album') album: string,
    @Body('maxTracks') maxTracks = 20,
    @Body('jobId') jobId = `job-${Date.now()}`,
  ) {
    if (!artist?.trim() || !album?.trim()) {
      return { error: 'artist and album are required' };
    }
    try {
      return await this.magicImportService.magicImport(req.user.userId, artist.trim(), album.trim(), Number(maxTracks), jobId);
    } catch (err: any) {
      throw new BadRequestException(err?.message ?? 'Magic import failed');
    }
  }

  @Post('magic-import/pending')
  async magicImportPending(
    @Req() req: AuthReq,
    @Body('jobId') jobId = `job-${Date.now()}`,
  ) {
    try {
      return await this.magicImportService.magicImportPending(req.user.userId, jobId);
    } catch (err: any) {
      throw new BadRequestException(err?.message ?? 'Pending import failed');
    }
  }

  /**
   * POST /admin/magic-import/url
   * Body: { url: string, maxTracks?: number, jobId?: string }
   *
   * Aceita links do Spotify (faixa, álbum, playlist, artista) e Deezer.
   * - Álbum → Magic Import completo (baixa áudio via yt-dlp)
   * - Faixa/Playlist/Artista → Importa como catálogo (metadados, sem áudio)
   *
   * Progresso via SSE: GET /events/magic-import/:jobId
   */
  @Post('magic-import/url')
  async magicImportByUrl(
    @Req() req: AuthReq,
    @Body('url') url: string,
    @Body('maxTracks') maxTracks = 20,
    @Body('jobId') jobId = `job-${Date.now()}`,
  ) {
    if (!url?.trim()) throw new BadRequestException('url é obrigatória');
    try {
      return await this.magicImportService.magicImportByUrl(
        req.user.userId,
        url.trim(),
        Number(maxTracks),
        jobId,
      );
    } catch (err: any) {
      throw new BadRequestException(err?.message ?? 'Import by URL failed');
    }
  }

  @Public()
  @Get('magic-import/progress/:jobId')
  magicImportProgress(@Param('jobId') jobId: string, @Res() res: any) {
    // Moved to MagicImportSseController at /events/magic-import/:jobId
    res.status(301).redirect(`/events/magic-import/${jobId}`);
  }
}
