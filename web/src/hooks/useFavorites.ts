import { useState, useEffect, useCallback } from 'react';

import { API_URL as API } from '../config';

async function apiFetch(path: string, token: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}

export function useFavorites(token: string) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!token) return;
    apiFetch('/favorites', token)
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;
        setFavoriteIds(new Set(data.map(f => f.song?.id ?? f.songId).filter(Boolean)));
      })
      .catch(() => {});
  }, [token]);

  const isFavorite = useCallback((songId: string) => favoriteIds.has(songId), [favoriteIds]);

  const toggle = useCallback(async (songId: string) => {
    const wasFav = favoriteIds.has(songId);
    // Optimistic update
    setFavoriteIds(prev => {
      const next = new Set(prev);
      wasFav ? next.delete(songId) : next.add(songId);
      return next;
    });
    try {
      if (wasFav) {
        await apiFetch(`/favorites/${songId}`, token, { method: 'DELETE' });
      } else {
        await apiFetch(`/favorites/${songId}`, token, { method: 'POST' });
      }
    } catch {
      // Revert on error
      setFavoriteIds(prev => {
        const next = new Set(prev);
        wasFav ? next.add(songId) : next.delete(songId);
        return next;
      });
    }
  }, [token, favoriteIds]);

  return { isFavorite, toggle, favoriteIds };
}
