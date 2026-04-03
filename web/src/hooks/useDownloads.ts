import { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:3000';

type DownloadStatus = 'none' | 'downloading' | 'ready';

interface DownloadState {
  [songId: string]: DownloadStatus;
}

export function useDownloads(token: string, isPremium: boolean) {
  const [downloads, setDownloads] = useState<DownloadState>({});
  const [loading, setLoading] = useState(false);

  // Load existing downloads on mount
  useEffect(() => {
    if (!token || !isPremium) return;
    fetch(`${API}/offline/list`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: any[]) => {
        const map: DownloadState = {};
        data.forEach(d => { if (d.song?.id) map[d.song.id] = 'ready'; });
        setDownloads(map);
      })
      .catch(() => {});
  }, [token, isPremium]);

  const downloadSong = useCallback(async (songId: string) => {
    if (!isPremium) {
      alert('Download disponível apenas para usuários Premium.');
      return;
    }
    if (downloads[songId] === 'ready') return; // already downloaded

    setDownloads(prev => ({ ...prev, [songId]: 'downloading' }));
    try {
      const res = await fetch(`${API}/offline/mark/${songId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? 'Erro ao baixar');
      }
      setDownloads(prev => ({ ...prev, [songId]: 'ready' }));
    } catch (e: any) {
      setDownloads(prev => ({ ...prev, [songId]: 'none' }));
      console.warn('Download error:', e.message);
    }
  }, [token, isPremium, downloads]);

  const getStatus = useCallback((songId: string): DownloadStatus => {
    return downloads[songId] ?? 'none';
  }, [downloads]);

  return { downloadSong, getStatus };
}
