import { memo } from 'react';

interface Song {
  id: string;
  title: string;
  artist?: string;
  coverUrl?: string;
}

interface TrendingWidgetProps {
  songs: Song[];
  onPlaySong: (song: Song) => void;
  onContextMenu?: (song: Song, x: number, y: number) => void;
}

export const TrendingWidget = memo(function TrendingWidget({ songs, onPlaySong, onContextMenu }: TrendingWidgetProps) {
  const trending = songs.slice(0, 10);

  return (
    <div style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(29,185,84,0.08), rgba(124,58,237,0.08))', borderRadius: 12, marginTop: 20 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>🔥</span> Em Alta Agora
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
        {trending.map((song, idx) => (
          <div
            key={song.id}
            onClick={() => onPlaySong(song)}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu?.(song, e.clientX, e.clientY); }}
            style={{
              background: '#282828',
              borderRadius: 10,
              padding: 12,
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: '1px solid #3a3a3a',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#3a3a3a';
              e.currentTarget.style.borderColor = '#1db954';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#282828';
              e.currentTarget.style.borderColor = '#3a3a3a';
            }}
          >
            {/* Rank badge */}
            <div
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                background: idx < 3 ? '#fbbf24' : '#6a6a6a',
                color: '#000',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
              }}
            >
              #{idx + 1}
            </div>

            {/* Cover */}
            <div
              style={{
                width: '100%',
                aspectRatio: '1',
                background: song.coverUrl ? `url(${song.coverUrl})` : '#3a3a3a',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: 6,
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
              }}
            >
              {!song.coverUrl && '🎵'}
            </div>

            {/* Title */}
            <div
              style={{
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginBottom: 4,
              }}
              title={song.title}
            >
              {song.title}
            </div>

            {/* Artist */}
            <div
              style={{
                color: '#b3b3b3',
                fontSize: 11,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={song.artist || 'Unknown'}
            >
              {song.artist || 'Unknown'}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: '#6a6a6a', textAlign: 'center' }}>
        🎵 Top 10 músicas mais tocadas agora na plataforma
      </div>
    </div>
  );
});
