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
    return this.config.get<string>('FFMPEG_PATH') ??
      'C:\\Users\\ytalo\\AppData\\Local\\Programs\\Python\\Python311\\Lib\\site-packages\\imageio_ffmpeg\\binaries\\ffmpeg-win-x86_64-v7.1.exe';
  }

  private get nodePath(): string {
    return this.config.get<string>('NODE_PATH') ?? 'C:\\Program Files\\nodejs\\node.exe';
  }

  private runYtDlp(args: string[]): Promise<{ stdout: string; stderr: string }> {
    // Pass ffmpeg and node paths as single --key=value args to avoid shell splitting on spaces
    const fullArgs = [
      `--ffmpeg-location=${this.ffmpegPath}`,
      `--js-runtimes=node:${this.nodePath}`,
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
    const queries = [
      isrc ? `ytsearch1:${isrc}` : null,
      `ytsearch1:${artist} - ${title} official audio`,
      `ytsearch1:${artist} ${title}`,
    ].filter(Boolean) as string[];

    for (const q of queries) {
      try {
        const { stdout } = await this.runYtDlp(['--get-id', '--no-playlist', '--quiet', '--', q]);
        const id = stdout.trim().split('\n')[0];
        if (id) return `https://youtu.be/${id}`;
      } catch { /* try next */ }
    }
    return '';
  }

  private async downloadTrack(ytUrl: string, outputTemplate: string): Promise<void> {
    await this.runYtDlp([
      `--output=${outputTemplate}`,
      '--format=bestaudio/best',
      '--quiet',
      '--no-warnings',
      '--extract-audio',
      '--audio-format=mp3',
      '--audio-quality=192',
      '--no-playlist',
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
