import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { S3Adapter } from '../storage/adapters/s3.adapter';
import { S3_ADAPTER } from '../storage/storage.tokens';
import { Inject } from '@nestjs/common';
import { StorageType } from '@prisma/client';
import { SpotifyService } from '../spotify/spotify.service';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { spawn } from 'child_process';
// node-id3 is CommonJS
// eslint-disable-next-line @typescript-eslint/no-var-requires
const NodeID3 = require('node-id3');

export interface MagicImportProgress {
  jobId: string;
  track: string;
  trackIndex: number;
  totalTracks: number;
  percent: number;
  status: 'downloading' | 'uploading' | 'done' | 'error';
  message?: string;
  done?: boolean;
}

export interface MagicImportResult {
  imported: number;
  skipped: number;
  errors: number;
  tracks: { title: string; status: string }[];
}

type ProgressCallback = (p: MagicImportProgress) => void;

@Injectable()
export class MagicImportService {
  private readonly logger = new Logger(MagicImportService.name);
  private readonly DEEZER = 'https://api.deezer.com';
  private readonly ITUNES = 'https://itunes.apple.com/search';
  private readonly MB = 'https://musicbrainz.org/ws/2';
  private readonly MB_UA = 'MusicApp/1.0 (music-app-dev)';

  constructor(
    private readonly prisma: PrismaService,
    @Inject(S3_ADAPTER) private readonly s3Adapter: S3Adapter,
    private readonly spotifyService: SpotifyService,
    private readonly config: ConfigService,
  ) {}

  // ── Progress pub/sub ──────────────────────────────────────────────────────

  private readonly progressSubs = new Map<string, Set<ProgressCallback>>();

  subscribeProgress(jobId: string, cb: ProgressCallback): () => void {
    if (!this.progressSubs.has(jobId)) this.progressSubs.set(jobId, new Set());
    this.progressSubs.get(jobId)!.add(cb);
    return () => this.progressSubs.get(jobId)?.delete(cb);
  }

  private emitProgress(p: MagicImportProgress) {
    this.logger.log(`[${p.jobId}] ${p.track} — ${p.status} (${p.percent}%)`);
    this.progressSubs.get(p.jobId)?.forEach(cb => cb(p));
  }

  // ── Deezer artist top tracks search ──────────────────────────────────────

  async deezerSearchArtistTracks(artistName: string, limit = 50): Promise<{ id: string; title: string; artist: string; album: string; coverUrl: string; durationMs: number }[]> {
    // 1. Find artist
    const searchRes = await fetch(`${this.DEEZER}/search/artist?q=${encodeURIComponent(artistName)}&limit=1`);
    const searchData = await searchRes.json();
    if (!searchData.data?.length) return [];

    const artistId = searchData.data[0].id;

    // 2. Get top tracks
    const tracksRes = await fetch(`${this.DEEZER}/artist/${artistId}/top?limit=${limit}`);
    const tracksData = await tracksRes.json();
    if (!tracksData.data?.length) return [];

    return tracksData.data.map((t: any) => ({
      id: String(t.id),
      title: t.title ?? '',
      artist: t.artist?.name ?? artistName,
      album: t.album?.title ?? '',
      coverUrl: t.album?.cover_xl ?? t.album?.cover_big ?? t.album?.cover ?? '',
      durationMs: (t.duration ?? 0) * 1000,
    }));
  }

  // ── Deezer: list all albums of an artist ─────────────────────────────────

  async deezerGetArtistAlbums(artistName: string): Promise<{ id: string; title: string; coverUrl: string; releaseDate: string; trackCount: number; alreadyImported?: boolean }[]> {
    const searchRes = await fetch(`${this.DEEZER}/search/artist?q=${encodeURIComponent(artistName)}&limit=1`);
    const searchData = await searchRes.json();
    if (!searchData.data?.length) return [];

    const artistId = searchData.data[0].id;
    const albumsRes = await fetch(`${this.DEEZER}/artist/${artistId}/albums?limit=100`);
    const albumsData = await albumsRes.json();
    if (!albumsData.data?.length) return [];

    const filtered = albumsData.data.filter((a: any) => a.record_type === 'album' || a.record_type === 'ep');

    // Busca detalhes de cada álbum para pegar trackCount real
    const albums = await Promise.all(filtered.map(async (a: any) => {
      try {
        const detail = await (await fetch(`${this.DEEZER}/album/${a.id}`)).json();
        const trackCount = detail.tracks?.data?.length ?? detail.nb_tracks ?? a.nb_tracks ?? 0;
        return {
          id: String(a.id),
          title: a.title ?? '',
          coverUrl: a.cover_xl ?? a.cover_big ?? a.cover ?? '',
          releaseDate: a.release_date ?? '',
          trackCount,
        };
      } catch {
        return {
          id: String(a.id),
          title: a.title ?? '',
          coverUrl: a.cover_xl ?? a.cover_big ?? a.cover ?? '',
          releaseDate: a.release_date ?? '',
          trackCount: a.nb_tracks ?? 0,
        };
      }
    }));

    // Marca álbuns que já têm todas as faixas importadas
    const results = await Promise.all(albums.map(async (a) => {
      const existingCount = await this.prisma.song.count({
        where: { albumName: { equals: a.title, mode: 'insensitive' }, available: true },
      });
      return { ...a, alreadyImported: a.trackCount > 0 && existingCount >= a.trackCount };
    }));

    return results;
  }

  // ── Import all albums of an artist ───────────────────────────────────────

  async magicImportAllArtistAlbums(
    userId: string,
    artistName: string,
    albumIds: string[],
    jobId: string,
  ): Promise<MagicImportResult> {
    const allTracks: { id: string; title: string; artist: string; album: string; coverUrl: string; durationMs: number }[] = [];
    let skippedAlbums = 0;
    let failedAlbums = 0;

    for (const albumId of albumIds) {
      try {
        const albumRes = await fetch(`${this.DEEZER}/album/${albumId}`);
        if (!albumRes.ok) {
          console.error(`[MagicImport] Deezer album fetch failed: status ${albumRes.status} for album ${albumId}`);
          failedAlbums++;
          continue;
        }
        
        const alb = await albumRes.json();
        if (alb.error) {
          console.error(`[MagicImport] Deezer API error for album ${albumId}:`, alb.error);
          failedAlbums++;
          continue;
        }
        
        const albumTitle = alb.title ?? '';
        const coverUrl = alb.cover_xl ?? alb.cover_big ?? alb.cover ?? '';
        const tracks = alb.tracks?.data ?? [];

        if (!tracks.length) {
          console.warn(`[MagicImport] Album "${albumTitle}" has no tracks`);
          skippedAlbums++;
          continue;
        }

        // Pula álbum se todas as faixas já existem no banco
        const existingCount = await this.prisma.song.count({
          where: { albumName: { equals: albumTitle, mode: 'insensitive' }, available: true },
        });
        if (existingCount >= tracks.length) {
          console.log(`[MagicImport] Album "${albumTitle}" already fully imported (${existingCount}/${tracks.length})`);
          skippedAlbums++;
          continue;
        }

        for (const t of tracks) {
          allTracks.push({
            id: String(t.id),
            title: t.title ?? '',
            artist: t.artist?.name ?? artistName,
            album: albumTitle,
            coverUrl,
            durationMs: (t.duration ?? 0) * 1000,
          });
        }
        console.log(`[MagicImport] Added ${tracks.length} tracks from album "${albumTitle}"`);
      } catch (err) {
        console.error(`[MagicImport] Error fetching album ${albumId}:`, err instanceof Error ? err.message : String(err));
        failedAlbums++;
      }
    }

    if (!allTracks.length) {
      this.emitProgress({ jobId, track: '', trackIndex: 0, totalTracks: 0, percent: 100, status: 'done', done: true });
      return { imported: 0, skipped: skippedAlbums, errors: failedAlbums, tracks: [] };
    }

    const result = await this.magicImportArtistTracks(userId, allTracks, jobId);
    return { ...result, skipped: result.skipped + skippedAlbums, errors: result.errors + failedAlbums };
  }

  // ── Import selected artist tracks ─────────────────────────────────────────

  async magicImportArtistTracks(
    userId: string,
    tracks: { id: string; title: string; artist: string; album: string; coverUrl: string; durationMs: number }[],
    jobId: string,
  ): Promise<MagicImportResult> {
    const total = tracks.length;
    let imported = 0, skipped = 0, errors = 0;
    const results: { title: string; status: string }[] = new Array(total);
    let completed = 0;

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'magic-artist-'));

    // Pre-download cover once per unique coverUrl to avoid redundant fetches
    const coverCache = new Map<string, Buffer | undefined>();
    const uniqueCovers = [...new Set(tracks.map(t => t.coverUrl).filter(Boolean))];
    await Promise.all(uniqueCovers.map(async (url) => {
      try { coverCache.set(url, Buffer.from(await (await fetch(url)).arrayBuffer())); } catch { coverCache.set(url, undefined); }
    }));

    const processTrack = async (t: typeof tracks[0], i: number) => {
      this.emitProgress({ jobId, track: t.title, trackIndex: i, totalTracks: total, percent: Math.round((completed / total) * 100), status: 'downloading' });

      const existing = await this.prisma.song.findFirst({
        where: { title: { equals: t.title, mode: 'insensitive' }, artist: { equals: t.artist, mode: 'insensitive' } },
      });
      if (existing?.available) {
        results[i] = { title: t.title, status: 'skipped (already exists)' };
        completed++;
        skipped++;
        this.emitProgress({ jobId, track: t.title, trackIndex: i, totalTracks: total, percent: Math.round((completed / total) * 100), status: 'done' });
        return;
      }

      try {
        const ytUrl = await this.findYoutubeUrl('', t.artist, t.title);
        if (!ytUrl) throw new Error('No YouTube URL found');

        const safeTitle = t.title.replace(/[<>:"/\\|?*\u0080-\uffff]/g, '_').trim();
        const trackDir = path.join(tmpDir, `${i}-${safeTitle}`);
        await fs.mkdir(trackDir, { recursive: true });
        const outputTemplate = path.join(trackDir, 'audio.%(ext)s');

        // Download + fetch lyrics in parallel
        const [, lyrics] = await Promise.all([
          this.downloadTrack(ytUrl, outputTemplate),
          this.fetchLyrics(t.title, t.artist),
        ]);

        const files = await fs.readdir(trackDir);
        if (!files.length) throw new Error('Download failed');

        const finalPath = path.join(trackDir, files[0]);
        const mp3Path = finalPath.endsWith('.mp3') ? finalPath : finalPath.replace(/\.[^.]+$/, '.mp3');
        if (finalPath !== mp3Path) await fs.rename(finalPath, mp3Path);

        const coverBuffer = coverCache.get(t.coverUrl);
        this.tagMp3(mp3Path, { title: t.title, artist: t.artist, album: t.album, year: '', genre: '', trackNumber: 1, lyrics, coverBuffer });

        this.emitProgress({ jobId, track: t.title, trackIndex: i, totalTracks: total, percent: Math.round((completed / total) * 100), status: 'uploading' });

        const fileBuffer = await fs.readFile(mp3Path);
        const safeArtist = t.artist.replace(/[^a-zA-Z0-9 _-]/g, '_');
        const safeAlbum = (t.album || 'Singles').replace(/[^a-zA-Z0-9 _-]/g, '_');
        const s3Key = `${safeArtist}/${safeAlbum}/${safeTitle}.mp3`;
        const storagePath = await this.s3Adapter.upload(fileBuffer, s3Key, 'audio/mpeg');

        const songData = { title: t.title, artist: t.artist, albumName: t.album || null, coverUrl: t.coverUrl || null, duration: Math.round(t.durationMs / 1000), storageType: StorageType.s3, storagePath, mimeType: 'audio/mpeg', available: true, uploadedBy: userId, ...(lyrics && { lyrics }) };

        if (existing) {
          await this.prisma.song.update({ where: { id: existing.id }, data: songData });
        } else {
          await this.prisma.song.create({ data: { ...songData, fileSize: BigInt(fileBuffer.length) } });
        }

        results[i] = { title: t.title, status: 'imported' };
        completed++;
        imported++;
        this.emitProgress({ jobId, track: t.title, trackIndex: i, totalTracks: total, percent: Math.round((completed / total) * 100), status: 'done' });
      } catch (err: any) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[MagicImport] Track import error - ${t.artist} - ${t.title}: ${errMsg}`);
        results[i] = { title: t.title, status: `error: ${err.message}` };
        completed++;
        errors++;
        this.emitProgress({ jobId, track: t.title, trackIndex: i, totalTracks: total, percent: Math.round((completed / total) * 100), status: 'error', message: err.message });
      }
    };

    // Concurrency pool: 3 parallel downloads
    const CONCURRENCY = 3;
    try {
      const queue = tracks.map((t, i) => () => processTrack(t, i));
      const workers = Array.from({ length: CONCURRENCY }, async () => {
        while (queue.length) {
          const task = queue.shift();
          if (task) await task();
        }
      });
      await Promise.all(workers);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }

    this.emitProgress({ jobId, track: '', trackIndex: total, totalTracks: total, percent: 100, status: 'done', done: true });
    this.progressSubs.delete(jobId);

    return { imported, skipped, errors, tracks: results };
  }

  // ── Deezer album search ───────────────────────────────────────────────────

  private async deezerSearchAlbum(artist: string, album: string) {
    const r = await fetch(
      `${this.DEEZER}/search/album?q=${encodeURIComponent(`artist:"${artist}" album:"${album}"`)}&limit=1`,
    );
    const data = await r.json();
    if (!data.data?.length) return null;

    const albumId = data.data[0].id;
    const alb = await (await fetch(`${this.DEEZER}/album/${albumId}`)).json();
    if (alb.error) return null;

    const tracks = (alb.tracks?.data ?? []).map((t: any, i: number) => ({
      id: String(t.id),
      title: t.title ?? '',
      durationMs: (t.duration ?? 0) * 1000,
      trackNumber: t.track_position ?? t.position ?? i + 1,
      discNumber: t.disk_number ?? 1,
      isrc: t.isrc ?? '',
      artist: t.artist?.name ?? artist,
      explicit: t.explicit_lyrics ?? false,
    }));

    return {
      albumId: String(albumId),
      name: alb.title ?? album,
      releaseDate: alb.release_date ?? '',
      coverUrl: alb.cover_xl ?? alb.cover_big ?? alb.cover ?? '',
      genres: (alb.genres?.data ?? []).map((g: any) => g.name).join(', '),
      label: alb.label ?? '',
      tracks,
    };
  }

  // ── iTunes best cover ─────────────────────────────────────────────────────

  private async itunesBestCover(artist: string, album: string): Promise<string | null> {
    try {
      const r = await fetch(
        `${this.ITUNES}?term=${encodeURIComponent(`${artist} ${album}`)}&entity=album&limit=1`,
      );
      const data = await r.json();
      if (data.resultCount > 0) {
        return data.results[0].artworkUrl100.replace('100x100bb', '3000x3000bb');
      }
    } catch { /* ignore */ }
    return null;
  }

  // ── MusicBrainz year + label ──────────────────────────────────────────────

  private async mbYearAndLabel(artist: string, album: string): Promise<{ year: string; label: string }> {
    try {
      const q = encodeURIComponent(`artist:"${artist}" AND release:"${album}"`);
      const r = await fetch(`${this.MB}/release?query=${q}&fmt=json&limit=1`, {
        headers: { 'User-Agent': this.MB_UA },
      });
      const data = await r.json();
      if (data.releases?.length) {
        const rel = data.releases[0];
        const year = rel.date ? String(rel.date).slice(0, 4) : '';
        const label = (rel['label-info'] ?? [])
          .map((l: any) => l.label?.name)
          .filter(Boolean)
          .join(', ');
        return { year, label };
      }
    } catch { /* ignore */ }
    return { year: '', label: '' };
  }

  // ── yt-dlp runner ────────────────────────────────────────────────────────────

  private get ffmpegPath(): string {
    const configured = this.config.get<string>('FFMPEG_PATH');
    if (configured?.trim()) return configured.trim();
    // fallback: WinGet install location
    return 'C:\\Users\\ytalo\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe';
  }

  /** Returns the directory containing ffmpeg (yt-dlp --ffmpeg-location accepts dir or exe path) */
  private get ffmpegDir(): string {
    const p = this.ffmpegPath;
    // If it ends with .exe, return the directory
    if (p.toLowerCase().endsWith('.exe')) {
      return path.dirname(p);
    }
    return p;
  }

  private get nodePath(): string {
    return this.config.get<string>('NODE_PATH') ?? 'C:\\Program Files\\nodejs\\node.exe';
  }

  private runYtDlp(args: string[]): Promise<{ stdout: string; stderr: string }> {
    const fullArgs = [
      '--ffmpeg-location', this.ffmpegDir,
      '--js-runtimes', `node:${this.nodePath}`,
      ...args,
    ];

    return new Promise((resolve, reject) => {
      // shell: false so Windows doesn't re-split our args on spaces
      const proc = spawn('yt-dlp', fullArgs, { shell: false });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
      proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
      const timer = setTimeout(() => { proc.kill(); reject(new Error('yt-dlp timeout')); }, 120000);
      proc.on('close', (code) => {
        clearTimeout(timer);
        // yt-dlp exits 1 on warnings but stdout still has valid data
        if (stdout.trim()) {
          resolve({ stdout, stderr });
        } else if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          const errLine = stderr.split('\n').find(l => l.includes('ERROR:')) ?? stderr.slice(0, 300);
          reject(new Error(`yt-dlp exited ${code}: ${errLine}`));
        }
      });
      proc.on('error', (err) => { clearTimeout(timer); reject(err); });
    });
  }

  // ── YouTube download via yt-dlp ───────────────────────────────────────────

  private async findYoutubeUrl(isrc: string, artist: string, title: string): Promise<string> {
    // 1. Try YouTube Data API first (fast, no subprocess)
    const ytApiKey = this.config.get<string>('YOUTUBE_KEY') ?? this.config.get<string>('YOUTUBE_API_KEY');
    if (ytApiKey) {
      const queries = [
        isrc?.trim() ? isrc : null,
        `${artist} - ${title} official audio`,
        `${artist} ${title}`,
      ].filter(Boolean) as string[];

      for (const q of queries) {
        try {
          const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(q)}&key=${ytApiKey}&maxResults=1`;
          const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
          const data = await res.json();
          const id = data?.items?.[0]?.id?.videoId;
          if (id) return `https://youtu.be/${id}`;
        } catch { /* try next */ }
      }
    }

    // 2. Fallback: yt-dlp search (only first query to save time)
    const q = `ytsearch1:${artist} - ${title}`;
    try {
      const { stdout } = await this.runYtDlp(['--get-id', '--no-playlist', '--quiet', '--', q]);
      const id = stdout.trim().split('\n')[0];
      if (id) return `https://youtu.be/${id}`;
    } catch { /* ignore */ }

    return '';
  }

  private async downloadTrack(ytUrl: string, outputTemplate: string): Promise<void> {
    await this.runYtDlp([
      `--output=${outputTemplate}`,
      '--format=bestaudio[abr<=128]/bestaudio/best',
      '--quiet',
      '--no-warnings',
      '--extract-audio',
      '--audio-format=mp3',
      '--audio-quality=128K',
      '--no-playlist',
      '--concurrent-fragments=4',
      ytUrl,
    ]);
  }

  // ── ID3 tagging ───────────────────────────────────────────────────────────

  private tagMp3(filePath: string, tags: {
    title: string; artist: string; album: string;
    year: string; genre: string; trackNumber: number;
    lyrics?: string; coverBuffer?: Buffer;
  }): void {
    const tagData: any = {
      title: tags.title,
      artist: tags.artist,
      album: tags.album,
      year: tags.year,
      genre: tags.genre,
      trackNumber: String(tags.trackNumber),
    };
    if (tags.lyrics) tagData.comment = { language: 'por', text: tags.lyrics.slice(0, 500) };
    if (tags.coverBuffer) {
      tagData.image = {
        mime: 'image/jpeg',
        type: { id: 3, name: 'front cover' },
        description: 'Front Cover',
        imageBuffer: tags.coverBuffer,
      };
    }
    NodeID3.write(tagData, filePath);
  }

  // ── Lyrics via LRCLIB ─────────────────────────────────────────────────────

  private async fetchLyrics(title: string, artist: string): Promise<string> {
    try {
      const { lyrics } = await this.spotifyService.fetchLyrics(title, artist);
      return lyrics ?? '';
    } catch { return ''; }
  }

  // ── Import by URL ─────────────────────────────────────────────────────────

  /**
   * POST /admin/magic-import/pending
   * Busca todas as músicas com available=false (tag "Em Breve") e tenta
   * baixar o áudio via Magic Import (yt-dlp + YouTube).
   *
   * Estratégia:
   * 1. Agrupa por albumName + artist → tenta magicImport por álbum (melhor qualidade)
   * 2. Faixas sem álbum → tenta individualmente pelo título + artista
   */
  async magicImportPending(
    userId: string,
    jobId: string,
  ): Promise<MagicImportResult & { importType: string }> {
    const pending = await this.prisma.song.findMany({
      where: { available: false },
      select: { id: true, title: true, artist: true, albumName: true },
      orderBy: { createdAt: 'asc' },
    });

    if (pending.length === 0) {
      this.emitProgress({ jobId, track: '', trackIndex: 0, totalTracks: 0, percent: 100, status: 'done', done: true });
      return { imported: 0, skipped: 0, errors: 0, tracks: [], importType: 'pending' };
    }

    // Agrupa por "artist|albumName" para importar álbuns inteiros de uma vez
    const albumGroups = new Map<string, typeof pending>();
    const soloTracks: typeof pending = [];

    for (const song of pending) {
      if (song.artist && song.albumName) {
        const key = `${song.artist.toLowerCase()}|${song.albumName.toLowerCase()}`;
        if (!albumGroups.has(key)) albumGroups.set(key, []);
        albumGroups.get(key)!.push(song);
      } else {
        soloTracks.push(song);
      }
    }

    const totalJobs = albumGroups.size + soloTracks.length;
    let jobsDone = 0;
    let imported = 0, skipped = 0, errors = 0;
    const tracks: { title: string; status: string }[] = [];

    const emitJob = (trackTitle: string, status: MagicImportProgress['status'], message?: string) => {
      const percent = Math.round((jobsDone / totalJobs) * 100);
      this.emitProgress({ jobId, track: trackTitle, trackIndex: jobsDone, totalTracks: totalJobs, percent, status, message });
    };

    // 1. Importa álbuns agrupados
    for (const [key, songs] of albumGroups) {
      const artist = songs[0].artist!;
      const album = songs[0].albumName!;
      const label = `${artist} — ${album}`;
      emitJob(label, 'downloading');

      try {
        // Usa um sub-jobId para não conflitar com o SSE principal
        const subJobId = `${jobId}-${key.replace(/[^a-z0-9]/g, '')}`;
        const result = await this.magicImport(userId, artist, album, songs.length + 5, subJobId);
        imported += result.imported;
        skipped += result.skipped;
        errors += result.errors;
        tracks.push(...result.tracks);
        emitJob(label, 'done');
      } catch (err: any) {
        errors += songs.length;
        tracks.push(...songs.map(s => ({ title: s.title, status: `error: ${err.message}` })));
        emitJob(label, 'error', err.message);
      }
      jobsDone++;
    }

    // 2. Importa faixas individuais (sem álbum)
    for (const song of soloTracks) {
      emitJob(song.title, 'downloading');

      try {
        // Busca no Deezer pelo título + artista para obter álbum e então faz magic import
        const meta = await this.spotifyService.deepEnrichTrack(song.title, song.artist ?? null, null);

        if (meta?.album && meta?.artist) {
          const subJobId = `${jobId}-solo-${song.id}`;
          const result = await this.magicImport(userId, meta.artist, meta.album, 1, subJobId);
          // Verifica se a faixa específica foi importada
          const found = result.tracks.find(t =>
            t.title.toLowerCase().includes(song.title.toLowerCase().slice(0, 10)) ||
            song.title.toLowerCase().includes(t.title.toLowerCase().slice(0, 10))
          );
          if (found && !found.status.includes('error')) {
            imported++;
            tracks.push({ title: song.title, status: 'imported' });
          } else {
            // Tenta buscar direto no YouTube pelo título + artista
            const ytQuery = song.artist ? `${song.artist} - ${song.title}` : song.title;
            const ytUrl = await this.findYoutubeUrl('', song.artist ?? '', song.title);
            if (ytUrl) {
              await this.downloadAndSaveSingle(userId, song, ytUrl, meta);
              imported++;
              tracks.push({ title: song.title, status: 'imported' });
            } else {
              skipped++;
              tracks.push({ title: song.title, status: 'skipped (not found on YouTube)' });
            }
          }
        } else {
          // Sem metadados suficientes — tenta buscar no YouTube diretamente
          const ytUrl = await this.findYoutubeUrl('', song.artist ?? '', song.title);
          if (ytUrl) {
            await this.downloadAndSaveSingle(userId, song, ytUrl, meta);
            imported++;
            tracks.push({ title: song.title, status: 'imported' });
          } else {
            skipped++;
            tracks.push({ title: song.title, status: 'skipped (not found)' });
          }
        }
        emitJob(song.title, 'done');
      } catch (err: any) {
        errors++;
        tracks.push({ title: song.title, status: `error: ${err.message}` });
        emitJob(song.title, 'error', err.message);
      }
      jobsDone++;
    }

    this.emitProgress({ jobId, track: '', trackIndex: totalJobs, totalTracks: totalJobs, percent: 100, status: 'done', done: true });
    this.progressSubs.delete(jobId);

    return { imported, skipped, errors, tracks, importType: 'pending' };
  }

  /**
   * Baixa uma faixa individual do YouTube e salva no banco atualizando a song existente.
   */
  private async downloadAndSaveSingle(
    userId: string,
    song: { id: string; title: string; artist: string | null; albumName: string | null },
    ytUrl: string,
    meta: import('../spotify/spotify.service').TrackMeta | null,
  ): Promise<void> {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'magic-single-'));
    try {
      const safeTitle = song.title.replace(/[<>:"/\\|?*\u0080-\uffff]/g, '_').trim();
      const outputTemplate = path.join(tmpDir, 'audio.%(ext)s');
      await this.downloadTrack(ytUrl, outputTemplate);

      const files = await fs.readdir(tmpDir);
      if (!files.length) throw new Error('Download failed');

      const finalPath = path.join(tmpDir, files[0]);
      const mp3Path = finalPath.endsWith('.mp3') ? finalPath : finalPath.replace(/\.[^.]+$/, '.mp3');
      if (finalPath !== mp3Path) await fs.rename(finalPath, mp3Path);

      // Baixa capa se disponível
      let coverBuffer: Buffer | undefined;
      const coverUrl = meta?.coverUrl ?? null;
      if (coverUrl) {
        try { coverBuffer = Buffer.from(await (await fetch(coverUrl)).arrayBuffer()); } catch { /* ignore */ }
      }

      const artist = meta?.artist ?? song.artist ?? 'Unknown';
      const albumName = meta?.album ?? song.albumName ?? '';

      this.tagMp3(mp3Path, {
        title: song.title, artist, album: albumName,
        year: '', genre: '', trackNumber: 1, coverBuffer,
      });

      const fileBuffer = await fs.readFile(mp3Path);
      const s3Key = `${artist.replace(/[^a-zA-Z0-9 _-]/g, '_')}/${albumName.replace(/[^a-zA-Z0-9 _-]/g, '_') || 'Singles'}/${safeTitle}.mp3`;
      const storagePath = await this.s3Adapter.upload(fileBuffer, s3Key, 'audio/mpeg');

      await this.prisma.song.update({
        where: { id: song.id },
        data: {
          artist: meta?.artist ?? song.artist,
          albumName: meta?.album ?? song.albumName,
          coverUrl: meta?.coverUrl ?? null,
          storageType: StorageType.s3,
          storagePath,
          fileSize: BigInt(fileBuffer.length),
          mimeType: 'audio/mpeg',
          available: true,
          uploadedBy: userId,
          ...(meta?.durationMs ? { duration: Math.round(meta.durationMs / 1000) } : {}),
        },
      });
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /**
   * Resolve a Spotify/Deezer URL (or artist name) and dispatch to the appropriate import flow.
   * - album URL → magicImport (full download with audio)
   * - track URL → magicImport single track
   * - playlist/artist URL → catalog import (metadata only, no audio)
   * - plain text (artist name) → catalog import top tracks from Deezer
   */
  async magicImportByUrl(
    userId: string,
    urlOrName: string,
    maxTracks: number,
    jobId: string,
  ): Promise<MagicImportResult & { importType: string }> {
    const isUrl = urlOrName.startsWith('http://') || urlOrName.startsWith('https://');

    // Try to resolve as album first (best quality path — full audio download)
    if (isUrl) {
      const albumInfo = await this.spotifyService.resolveUrlToAlbum(urlOrName);
      if (albumInfo) {
        const result = await this.magicImport(userId, albumInfo.artist, albumInfo.album, maxTracks, jobId);
        return { ...result, importType: 'album' };
      }
    }

    // For track/playlist/artist URLs or plain artist name: import as catalog (metadata only)
    let name: string;
    let tracks: import('../spotify/spotify.service').TrackMeta[];
    let type: string;

    if (isUrl) {
      const resolved = await this.spotifyService.importPlaylistByUrl(urlOrName);
      name = resolved.name;
      tracks = resolved.tracks;
      type = resolved.type;
    } else {
      // Plain text = artist name search
      tracks = await this.spotifyService.searchCatalog(`artist:${urlOrName}`, maxTracks);
      name = urlOrName;
      type = 'artist';
    }

    const limited = tracks.slice(0, maxTracks);
    const total = limited.length;

    if (total === 0) {
      this.emitProgress({ jobId, track: '', trackIndex: 0, totalTracks: 0, percent: 100, status: 'done', done: true });
      return { imported: 0, skipped: 0, errors: 0, tracks: [], importType: type };
    }

    let imported = 0, skipped = 0, errors = 0;
    const results: { title: string; status: string }[] = [];

    for (let i = 0; i < limited.length; i++) {
      const t = limited[i];
      this.emitProgress({ jobId, track: t.title, trackIndex: i, totalTracks: total, percent: Math.round((i / total) * 100), status: 'uploading' });

      try {
        const existing = await this.prisma.song.findFirst({
          where: {
            OR: [
              t.deezerId ? { deezerId: t.deezerId } : { id: '' },
              { title: { equals: t.title, mode: 'insensitive' }, artist: { equals: t.artist, mode: 'insensitive' } },
            ],
          },
        });

        if (existing) {
          skipped++;
          results.push({ title: t.title, status: 'skipped (already exists)' });
        } else {
          await this.prisma.song.create({
            data: {
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
              uploadedBy: userId,
            },
          });
          imported++;
          results.push({ title: t.title, status: 'imported (catalog)' });
        }
      } catch (err: any) {
        errors++;
        results.push({ title: t.title, status: `error: ${err.message}` });
      }
    }

    this.emitProgress({ jobId, track: '', trackIndex: total, totalTracks: total, percent: 100, status: 'done', done: true });
    this.progressSubs.delete(jobId);

    return { imported, skipped, errors, tracks: results, importType: type };
  }

  // ── Main import ───────────────────────────────────────────────────────────

  async magicImport(
    userId: string,
    artist: string,
    album: string,
    maxTracks: number,
    jobId = 'default',
  ): Promise<MagicImportResult> {
    const emit = (trackTitle: string, trackIndex: number, total: number, status: MagicImportProgress['status'], message?: string, done = false) => {
      const percent = done ? 100 : Math.round(((trackIndex + (status === 'done' || status === 'error' ? 1 : 0.5)) / total) * 100);
      this.emitProgress({ jobId, track: trackTitle, trackIndex, totalTracks: total, percent, status, message, done });
    };

    // 1. Fetch album metadata from Deezer
    const albumData = await this.deezerSearchAlbum(artist, album);
    if (!albumData) throw new Error(`Album "${album}" by "${artist}" not found on Deezer.`);

    // 2. Better cover from iTunes
    const itunesCover = await this.itunesBestCover(artist, album);
    if (itunesCover) albumData.coverUrl = itunesCover;

    // 3. Year + label from MusicBrainz
    const { year, label } = await this.mbYearAndLabel(artist, album);
    const releaseYear = year || albumData.releaseDate.slice(0, 4);

    // 4. Download cover image
    let coverBuffer: Buffer | undefined;
    if (albumData.coverUrl) {
      try {
        const r = await fetch(albumData.coverUrl);
        coverBuffer = Buffer.from(await r.arrayBuffer());
      } catch { /* no cover */ }
    }

    // S3 path prefix: Artist/Album/
    const safeArtist = artist.replace(/[^a-zA-Z0-9 _-]/g, '_');
    const safeAlbum = albumData.name.replace(/[^a-zA-Z0-9 _-]/g, '_');
    const s3Prefix = `${safeArtist}/${safeAlbum}`;

    const tracks = albumData.tracks.slice(0, maxTracks);
    const results: { title: string; status: string }[] = [];
    let imported = 0, skipped = 0, errors = 0;

    // 7. Process each track
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'magic-import-'));

    try {
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        const trackTitle = track.title;
        const total = tracks.length;
        emit(trackTitle, i, total, 'downloading');

        // Check duplicate in DB
        const existing = await this.prisma.song.findFirst({
          where: {
            title: { equals: trackTitle, mode: 'insensitive' },
            artist: { equals: artist, mode: 'insensitive' },
          },
        });
        if (existing?.available) {
          skipped++;
          results.push({ title: trackTitle, status: 'skipped (already exists)' });
          emit(trackTitle, i, total, 'done');
          continue;
        }

        const safeFilename = trackTitle.replace(/[<>:"/\\|?*\u0080-\uffff]/g, '_').trim();
        const trackPrefix = `${String(track.trackNumber).padStart(2, '0')}-${safeFilename}`;
        const trackDir = path.join(tmpDir, trackPrefix);
        await fs.mkdir(trackDir, { recursive: true });
        const outputTemplate = path.join(trackDir, 'audio.%(ext)s');

        try {
          const ytUrl = await this.findYoutubeUrl(track.isrc, artist, trackTitle);
          if (!ytUrl) throw new Error('No YouTube URL found');

          await this.downloadTrack(ytUrl, outputTemplate);

          const files = await fs.readdir(trackDir);
          const downloaded = files[0];
          if (!downloaded) throw new Error('Downloaded file not found');

          const finalPath = path.join(trackDir, downloaded);
          const mp3Path = finalPath.endsWith('.mp3') ? finalPath : finalPath.replace(/\.[^.]+$/, '.mp3');
          if (finalPath !== mp3Path) await fs.rename(finalPath, mp3Path);

          const lyrics = await this.fetchLyrics(trackTitle, artist);

          this.tagMp3(mp3Path, {
            title: trackTitle, artist, album: albumData.name,
            year: releaseYear, genre: albumData.genres,
            trackNumber: track.trackNumber, lyrics, coverBuffer,
          });

          emit(trackTitle, i, total, 'uploading');

          const fileBuffer = await fs.readFile(mp3Path);
          const s3Key = `${s3Prefix}/${String(track.trackNumber).padStart(2, '0')} - ${safeFilename}.mp3`;
          const storagePath = await this.s3Adapter.upload(fileBuffer, s3Key, 'audio/mpeg');

          const songData = {
            title: trackTitle, artist, albumName: albumData.name,
            coverUrl: albumData.coverUrl || null,
            duration: Math.round(track.durationMs / 1000),
            storageType: StorageType.s3, storagePath,
            mimeType: 'audio/mpeg', available: true, uploadedBy: userId,
            ...(lyrics && { lyrics }),
          };

          if (existing) {
            await this.prisma.song.update({ where: { id: existing.id }, data: songData });
          } else {
            await this.prisma.song.create({ data: { ...songData, fileSize: BigInt(fileBuffer.length) } });
          }

          await fs.unlink(mp3Path).catch(() => {});
          imported++;
          results.push({ title: trackTitle, status: 'imported' });
          emit(trackTitle, i, total, 'done');
        } catch (err: any) {
          this.logger.error(`[${jobId}] Error on track "${trackTitle}": ${err.message}`);
          errors++;
          results.push({ title: trackTitle, status: `error: ${err.message}` });
          emit(trackTitle, i, total, 'error', err.message);
        }
      }
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }

    // Signal completion
    this.emitProgress({ jobId, track: '', trackIndex: tracks.length, totalTracks: tracks.length, percent: 100, status: 'done', done: true });
    this.progressSubs.delete(jobId);

    return { imported, skipped, errors, tracks: results };
  }
}
