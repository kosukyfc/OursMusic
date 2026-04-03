import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TrackMeta {
  spotifyId: string;       // reused as generic external ID
  deezerId?: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string | null;
  previewUrl: string | null;
  popularity: number;
  durationMs: number;
  lyrics?: string;
  lyricsSynced?: string;
}

/**
 * Multi-provider metadata service.
 *
 * Priority order:
 *   1. MiniMediaMetadataAPI (self-hosted, if MINI_METADATA_URL is set)
 *   2. Deezer public API (no auth required)
 *   3. MusicBrainz (fallback, free)
 *
 * Lyrics: LRCLIB (free, synced LRC format)
 */
@Injectable()
export class SpotifyService {
  private readonly logger = new Logger(SpotifyService.name);
  private readonly DEEZER = 'https://api.deezer.com';
  private readonly LRCLIB = 'https://lrclib.net/api';
  private readonly MB = 'https://musicbrainz.org/ws/2';
  private readonly MB_UA = 'MusicApp/1.0 (music-app-dev)';
  private readonly CAA = 'https://coverartarchive.org';

  constructor(private readonly config: ConfigService) {}

  // ── Deezer ────────────────────────────────────────────────────────────────

  private async deezerGet(path: string): Promise<any> {
    const res = await fetch(`${this.DEEZER}${path}`);
    if (!res.ok) throw new Error(`Deezer ${res.status}`);
    return res.json();
  }

  private mapDeezerTrack(t: any): TrackMeta {
    return {
      spotifyId: String(t.id),
      deezerId: String(t.id),
      title: t.title,
      artist: t.artist?.name ?? '',
      album: t.album?.title ?? '',
      coverUrl: t.album?.cover_xl ?? t.album?.cover_big ?? t.album?.cover ?? null,
      previewUrl: t.preview ?? null,
      popularity: t.rank ?? 0,
      durationMs: (t.duration ?? 0) * 1000,
    };
  }

  async searchDeezer(query: string, limit = 50): Promise<TrackMeta[]> {
    try {
      const data = await this.deezerGet(
        `/search?q=${encodeURIComponent(query)}&limit=${Math.min(limit, 100)}`,
      );
      return (data.data ?? []).map((t: any) => this.mapDeezerTrack(t));
    } catch (err) {
      this.logger.warn(`Deezer search failed: ${(err as Error).message}`);
      return [];
    }
  }

  // ── MiniMediaMetadataAPI ──────────────────────────────────────────────────

  private async miniMetaSearch(query: string, limit: number): Promise<TrackMeta[]> {
    const baseUrl = this.config.get<string>('MINI_METADATA_URL');
    if (!baseUrl) return [];
    try {
      const res = await fetch(
        `${baseUrl}/api/track/search?query=${encodeURIComponent(query)}&limit=${limit}&providerType=Any`,
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.data ?? data ?? []).map((t: any) => ({
        spotifyId: t.id ?? t.trackId ?? String(Math.random()),
        deezerId: t.deezerId,
        title: t.title ?? t.name,
        artist: t.artistName ?? t.artist?.name ?? '',
        album: t.albumName ?? t.album?.name ?? '',
        coverUrl: t.imageUrl ?? t.coverUrl ?? null,
        previewUrl: t.previewUrl ?? null,
        popularity: t.popularity ?? 0,
        durationMs: (t.duration ?? 0) * 1000,
      }));
    } catch (err) {
      this.logger.warn(`MiniMetadata search failed: ${(err as Error).message}`);
      return [];
    }
  }

  // ── MusicBrainz fallback ──────────────────────────────────────────────────

  private async mbGet(path: string): Promise<any> {
    const res = await fetch(`${this.MB}${path}&fmt=json`, {
      headers: { 'User-Agent': this.MB_UA },
    });
    if (!res.ok) throw new Error(`MusicBrainz ${res.status}`);
    return res.json();
  }

  private async getCoverUrl(releaseId: string): Promise<string | null> {
    try {
      const res = await fetch(`${this.CAA}/release/${releaseId}/front-500`, {
        headers: { 'User-Agent': this.MB_UA }, redirect: 'follow',
      });
      return res.ok ? res.url : null;
    } catch { return null; }
  }

  private async searchMusicBrainz(query: string, limit: number): Promise<TrackMeta[]> {
    try {
      let mbQuery = query;
      if (query.toLowerCase().startsWith('artist:')) {
        mbQuery = `artist:"${query.slice(7).trim()}"`;
      } else if (query.toLowerCase().startsWith('album:')) {
        mbQuery = `release:"${query.slice(6).trim()}"`;
      } else {
        mbQuery = `(recording:"${query}" OR artist:"${query}")`;
      }

      const results: TrackMeta[] = [];
      const pageSize = Math.min(limit, 100);
      const data = await this.mbGet(`/recording?query=${encodeURIComponent(mbQuery)}&limit=${pageSize}`);

      for (const rec of data.recordings ?? []) {
        const release = rec.releases?.[0];
        const coverUrl = release?.id ? await this.getCoverUrl(release.id) : null;
        results.push({
          spotifyId: rec.id,
          title: rec.title,
          artist: rec['artist-credit']?.map((a: any) => a.artist?.name ?? a.name).join(', ') ?? '',
          album: release?.title ?? '',
          coverUrl,
          previewUrl: null,
          popularity: rec.score ?? 0,
          durationMs: rec.length ?? 0,
        });
      }
      return results;
    } catch (err) {
      this.logger.warn(`MusicBrainz search failed: ${(err as Error).message}`);
      return [];
    }
  }

  // ── LRCLIB lyrics ─────────────────────────────────────────────────────────

  async fetchLyrics(title: string, artist: string, album = '', durationSec = 0): Promise<{
    lyrics: string | null;
    lyricsSynced: string | null;
  }> {
    try {
      const params = new URLSearchParams({
        track_name: title,
        artist_name: artist,
        ...(album && { album_name: album }),
        ...(durationSec > 0 && { duration: String(durationSec) }),
      });
      const res = await fetch(`${this.LRCLIB}/get?${params}`);
      if (!res.ok) return { lyrics: null, lyricsSynced: null };
      const data = await res.json();
      return {
        lyrics: data.plainLyrics ?? null,
        lyricsSynced: data.syncedLyrics ?? null,
      };
    } catch {
      return { lyrics: null, lyricsSynced: null };
    }
  }

  // ── Main search (multi-provider) ──────────────────────────────────────────

  async searchCatalog(query: string, limit = 50): Promise<TrackMeta[]> {
    // 1. Try MiniMediaMetadataAPI first
    const miniResults = await this.miniMetaSearch(query, limit);
    if (miniResults.length > 0) return miniResults.slice(0, limit);

    // 2. Try Deezer (best quality covers + preview URLs)
    const deezerResults = await this.searchDeezer(query, limit);
    if (deezerResults.length > 0) return deezerResults.slice(0, limit);

    // 3. Fallback to MusicBrainz
    return this.searchMusicBrainz(query, limit);
  }

  async searchTrack(title: string, artist?: string): Promise<TrackMeta | null> {
    const q = artist ? `${title} ${artist}` : title;
    const results = await this.searchCatalog(q, 1);
    return results[0] ?? null;
  }

  async searchArtists(name: string, limit = 10) {
    try {
      const data = await this.deezerGet(`/search/artist?q=${encodeURIComponent(name)}&limit=${limit}`);
      return (data.data ?? []).map((a: any) => ({
        id: String(a.id),
        name: a.name,
        imageUrl: a.picture_xl ?? a.picture_big ?? a.picture ?? null,
        genres: [],
        popularity: a.nb_fan ?? 0,
      }));
    } catch {
      return [];
    }
  }

  // ── Playlist import by URL ────────────────────────────────────────────────

  async importPlaylistByUrl(url: string): Promise<{ name: string; tracks: TrackMeta[] }> {
    // Deezer playlist: https://www.deezer.com/playlist/XXXXXXX
    const deezerMatch = url.match(/deezer\.com\/(?:[a-z]+\/)?playlist\/(\d+)/i);
    if (deezerMatch) {
      return this.importDeezerPlaylist(deezerMatch[1]);
    }

    // Deezer album: https://www.deezer.com/album/XXXXXXX
    const deezerAlbum = url.match(/deezer\.com\/(?:[a-z]+\/)?album\/(\d+)/i);
    if (deezerAlbum) {
      return this.importDeezerAlbum(deezerAlbum[1]);
    }

    // YouTube playlist: https://www.youtube.com/playlist?list=XXXXX
    const ytMatch = url.match(/[?&]list=([A-Za-z0-9_-]+)/);
    if (ytMatch || url.includes('youtube.com') || url.includes('youtu.be')) {
      throw new Error('YouTube playlists require yt-dlp. Use the Magic Import instead.');
    }

    throw new Error('URL não reconhecida. Suporte: Deezer playlist/album.');
  }

  private async importDeezerPlaylist(id: string): Promise<{ name: string; tracks: TrackMeta[] }> {
    const data = await this.deezerGet(`/playlist/${id}`);
    const name = data.title ?? `Playlist ${id}`;
    const tracks = (data.tracks?.data ?? []).map((t: any) => this.mapDeezerTrack(t));
    return { name, tracks };
  }

  private async importDeezerAlbum(id: string): Promise<{ name: string; tracks: TrackMeta[] }> {
    const [album, tracksData] = await Promise.all([
      this.deezerGet(`/album/${id}`),
      this.deezerGet(`/album/${id}/tracks`),
    ]);
    const name = `${album.artist?.name ?? ''} - ${album.title ?? id}`.trim();
    const tracks = (tracksData.data ?? []).map((t: any) => ({
      ...this.mapDeezerTrack(t),
      album: album.title ?? '',
      coverUrl: album.cover_xl ?? album.cover_big ?? album.cover ?? null,
    }));
    return { name, tracks };
  }
}
