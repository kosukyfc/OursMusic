import { useState, useEffect, useCallback } from 'react';

import { API_URL as API } from '../config';

export interface Playlist {
  id: string;
  title: string;
  isPublic: boolean;
  songs: { song: { id: string; title: string; artist?: string; coverUrl?: string; duration: number } }[];
}

async function apiFetch(path: string, token: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
  return res.json();
}

export function usePlaylists(token: string) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch('/playlists', token);
      if (Array.isArray(data)) setPlaylists(data);
    } catch (_) {}
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (title: string): Promise<Playlist | null> => {
    try {
      const data = await apiFetch('/playlists', token, {
        method: 'POST',
        body: JSON.stringify({ title, isPublic: false }),
      });
      setPlaylists(p => [data, ...p]);
      return data;
    } catch (e: any) { alert(e.message); return null; }
  }, [token]);

  const remove = useCallback(async (id: string) => {
    try {
      await apiFetch(`/playlists/${id}`, token, { method: 'DELETE' });
      setPlaylists(p => p.filter(pl => pl.id !== id));
    } catch (e: any) { alert(e.message); }
  }, [token]);

  const addSong = useCallback(async (playlistId: string, songId: string) => {
    try {
      await apiFetch(`/playlists/${playlistId}/songs`, token, {
        method: 'POST',
        body: JSON.stringify({ songId }),
      });
      await load();
    } catch (e: any) { alert(e.message); }
  }, [token, load]);

  const removeSong = useCallback(async (playlistId: string, songId: string) => {
    try {
      await apiFetch(`/playlists/${playlistId}/songs/${songId}`, token, { method: 'DELETE' });
      setPlaylists(p => p.map(pl => pl.id === playlistId
        ? { ...pl, songs: pl.songs.filter(s => s.song.id !== songId) }
        : pl
      ));
    } catch (e: any) { alert(e.message); }
  }, [token]);

  return { playlists, loading, load, create, remove, addSong, removeSong };
}
