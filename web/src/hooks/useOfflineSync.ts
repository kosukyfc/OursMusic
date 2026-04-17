import { useEffect, useState, useCallback } from 'react';

interface CachedSong {
  id: string;
  title: string;
  artist?: string;
  data: Blob;
  cachedAt: number;
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [cachedSongs, setCachedSongs] = useState<CachedSong[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      syncWithServer();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load cache on mount
  useEffect(() => {
    const loadCache = async () => {
      try {
        const db = await openIndexedDB();
        const songs = await getAllCachedSongs(db);
        setCachedSongs(songs);
      } catch (e) {
        console.warn('Failed to load cache:', e);
      }
    };
    loadCache();
  }, []);

  const openIndexedDB = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('OursMusicCache', 1);
      req.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase;
        if (!db.objectStoreNames.contains('songs')) {
          db.createObjectStore('songs', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }, []);

  const cacheSong = useCallback(
    async (song: { id: string; title: string; artist?: string }, blob: Blob) => {
      try {
        const db = await openIndexedDB();
        const tx = db.transaction('songs', 'readwrite');
        const store = tx.objectStore('songs');
        await new Promise((resolve, reject) => {
          const req = store.put({
            id: song.id,
            title: song.title,
            artist: song.artist,
            data: blob,
            cachedAt: Date.now(),
          });
          req.onsuccess = resolve;
          req.onerror = reject;
        });
      } catch (e) {
        console.warn('Failed to cache song:', e);
      }
    },
    [openIndexedDB]
  );

  const getAllCachedSongs = useCallback(
    async (db: IDBDatabase): Promise<CachedSong[]> => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction('songs', 'readonly');
        const store = tx.objectStore('songs');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    },
    []
  );

  const syncWithServer = useCallback(async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    setSyncProgress(0);

    try {
      // Simulate sync with server
      for (let i = 0; i <= 100; i += 10) {
        setSyncProgress(i);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (e) {
      console.warn('Sync failed:', e);
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  }, [isOnline, isSyncing]);

  const getCachedSong = useCallback((songId: string) => {
    return cachedSongs.find((s) => s.id === songId);
  }, [cachedSongs]);

  return {
    isOnline,
    isSyncing,
    syncProgress,
    cacheSong,
    getCachedSong,
    cachedSongs,
    syncWithServer,
  };
}
