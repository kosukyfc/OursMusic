import { useCallback, useState, useEffect } from 'react';
import { API_URL, EXTRA_HEADERS } from '../config';

export interface Genre {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  _count?: {
    songs: number;
    artists: number;
  };
}

export interface SongWithGenres {
  id: string;
  title: string;
  artist?: string;
  albumName?: string;
  coverUrl?: string;
  duration: number;
  genre?: string;
  genres?: Genre[];
}

export function useGenres(token: string) {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get all genres
  const fetchGenres = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/genres`, {
        headers: { Authorization: `Bearer ${token}`, ...EXTRA_HEADERS },
      });
      if (!response.ok) throw new Error('Failed to fetch genres');
      const data = await response.json();
      setGenres(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Get songs by genre ID
  const getSongsByGenreId = useCallback(
    async (genreId: string, page = 1, limit = 50) => {
      try {
        const response = await fetch(
          `${API_URL}/genres/${genreId}/songs?page=${page}&limit=${limit}`,
          { headers: { Authorization: `Bearer ${token}`, ...EXTRA_HEADERS } },
        );
        if (!response.ok) throw new Error('Failed to fetch genre songs');
        return await response.json();
      } catch (err) {
        console.error('Error fetching genre songs:', err);
        return { songs: [], total: 0, page, limit, pages: 0 };
      }
    },
    [token],
  );

  // Get songs by genre name
  const getSongsByGenreName = useCallback(
    async (genreName: string, page = 1, limit = 50) => {
      try {
        const response = await fetch(
          `${API_URL}/genres/name/${encodeURIComponent(genreName)}/songs?page=${page}&limit=${limit}`,
          { headers: { Authorization: `Bearer ${token}`, ...EXTRA_HEADERS } },
        );
        if (!response.ok) throw new Error('Failed to fetch genre songs');
        return await response.json();
      } catch (err) {
        console.error('Error fetching genre songs:', err);
        return { songs: [], total: 0, page, limit, pages: 0 };
      }
    },
    [token],
  );

  // Get genres for a specific song
  const getSongGenres = useCallback(
    async (songId: string) => {
      try {
        const response = await fetch(`${API_URL}/genres/song/${songId}`, {
          headers: { Authorization: `Bearer ${token}`, ...EXTRA_HEADERS },
        });
        if (!response.ok) throw new Error('Failed to fetch song genres');
        return await response.json();
      } catch (err) {
        console.error('Error fetching song genres:', err);
        return [];
      }
    },
    [token],
  );

  useEffect(() => {
    if (token) {
      fetchGenres();
    }
  }, [token, fetchGenres]);

  return {
    genres,
    loading,
    error,
    fetchGenres,
    getSongsByGenreId,
    getSongsByGenreName,
    getSongGenres,
  };
}
