import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageAdapterFactory } from '../storage/storage-adapter.factory';
import { StorageType } from '@prisma/client';
import { parseMetadata } from '../songs/metadata.parser';
import { ImportService } from '../import/import.service';
import { DriveAdapter } from '../storage/adapters/drive.adapter';
import { DRIVE_ADAPTER } from '../storage/storage.tokens';
import { Inject } from '@nestjs/common';
import { SpotifyService } from '../spotify/spotify.service';
import { GoogleTokenService } from '../auth/google-token.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageAdapterFactory: StorageAdapterFactory,
    private readonly importService: ImportService,
    @Inject(DRIVE_ADAPTER) private readonly driveAdapter: DriveAdapter,
    private readonly spotifyService: SpotifyService,
    private readonly googleTokenService: GoogleTokenService,
  ) {}

  /** Loads and auto-refreshes the user's Google access token, sets it on DriveAdapter. */
  private async initDriveAdapter(userId: string): Promise<void> {
    const token = await this.googleTokenService.getValidAccessToken(userId);
    this.driveAdapter.setAccessToken(token);
  }

  async getStats() {
    const [totalSongs, totalUsers, totalPlaylists, recentActivity] = await Promise.all([
      this.prisma.song.count(),
      this.prisma.user.count(),
      this.prisma.playlist.count(),
      this.prisma.activityLog.count(),
    ]);
    const planBreakdown = await this.prisma.user.groupBy({
      by: ['plan'],
      _count: { plan: true },
    });
    return { totalSongs, totalUsers, totalPlaylists, recentActivity, planBreakdown };
  }

  async listUsers(q?: string) {
    return this.prisma.user.findMany({
      where: q ? { OR: [
        { email: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ]} : undefined,
      select: {
        id: true, email: true, name: true, plan: true,
        isAdmin: true, offlineEnabled: true, createdAt: true,
        _count: { select: { playlists: true, favorites: true, downloads: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUserPlan(id: string, plan: string, durationDays?: number) {
    const offlineEnabled = plan === 'premium' || plan === 'family';

    // Calculate expiry
    let premiumExpiresAt: Date | null = null;
    if ((plan === 'premium' || plan === 'family') && durationDays !== undefined) {
      if (durationDays === -1) {
        premiumExpiresAt = null; // unlimited
      } else {
        premiumExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        plan: plan as any,
        offlineEnabled,
        ...(premiumExpiresAt !== undefined ? { premiumExpiresAt } : {}),
      },
      select: { id: true, email: true, plan: true, offlineEnabled: true, premiumExpiresAt: true },
    });

    return updated;
  }

  async toggleAdmin(id: string, isAdmin: boolean) {
    return this.prisma.user.update({
      where: { id },
      data: { isAdmin },
      select: { id: true, email: true, isAdmin: true },
    });
  }

  async deleteUser(id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }

  async listSongs(q?: string) {
    return this.prisma.song.findMany({
      where: q ? { title: { contains: q, mode: 'insensitive' } } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getSongPlayStats() {
    const songs = await this.prisma.song.findMany({
      where: { playCount: { gt: 0 } },
      select: { id: true, title: true, artist: true, albumName: true, coverUrl: true, playCount: true },
      orderBy: { playCount: 'desc' },
      take: 100,
    });
    const total = songs.reduce((sum, s) => sum + s.playCount, 0);
    return { total, songs };
  }

  /**
   * Normalizes a title for fuzzy matching: lowercase, remove punctuation, collapse spaces.
   */
  private normalizeTitle(title: string): string {
    return title.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Tries to find a CSV-imported song (available=false, storagePath='') that matches
   * the given title. Returns the song if found, null otherwise.
   */
  private async findCsvMatch(title: string) {
    const normalized = this.normalizeTitle(title);
    // Fetch candidates: songs without audio (storagePath empty = imported via CSV)
    const candidates = await this.prisma.song.findMany({
      where: { storagePath: '', available: false },
      select: { id: true, title: true, artist: true, albumName: true, coverUrl: true },
    });
    // Find best match by normalized title equality
    return candidates.find(c => this.normalizeTitle(c.title) === normalized) ?? null;
  }

  async uploadSong(file: Express.Multer.File, userId: string, storageType: StorageType, autoEnrich = true) {
    // Use S3 (Supabase) as the default storage
    const effectiveStorageType = StorageType.s3;
    const adapter = this.storageAdapterFactory.getAdapter(effectiveStorageType);

    // Parse embedded metadata from the file
    const metadata = await parseMetadata(file);

    const searchTitle = metadata.title !== 'Unknown Title'
      ? metadata.title
      : file.originalname.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');

    // ── Duplicate check ───────────────────────────────────────────────────────
    const normalizedSearch = this.normalizeTitle(searchTitle);
    const existingSongs = await this.prisma.song.findMany({
      where: { available: true },
      select: { id: true, title: true, artist: true, albumName: true, storagePath: true },
    });
    const duplicate = existingSongs.find(s => this.normalizeTitle(s.title) === normalizedSearch);
    if (duplicate) {
      return {
        duplicate: true,
        song_id: duplicate.id,
        title: duplicate.title,
        artist: duplicate.artist,
        album: duplicate.albumName,
        storage_path: duplicate.storagePath,
        message: `A faixa "${duplicate.title}"${duplicate.artist ? ` de ${duplicate.artist}` : ''} já existe na plataforma.`,
      };
    }

    // Auto-enrich
    let enriched: Awaited<ReturnType<typeof this.spotifyService.searchTrack>> | null = null;
    if (autoEnrich) {
      const searchArtist = metadata.artist !== 'Unknown Artist' ? metadata.artist : undefined;
      enriched = await this.spotifyService.searchTrack(searchTitle, searchArtist);
    }

    const finalTitle = enriched?.title ?? metadata.title;
    const finalArtist = enriched?.artist ?? (metadata.artist !== 'Unknown Artist' ? metadata.artist : null) ?? 'Unknown Artist';
    const finalAlbum = enriched?.album ?? (metadata.album !== 'Unknown Album' ? metadata.album : null) ?? 'Unknown Album';

    // ── CSV auto-match ────────────────────────────────────────────────────────
    const csvMatch = await this.findCsvMatch(searchTitle);
    if (csvMatch) {
      const safeArtist = (csvMatch.artist ?? finalArtist).replace(/[^a-zA-Z0-9 _-]/g, '_');
      const safeAlbum = (csvMatch.albumName ?? finalAlbum).replace(/[^a-zA-Z0-9 _-]/g, '_');
      const storagePath = await adapter.upload(
        file.buffer,
        `${safeArtist}/${safeAlbum}/${file.originalname}`,
        file.mimetype,
      );
      const updated = await this.prisma.song.update({
        where: { id: csvMatch.id },
        data: {
          storageType: effectiveStorageType,
          storagePath,
          fileSize: BigInt(file.size),
          mimeType: file.mimetype,
          uploadedBy: userId,
          available: true,
          ...(metadata.duration > 0 && { duration: metadata.duration }),
          ...(metadata.bitrate && { bitrate: metadata.bitrate }),
        },
      });
      return {
        song_id: updated.id,
        title: updated.title,
        artist: updated.artist,
        album: updated.albumName,
        cover_url: updated.coverUrl,
        enriched: false,
        storage_path: updated.storagePath,
        matched_from_csv: true,
      };
    }

    // ── Normal upload: Artist/Album path structure in S3 ─────────────────────
    const safeArtist = finalArtist.replace(/[^a-zA-Z0-9 _-]/g, '_');
    const safeAlbum = finalAlbum.replace(/[^a-zA-Z0-9 _-]/g, '_');
    const storagePath = await adapter.upload(
      file.buffer,
      `${safeArtist}/${safeAlbum}/${file.originalname}`,
      file.mimetype,
    );

    const song = await this.prisma.song.create({
      data: {
        title: finalTitle,
        artist: finalArtist !== 'Unknown Artist' ? finalArtist : null,
        albumName: finalAlbum !== 'Unknown Album' ? finalAlbum : null,
        coverUrl: enriched?.coverUrl ?? null,
        previewUrl: enriched?.previewUrl ?? null,
        spotifyId: enriched?.spotifyId ?? null,
        deezerId: enriched?.deezerId ?? null,
        popularity: enriched?.popularity ?? null,
        duration: metadata.duration || Math.round((enriched?.durationMs ?? 0) / 1000),
        bitrate: metadata.bitrate,
        storageType: effectiveStorageType,
        storagePath,
        fileSize: BigInt(file.size),
        mimeType: file.mimetype,
        uploadedBy: userId,
        available: true,
      },
    });

    // Fetch lyrics in background
    if (song.title && song.artist) {
      this.spotifyService.fetchLyrics(song.title, song.artist, song.albumName ?? '', song.duration)
        .then(({ lyrics, lyricsSynced }) => {
          if (lyrics || lyricsSynced) {
            this.prisma.song.update({ where: { id: song.id }, data: { lyrics, lyricsSynced } }).catch(() => {});
          }
        }).catch(() => {});
    }

    return {
      song_id: song.id,
      title: song.title,
      artist: song.artist,
      album: song.albumName,
      cover_url: song.coverUrl,
      enriched: !!enriched,
      storage_path: song.storagePath,
      matched_from_csv: false,
    };
  }

  /**
   * Import songs from a CSV file.
   * Supported columns: title, artist, album, duration, cover_url, storage_path, storage_type
   * Auto-enriches missing metadata via Deezer if title is present.
   */
  async importFromCsv(csvContent: string): Promise<{
    imported: number; skipped: number; errors: number;
    songs: { title: string; artist: string; status: string }[];
  }> {
    const lines = csvContent.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
    });

    let imported = 0, skipped = 0, errors = 0;
    const results: { title: string; artist: string; status: string }[] = [];

    for (const row of rows) {
      const title = row.title || row.name || row.track;
      if (!title) { errors++; continue; }

      try {
        // Check duplicate
        const existing = await this.prisma.song.findFirst({
          where: { title: { equals: title, mode: 'insensitive' } },
        });
        if (existing) { skipped++; results.push({ title, artist: row.artist ?? '', status: 'skipped (duplicate)' }); continue; }

        // Auto-enrich if no cover/artist provided
        let enriched = null;
        if (!row.cover_url || !row.artist) {
          enriched = await this.spotifyService.searchTrack(title, row.artist || undefined);
        }

        await this.prisma.song.create({
          data: {
            title,
            artist: row.artist || enriched?.artist || null,
            albumName: row.album || enriched?.album || null,
            coverUrl: row.cover_url || enriched?.coverUrl || null,
            previewUrl: enriched?.previewUrl || null,
            spotifyId: enriched?.spotifyId || null,
            deezerId: enriched?.deezerId || null,
            popularity: enriched?.popularity || null,
            duration: row.duration ? Number(row.duration) : Math.round((enriched?.durationMs ?? 0) / 1000),
            storageType: (row.storage_type as StorageType) || StorageType.nas,
            storagePath: row.storage_path || '',
            mimeType: 'audio/mpeg',
            available: !!row.storage_path,
          },
        });

        imported++;
        results.push({ title, artist: row.artist || enriched?.artist || '', status: enriched ? 'imported + enriched' : 'imported' });
      } catch (err) {
        errors++;
        results.push({ title, artist: row.artist ?? '', status: `error: ${(err as Error).message}` });
      }
    }

    return { imported, skipped, errors, songs: results };
  }

  async updateSong(id: string, data: {
    title?: string; artist?: string; albumName?: string;
    coverUrl?: string; duration?: number; available?: boolean;
  }) {
    return this.prisma.song.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.artist !== undefined && { artist: data.artist }),
        ...(data.albumName !== undefined && { albumName: data.albumName }),
        ...(data.coverUrl !== undefined && { coverUrl: data.coverUrl }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.available !== undefined && { available: data.available }),
      },
    });
  }

  async linkAudioToSong(id: string, file: Express.Multer.File, userId: string, storageType: StorageType) {
    // Always use Drive
    await this.initDriveAdapter(userId);

    const song = await this.prisma.song.findUnique({ where: { id } });
    if (!song) throw new NotFoundException('Song not found');

    const artist = song.artist ?? 'Unknown Artist';
    const album = song.albumName ?? 'Unknown Album';

    const folderId = await this.driveAdapter.ensureArtistAlbumFolder(artist, album);
    const fileId = await this.driveAdapter.uploadToFolder(
      file.buffer,
      file.originalname,
      file.mimetype,
      folderId,
    );

    const metadata = await parseMetadata(file);

    // Update metadata.json in background
    this.driveAdapter.uploadMetadata({
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: song.albumName,
      coverUrl: song.coverUrl,
      uploadedAt: new Date().toISOString(),
    }, folderId).catch(() => {});

    return this.prisma.song.update({
      where: { id },
      data: {
        storageType: StorageType.drive,
        storagePath: fileId,
        fileSize: BigInt(file.size),
        mimeType: file.mimetype,
        available: true,
        ...(metadata.duration > 0 && { duration: metadata.duration }),
      },
    });
  }

  async deleteSong(id: string) {
    const song = await this.prisma.song.findUnique({ where: { id } });
    if (!song) throw new NotFoundException('Song not found');
    try {
      const adapter = this.storageAdapterFactory.getAdapter(song.storageType);
      await adapter.delete(song.storagePath);
    } catch { /* ignore storage errors */ }
    await this.prisma.song.delete({ where: { id } });
    return { deleted: true };
  }

  async importFromDrive(userId: string) {
    await this.initDriveAdapter(userId);
    return this.importService.importFromDrive(userId);
  }

  /**
   * Importa arquivos do Drive baixando cada um, extraindo metadados ID3/Vorbis
   * e salvando título, artista, álbum, duração e bitrate no banco.
   */
  async importFromDriveWithMetadata(userId: string): Promise<{
    created: number;
    skipped: number;
    errors: number;
    songs: { title: string; artist: string; album: string; duration: number }[];
  }> {
    await this.initDriveAdapter(userId);

    const AUDIO_MIMES = new Set(['audio/mpeg', 'audio/flac', 'audio/aac', 'audio/ogg']);
    const files = await this.driveAdapter.listFiles('');
    const audioFiles = files.filter(f => AUDIO_MIMES.has(f.mimeType));

    // Deduplicate by storagePath
    const existing = await this.prisma.song.findMany({
      where: { storagePath: { in: audioFiles.map(f => f.path) } },
      select: { storagePath: true },
    });
    const existingPaths = new Set(existing.map(s => s.storagePath));
    const newFiles = audioFiles.filter(f => !existingPaths.has(f.path));

    let created = 0;
    let errors = 0;
    const importedSongs: { title: string; artist: string; album: string; duration: number }[] = [];

    for (const file of newFiles) {
      try {
        // Download file buffer from Drive
        const signedUrl = await this.driveAdapter.getSignedUrl(file.path, 300);
        const buffer = await this.fetchBuffer(signedUrl);

        // Extract metadata from buffer
        const multerFile: Express.Multer.File = {
          buffer,
          mimetype: file.mimeType,
          originalname: file.path.split('/').pop() ?? 'unknown',
          fieldname: 'file',
          encoding: '7bit',
          size: buffer.length,
          stream: null as any,
          destination: '',
          filename: '',
          path: '',
        };
        const metadata = await parseMetadata(multerFile);

        await this.prisma.song.create({
          data: {
            title: metadata.title,
            artist: metadata.artist !== 'Unknown Artist' ? metadata.artist : null,
            albumName: metadata.album !== 'Unknown Album' ? metadata.album : null,
            duration: metadata.duration,
            bitrate: metadata.bitrate,
            storageType: StorageType.drive,
            storagePath: file.path,
            fileSize: BigInt(file.size),
            mimeType: file.mimeType,
          },
        });

        importedSongs.push({
          title: metadata.title,
          artist: metadata.artist,
          album: metadata.album,
          duration: metadata.duration,
        });
        created++;
      } catch {
        errors++;
      }
    }

    return { created, skipped: audioFiles.length - newFiles.length, errors, songs: importedSongs };
  }

  private async fetchBuffer(url: string): Promise<Buffer> {
    const https = await import('https');
    const http = await import('http');
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      (client as any).get(url, (res: any) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    });
  }

  async importFromS3(prefix: string) {
    return this.importService.importFromS3(prefix);
  }

  /**
   * Enriches all songs in the DB with Spotify metadata:
   * cover art, artist name, album name, popularity, Spotify ID.
   * Searches by title + existing artist. Skips songs already enriched.
   */
  /**
   * Imports tracks from Spotify as catalog entries (available=false, no audio file).
   * They appear in the player UI with full metadata, waiting for the audio file.
   */
  /** Preview catalog search results without importing */
  async previewCatalog(query: string, limit = 20) {
    const tracks = await this.spotifyService.searchCatalog(query, limit);
    return { total: tracks.length, tracks };
  }

  async importPlaylistByUrl(url: string): Promise<{ imported: number; skipped: number; playlistName: string }> {
    const { name, tracks } = await this.spotifyService.importPlaylistByUrl(url);

    if (!tracks.length) return { imported: 0, skipped: 0, playlistName: name };

    // Deduplicate by spotifyId/deezerId
    const existingIds = await this.prisma.song.findMany({
      where: { deezerId: { in: tracks.map(t => t.deezerId).filter(Boolean) as string[] } },
      select: { deezerId: true },
    });
    const existingSet = new Set(existingIds.map(s => s.deezerId));
    const newTracks = tracks.filter(t => !t.deezerId || !existingSet.has(t.deezerId));

    if (newTracks.length > 0) {
      await this.prisma.song.createMany({
        data: newTracks.map(t => ({
          title: t.title,
          artist: t.artist || null,
          albumName: t.album || null,
          coverUrl: t.coverUrl || null,
          previewUrl: t.previewUrl || null,
          deezerId: t.deezerId || null,
          spotifyId: t.spotifyId || null,
          popularity: t.popularity || 0,
          duration: Math.round(t.durationMs / 1000),
          storageType: 'nas' as any,
          storagePath: '',
          mimeType: 'audio/mpeg',
          available: false,
        })),
        skipDuplicates: true,
      });
    }

    return { imported: newTracks.length, skipped: tracks.length - newTracks.length, playlistName: name };
  }

  async importCatalogFromSpotify(query: string, limit = 50, tracks?: any[]): Promise<{
    imported: number;
    skipped: number;
  }> {
    // Use pre-selected tracks if provided, otherwise search
    const allTracks = tracks?.length
      ? tracks.map((t: any) => ({
          spotifyId: t.spotifyId ?? t.id,
          deezerId: t.deezerId ?? null,
          title: t.title,
          artist: t.artist,
          album: t.album,
          coverUrl: t.coverUrl ?? null,
          previewUrl: t.previewUrl ?? null,
          popularity: t.popularity ?? 0,
          durationMs: t.durationMs ?? 0,
        }))
      : await this.spotifyService.searchCatalog(query, Math.min(limit, 50));

    if (!allTracks.length) return { imported: 0, skipped: 0 };

    // Deduplicate by spotifyId
    const existingIds = await this.prisma.song.findMany({
      where: { spotifyId: { in: allTracks.map(t => t.spotifyId) } },
      select: { spotifyId: true },
    });
    const existingSet = new Set(existingIds.map(s => s.spotifyId));

    const newTracks = allTracks.filter(t => !existingSet.has(t.spotifyId));
    const skipped = allTracks.length - newTracks.length;

    if (newTracks.length > 0) {
      await this.prisma.song.createMany({
        data: newTracks.map(t => ({
          title: t.title,
          artist: t.artist,
          albumName: t.album,
          coverUrl: t.coverUrl,
          previewUrl: t.previewUrl,
          spotifyId: t.spotifyId,
          deezerId: t.deezerId,
          popularity: t.popularity,
          duration: Math.round(t.durationMs / 1000),
          storageType: 'nas' as any,
          storagePath: '',
          mimeType: 'audio/mpeg',
          available: false,
        })),
        skipDuplicates: true,
      });
    }

    return {
      imported: newTracks.length,
      skipped,
    };
  }

  /**
   * Makes all existing Drive files publicly readable.
   * Run once to fix files uploaded before this change.
   */
  async makeAllDriveFilesPublic(userId: string): Promise<{ updated: number; errors: number }> {
    await this.initDriveAdapter(userId);
    const songs = await this.prisma.song.findMany({
      where: { storageType: 'drive', storagePath: { not: '' } },
      select: { id: true, storagePath: true },
    });

    let updated = 0, errors = 0;
    for (const song of songs) {
      try {
        await this.driveAdapter.makePublic(song.storagePath);
        updated++;
      } catch {
        errors++;
      }
    }
    return { updated, errors };
  }

  async enrichWithLyrics(onlyMissing = true): Promise<{ enriched: number; notFound: number }> {
    const songs = await this.prisma.song.findMany({
      where: onlyMissing ? { lyrics: null } : undefined,
      select: { id: true, title: true, artist: true, albumName: true, duration: true },
    });

    let enriched = 0, notFound = 0;
    for (const song of songs) {
      const result = await this.spotifyService.fetchLyrics(
        song.title,
        song.artist ?? '',
        song.albumName ?? '',
        song.duration,
      );
      if (result.lyrics || result.lyricsSynced) {
        await this.prisma.song.update({
          where: { id: song.id },
          data: { lyrics: result.lyrics, lyricsSynced: result.lyricsSynced },
        });
        enriched++;
      } else {
        notFound++;
      }
    }
    return { enriched, notFound };
  }

  async enrichWithSpotify(onlyMissing = true): Promise<{
    enriched: number;
    skipped: number;
    notFound: number;
  }> {
    const songs = await this.prisma.song.findMany({
      where: onlyMissing ? { spotifyId: null } : undefined,
      select: { id: true, title: true, artist: true },
    });

    let enriched = 0, skipped = 0, notFound = 0;

    for (const song of songs) {
      const meta = await this.spotifyService.searchTrack(song.title, song.artist ?? undefined);
      if (!meta) { notFound++; continue; }

      await this.prisma.song.update({
        where: { id: song.id },
        data: {
          spotifyId: meta.spotifyId,
          deezerId: meta.deezerId,
          artist: meta.artist,
          albumName: meta.album,
          coverUrl: meta.coverUrl,
          previewUrl: meta.previewUrl,
          popularity: meta.popularity,
        },
      });
      enriched++;
    }

    return { enriched, skipped, notFound };
  }

  async getActivityLogs(limit: number) {
    return this.prisma.activityLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        user: { select: { email: true } },
        song: { select: { title: true } },
      },
    });
  }
}
