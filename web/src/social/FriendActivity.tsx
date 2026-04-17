import { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL, EXTRA_HEADERS } from '../config';
import { UserFlairDisplay } from '../components/UserFlairDisplay';

interface ActivityItem {
  id: string;
  action: 'play' | 'like' | 'add_to_playlist' | 'download';
  timestamp: string;
  user: { id: string; name: string | null; username: string | null; avatarUrl: string | null; flair?: any; plan?: string; isAdmin?: boolean };
  song: { id: string; title: string; artist: string | null; albumName: string | null; coverUrl: string | null } | null;
}

const ACTION_LABEL: Record<string, string> = {
  play:            'está ouvindo',
  like:            'curtiu',
  add_to_playlist: 'adicionou à playlist',
  download:        'baixou',
};

const ACTION_ICON: Record<string, string> = {
  play:            '🎵',
  like:            '❤️',
  add_to_playlist: '➕',
  download:        '⬇️',
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

interface Props {
  token: string;
  onPlaySong?: (songId: string) => void;
  visible: boolean;
}

export function FriendActivity({ token, onPlaySong, visible }: Props) {
  const [items,   setItems]   = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/social/feed?limit=40`, {
        headers: { Authorization: `Bearer ${token}`, ...EXTRA_HEADERS },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao carregar feed');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // initial load + polling every 30s
  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    load();
    pollRef.current = setInterval(load, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [visible, load]);

  if (!visible) return null;

  return (
    <div className="fa-panel">
      <div className="fa-header">
        <span className="fa-header__title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
          Atividade de amigos
        </span>
        <button className="fa-refresh" onClick={() => { setLoading(true); load(); }} title="Atualizar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ animation: loading ? 'fa-spin 0.8s linear infinite' : undefined }}>
            <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
        </button>
      </div>

      <div className="fa-list">
        {loading && items.length === 0 && (
          <div className="fa-empty">
            <span className="fa-spinner" />
            <p>Carregando...</p>
          </div>
        )}

        {error && (
          <div className="fa-empty fa-empty--error">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="fa-empty">
            <span>👥</span>
            <p>Siga amigos para ver o que estão ouvindo</p>
          </div>
        )}

        {items.map(item => (
          <div
            key={item.id}
            className={`fa-item${item.action === 'play' && onPlaySong && item.song ? ' fa-item--playable' : ''}`}
            onClick={() => item.action === 'play' && item.song && onPlaySong?.(item.song.id)}
            title={item.action === 'play' && item.song ? `Tocar ${item.song.title}` : undefined}
          >
            {/* avatar com flair */}
            <div className="fa-item__avatar" style={{ position: 'relative' }}>
              <UserFlairDisplay
                flair={item.user.flair}
                name={item.user.name ?? item.user.username ?? '?'}
                avatarUrl={item.user.avatarUrl}
                size={36}
                showName={false}
                userPlan={item.user.plan}
                isAdmin={item.user.isAdmin === true}
                showBadges={false}
              />
              <span className="fa-item__action-icon" style={{ position: 'absolute', bottom: -2, right: -2 }}>{ACTION_ICON[item.action] ?? '🎵'}</span>
            </div>

            {/* text */}
            <div className="fa-item__body">
              <div className="fa-item__user">
                <span style={item.user.flair?.enabled !== false && item.user.flair?.nameColor ? { color: item.user.flair.nameColor, textShadow: `0 0 6px ${item.user.flair.nameColor}` } : {}}>
                  {item.user.name ?? item.user.username ?? 'Usuário'}
                </span>
                {item.user.username && <span className="fa-item__handle"> @{item.user.username}</span>}
              </div>
              <div className="fa-item__action">{ACTION_LABEL[item.action] ?? item.action}</div>
              {item.song && (
                <div className="fa-item__song">
                  {item.song.coverUrl && (
                    <img src={item.song.coverUrl} alt={item.song.title} className="fa-item__cover" />
                  )}
                  <div className="fa-item__song-info">
                    <span className="fa-item__song-title">{item.song.title}</span>
                    {item.song.artist && (
                      <span className="fa-item__song-artist">{item.song.artist}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* time */}
            <div className="fa-item__time">{timeAgo(item.timestamp)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
