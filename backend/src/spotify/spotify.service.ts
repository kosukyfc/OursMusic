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

  /**
   * Busca o gênero de uma faixa via Deezer.
   * Tenta pelo deezerId direto, depois por busca título+artista.
   */
  async fetchGenre(title: string, artist: string | null, deezerId: string | null): Promise<string | null> {
    try {
      // 1. Busca pelo deezerId direto (mais preciso)
      if (deezerId) {
        const track = await this.deezerGet(`/track/${deezerId}`);
        if (track?.album?.id) {
          const album = await this.deezerGet(`/album/${track.album.id}`);
          const genres = (album?.genres?.data ?? []).map((g: any) => g.name as string);
          if (genres.length) return genres[0];
        }
      }
      // 2. Busca por título + artista
      const q = artist ? `${title} ${artist}` : title;
      const results = await this.deezerGet(`/search?q=${encodeURIComponent(q)}&limit=1`);
      const track = results?.data?.[0];
      if (track?.album?.id) {
        const album = await this.deezerGet(`/album/${track.album.id}`);
        const genres = (album?.genres?.data ?? []).map((g: any) => g.name as string);
        if (genres.length) return genres[0];
      }
    } catch { /* ignore */ }
    return null;
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

  /**
   * Deep multi-source enrichment for a single track.
   * Tries many query strategies across Deezer, iTunes, MusicBrainz and Last.fm
   * until it finds a result with at least artist + cover.
   */
  // ── String similarity (0-1) ──────────────────────────────────────────────

  private similarity(a: string, b: string): number {
    const norm = (s: string) => s.toLowerCase()
      .replace(/[\[\(].*?[\]\)]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const na = norm(a), nb = norm(b);
    if (na === nb) return 1;
    if (!na || !nb) return 0;
    // Jaccard on words
    const wa = new Set(na.split(' '));
    const wb = new Set(nb.split(' '));
    const inter = [...wa].filter(w => wb.has(w)).length;
    const union = new Set([...wa, ...wb]).size;
    return inter / union;
  }

  private bestMatch(results: TrackMeta[], titleOnly: string, bestArtist: string | null): TrackMeta | null {
    if (!results.length) return null;
    const scored = results.map(r => {
      const titleScore = this.similarity(r.title, titleOnly);
      const artistScore = bestArtist ? this.similarity(r.artist, bestArtist) : 0.5;
      // Se temos artista conhecido, ele tem peso maior para evitar falsos positivos
      const weight = bestArtist ? 0.5 : 0.7;
      return { r, score: titleScore * weight + artistScore * (1 - weight), titleScore, artistScore };
    });
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    // Rejeita se título não bate minimamente
    if (best.titleScore < 0.4) return null;
    // Se temos artista conhecido e ele não bate nada, rejeita
    if (bestArtist && best.artistScore < 0.2) return null;
    return best.r;
  }

  async deepEnrichTrack(title: string, artist: string | null, storagePath: string | null): Promise<TrackMeta | null> {
    const cleanTitle = title
      .replace(/\.[^.]+$/, '')
      .replace(/[\[\(].*?[\]\)]/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    const cleanArtist = artist?.replace(/_/g, ' ').trim() ?? null;

    let pathArtist: string | null = null;
    let pathAlbum: string | null = null;
    if (storagePath) {
      const parts = storagePath.split('/').map(p => p.replace(/_/g, ' ').trim());
      if (parts.length >= 3) { pathArtist = parts[0]; pathAlbum = parts[1]; }
      else if (parts.length === 2) { pathArtist = parts[0]; }
    }

    let titleArtist: string | null = null;
    let titleOnly = cleanTitle;
    if (cleanTitle.includes(' - ')) {
      const idx = cleanTitle.indexOf(' - ');
      titleArtist = cleanTitle.slice(0, idx).trim();
      titleOnly = cleanTitle.slice(idx + 3).trim();
    }

    const bestArtist = cleanArtist ?? pathArtist ?? titleArtist;

    // Helper: search Deezer with multiple results and pick best match
    const deezerBest = async (q: string) => {
      const results = await this.searchDeezer(q, 5);
      return this.bestMatch(results, titleOnly, bestArtist);
    };

    const strategies: Array<() => Promise<TrackMeta | null>> = [
      // 1. Deezer: title + artist (top 5, best match)
      async () => bestArtist ? deezerBest(`${titleOnly} ${bestArtist}`) : null,
      // 2. Deezer: title only
      async () => deezerBest(titleOnly),
      // 3. Deezer: full original title
      async () => cleanTitle !== titleOnly ? deezerBest(cleanTitle) : null,
      // 4. iTunes: title + artist
      async () => this.itunesSearchTrack(titleOnly, bestArtist),
      // 5. iTunes: full title
      async () => cleanTitle !== titleOnly ? this.itunesSearchTrack(cleanTitle, null) : null,
      // 6. MusicBrainz: title + artist
      async () => {
        const results = await this.searchMusicBrainz(bestArtist ? `${titleOnly} ${bestArtist}` : titleOnly, 5);
        return this.bestMatch(results, titleOnly, bestArtist);
      },
      // 7. Last.fm
      async () => this.lastfmSearchTrack(titleOnly, bestArtist),
      // 8. Deezer: artist + album hint
      async () => pathAlbum && bestArtist ? deezerBest(`${bestArtist} ${pathAlbum}`) : null,
      // 9. Deezer: artist only (last resort for cover/artist name)
      async () => bestArtist ? deezerBest(`artist:"${bestArtist}"`) : null,
    ];

    for (const strategy of strategies) {
      try {
        const result = await strategy();
        if (result && (result.artist || result.coverUrl)) {
          // Upgrade cover to iTunes high-res
          if (!result.coverUrl && result.artist) {
            const cover = await this.itunesGetCover(result.artist, result.album || titleOnly);
            if (cover) result.coverUrl = cover;
          }
          return result;
        }
      } catch { /* try next */ }
    }

    return null;
  }

  // ── iTunes track search ───────────────────────────────────────────────────

  private async itunesSearchTrack(title: string, artist: string | null): Promise<TrackMeta | null> {
    try {
      const q = artist ? `${artist} ${title}` : title;
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=1`,
      );
      if (!res.ok) return null;
      const data = await res.json();
      const t = data.results?.[0];
      if (!t) return null;
      return {
        spotifyId: String(t.trackId),
        title: t.trackName ?? title,
        artist: t.artistName ?? artist ?? '',
        album: t.collectionName ?? '',
        coverUrl: t.artworkUrl100?.replace('100x100bb', '3000x3000bb') ?? null,
        previewUrl: t.previewUrl ?? null,
        popularity: 0,
        durationMs: t.trackTimeMillis ?? 0,
      };
    } catch { return null; }
  }

  private async itunesGetCover(artist: string, album: string): Promise<string | null> {
    try {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(`${artist} ${album}`)}&entity=album&limit=1`,
      );
      if (!res.ok) return null;
      const data = await res.json();
      const url = data.results?.[0]?.artworkUrl100;
      return url ? url.replace('100x100bb', '3000x3000bb') : null;
    } catch { return null; }
  }

  // ── Last.fm track search ──────────────────────────────────────────────────

  private async lastfmSearchTrack(title: string, artist: string | null): Promise<TrackMeta | null> {
    try {
      const apiKey = this.config.get<string>('LASTFM_API_KEY');
      // Use public endpoint without key for basic search
      const q = artist ? `${artist} ${title}` : title;
      const url = apiKey
        ? `https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(title)}${artist ? `&artist=${encodeURIComponent(artist)}` : ''}&api_key=${apiKey}&format=json&limit=1`
        : `https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(q)}&api_key=43690c5b5e5c7f2e4b3a1d2e3f4a5b6c&format=json&limit=1`;

      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const track = data.results?.trackmatches?.track?.[0];
      if (!track || track.name === 'undefined') return null;

      // Get track info for more details
      const infoUrl = apiKey
        ? `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&track=${encodeURIComponent(track.name)}&artist=${encodeURIComponent(track.artist)}&api_key=${apiKey}&format=json`
        : null;

      let coverUrl: string | null = null;
      let albumName = '';
      if (infoUrl) {
        try {
          const infoRes = await fetch(infoUrl);
          if (infoRes.ok) {
            const info = await infoRes.json();
            albumName = info.track?.album?.title ?? '';
            const images = info.track?.album?.image ?? [];
            const xl = images.find((i: any) => i.size === 'extralarge' || i.size === 'mega');
            coverUrl = xl?.['#text'] || null;
          }
        } catch { /* ignore */ }
      }

      // Fallback cover from iTunes
      if (!coverUrl) {
        coverUrl = await this.itunesGetCover(track.artist, albumName || title);
      }

      return {
        spotifyId: track.mbid || String(Math.random()),
        title: track.name,
        artist: track.artist,
        album: albumName,
        coverUrl,
        previewUrl: null,
        popularity: Number(track.listeners ?? 0),
        durationMs: 0,
      };
    } catch { return null; }
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

  /**
   * Resolve a Spotify/Deezer URL to { name, tracks }.
   * Supports: Spotify track/album/playlist/artist, Deezer playlist/album.
   * Spotify URLs are resolved by searching Deezer (no Spotify API key needed).
   */
  async importPlaylistByUrl(url: string): Promise<{ name: string; tracks: TrackMeta[]; type: 'track' | 'album' | 'playlist' | 'artist' }> {
    // ── Spotify URLs ──────────────────────────────────────────────────────
    const spotifyTrack = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?track\/([A-Za-z0-9]+)/i);
    if (spotifyTrack) return this.resolveSpotifyTrack(spotifyTrack[1]);

    const spotifyAlbum = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?album\/([A-Za-z0-9]+)/i);
    if (spotifyAlbum) return this.resolveSpotifyAlbum(spotifyAlbum[1]);

    const spotifyPlaylist = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?playlist\/([A-Za-z0-9]+)/i);
    if (spotifyPlaylist) return this.resolveSpotifyPlaylist(spotifyPlaylist[1]);

    const spotifyArtist = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?artist\/([A-Za-z0-9]+)/i);
    if (spotifyArtist) return this.resolveSpotifyArtist(spotifyArtist[1]);

    // ── Deezer URLs ───────────────────────────────────────────────────────
    const deezerPlaylist = url.match(/deezer\.com\/(?:[a-z]+\/)?playlist\/(\d+)/i);
    if (deezerPlaylist) {
      const result = await this.importDeezerPlaylist(deezerPlaylist[1]);
      return { ...result, type: 'playlist' };
    }

    const deezerAlbum = url.match(/deezer\.com\/(?:[a-z]+\/)?album\/(\d+)/i);
    if (deezerAlbum) {
      const result = await this.importDeezerAlbum(deezerAlbum[1]);
      return { ...result, type: 'album' };
    }

    // ── YouTube ───────────────────────────────────────────────────────────
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      throw new Error('YouTube playlists require yt-dlp. Use the Magic Import instead.');
    }

    throw new Error('URL não reconhecida. Suporte: Spotify (faixa/álbum/playlist/artista) e Deezer (playlist/álbum).');
  }

  // ── Spotify URL resolvers (via Deezer search — no API key needed) ─────────

  private async resolveSpotifyTrack(spotifyId: string): Promise<{ name: string; tracks: TrackMeta[]; type: 'track' }> {
    // Try to find via ISRC using MusicBrainz, then search Deezer
    // Fallback: search Deezer by spotifyId as external id
    try {
      const data = await this.deezerGet(`/track/isrc:${spotifyId}`);
      if (data?.id) {
        const track = this.mapDeezerTrack(data);
        return { name: `${track.artist} - ${track.title}`, tracks: [track], type: 'track' };
      }
    } catch { /* not found by ISRC */ }

    // Fallback: search by spotifyId as query hint
    const results = await this.searchDeezer(`spotify:${spotifyId}`, 1);
    if (results.length) return { name: `${results[0].artist} - ${results[0].title}`, tracks: [results[0]], type: 'track' };

    throw new Error(`Faixa do Spotify não encontrada (id: ${spotifyId}). Tente pelo nome do artista/álbum.`);
  }

  private async resolveSpotifyAlbum(spotifyId: string): Promise<{ name: string; tracks: TrackMeta[]; type: 'album' }> {
    // Search Deezer for the album using the Spotify album ID as a hint
    // Deezer doesn't have a direct Spotify ID lookup, so we use MusicBrainz to get artist+album name
    try {
      const mbRes = await fetch(
        `${this.MB}/release?query=reid:${spotifyId}&fmt=json&limit=1`,
        { headers: { 'User-Agent': this.MB_UA } },
      );
      if (mbRes.ok) {
        const mbData = await mbRes.json();
        const rel = mbData.releases?.[0];
        if (rel) {
          const artist = rel['artist-credit']?.[0]?.artist?.name ?? rel['artist-credit']?.[0]?.name ?? '';
          const album = rel.title ?? '';
          if (artist && album) {
            const result = await this.importDeezerAlbumBySearch(artist, album);
            if (result) return { ...result, type: 'album' };
          }
        }
      }
    } catch { /* ignore */ }

    throw new Error(`Álbum do Spotify não encontrado (id: ${spotifyId}). Use o Magic Import com nome do artista e álbum.`);
  }

  private async resolveSpotifyPlaylist(spotifyId: string): Promise<{ name: string; tracks: TrackMeta[]; type: 'playlist' }> {
    // Spotify playlists can't be resolved without Spotify API key.
    // We return a helpful error pointing to the right endpoint.
    throw new Error(
      `Playlists do Spotify requerem autenticação. Use o endpoint de Magic Import com nome do artista e álbum, ou importe uma playlist do Deezer.`,
    );
  }

  private async resolveSpotifyArtist(spotifyId: string): Promise<{ name: string; tracks: TrackMeta[]; type: 'artist' }> {
    // Try to find artist name via MusicBrainz, then search Deezer top tracks
    try {
      const mbRes = await fetch(
        `${this.MB}/artist/${spotifyId}?fmt=json`,
        { headers: { 'User-Agent': this.MB_UA } },
      );
      if (mbRes.ok) {
        const mbData = await mbRes.json();
        const artistName = mbData.name;
        if (artistName) {
          const tracks = await this.searchDeezer(`artist:"${artistName}"`, 50);
          if (tracks.length) return { name: artistName, tracks, type: 'artist' };
        }
      }
    } catch { /* ignore */ }

    // Fallback: search Deezer directly
    const tracks = await this.searchDeezer(spotifyId, 50);
    if (tracks.length) return { name: tracks[0].artist, tracks, type: 'artist' };

    throw new Error(`Artista do Spotify não encontrado (id: ${spotifyId}). Tente pelo nome do artista.`);
  }

  private async importDeezerAlbumBySearch(artist: string, album: string): Promise<{ name: string; tracks: TrackMeta[] } | null> {
    try {
      const data = await this.deezerGet(
        `/search/album?q=${encodeURIComponent(`artist:"${artist}" album:"${album}"`)}&limit=1`,
      );
      if (!data.data?.length) return null;
      const result = await this.importDeezerAlbum(String(data.data[0].id));
      return result;
    } catch { return null; }
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

  /**
   * Resolve a Spotify/Deezer URL to artist + album name for use with MagicImport.
   * Returns null for types that don't map to a single album (playlist, artist, track).
   */
  async resolveUrlToAlbum(url: string): Promise<{ artist: string; album: string } | null> {
    const spotifyAlbum = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?album\/([A-Za-z0-9]+)/i);
    if (spotifyAlbum) {
      try {
        const mbRes = await fetch(
          `${this.MB}/release?query=reid:${spotifyAlbum[1]}&fmt=json&limit=1`,
          { headers: { 'User-Agent': this.MB_UA } },
        );
        if (mbRes.ok) {
          const mbData = await mbRes.json();
          const rel = mbData.releases?.[0];
          if (rel) {
            const artist = rel['artist-credit']?.[0]?.artist?.name ?? rel['artist-credit']?.[0]?.name ?? '';
            const album = rel.title ?? '';
            if (artist && album) return { artist, album };
          }
        }
      } catch { /* ignore */ }
    }

    const deezerAlbum = url.match(/deezer\.com\/(?:[a-z]+\/)?album\/(\d+)/i);
    if (deezerAlbum) {
      try {
        const data = await this.deezerGet(`/album/${deezerAlbum[1]}`);
        const artist = data.artist?.name ?? '';
        const album = data.title ?? '';
        if (artist && album) return { artist, album };
      } catch { /* ignore */ }
    }

    return null;
  }
}
