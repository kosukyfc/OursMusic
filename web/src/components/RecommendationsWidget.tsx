import { memo } from 'react';

interface Song {
  id: string;
  title: string;
  artist?: string;
  coverUrl?: string;
}

interface RecommendationsWidgetProps {
  recommendations: Array<{ song: Song; reason: string }>;
  topArtist?: string;
  onPlaySong: (song: Song) => void;
  onAddToQueue?: (song: Song) => void;
  onContextMenu?: (song: Song, x: number, y: number) => void;
}

export const RecommendationsWidget = memo(function RecommendationsWidget({
  recommendations,
  topArtist,
  onPlaySong,
  onAddToQueue,
  onContextMenu,
}: RecommendationsWidgetProps) {
  if (recommendations.length === 0) return null;

  return (
    <div style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(29,185,84,0.08))', borderRadius: 12, marginTop: 20 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>✨</span> Feito Para Você
      </div>
      <div style={{ fontSize: 12, color: '#b3b3b3', marginBottom: 16 }}>
        {topArtist ? `Baseado em sua paixão por ${topArtist}` : 'De acordo com seu gosto'}
      </div>

      {/* Carousel horizontal */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          paddingBottom: 8,
          scrollBehavior: 'smooth',
        }}
      >
        {recommendations.slice(0, 8).map(({ song, reason }) => (
          <div
            key={song.id}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu?.(song, e.clientX, e.clientY); }}
            style={{
              flexShrink: 0,
              width: 140,
              background: '#282828',
              borderRadius: 8,
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: '1px solid #3a3a3a',
              display: 'flex',
              flexDirection: 'column',
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
            {/* Cover */}
            <div
              onClick={() => onPlaySong(song)}
              style={{
                width: '100%',
                aspectRatio: '1',
                background: song.coverUrl ? `url(${song.coverUrl})` : 'linear-gradient(135deg, #a78bfa, #1db954)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                position: 'relative',
              }}
            >
              {!song.coverUrl && '🎵'}
              {/* Play hover overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  fontSize: 28,
                }}
                onMouseEnter={e => ((e.target as HTMLElement).style.opacity = '1')}
                onMouseLeave={e => ((e.target as HTMLElement).style.opacity = '0')}
              >
                ▶️
              </div>
            </div>

            {/* Info */}
            <div style={{ padding: 10, flex: 1, display: 'flex', flexDirection: 'column' }}>
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
              <div
                style={{
                  color: '#b3b3b3',
                  fontSize: 11,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginBottom: 6,
                }}
                title={song.artist}
              >
                {song.artist || 'Unknown'}
              </div>

              {/* Reason tag */}
              <div
                style={{
                  fontSize: 10,
                  color: '#1db954',
                  background: 'rgba(29,185,84,0.1)',
                  padding: '3px 6px',
                  borderRadius: 4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginTop: 'auto',
                }}
                title={reason}
              >
                💡 {reason.substring(0, 20)}...
              </div>
            </div>

            {/* Add to queue button */}
            <div style={{ padding: '8px 10px', borderTop: '1px solid #3a3a3a' }}>
              <button
                onClick={e => {
                  e.stopPropagation();
                  onAddToQueue?.(song);
                }}
                style={{
                  width: '100%',
                  padding: '6px',
                  background: '#1db954',
                  border: 'none',
                  borderRadius: 4,
                  color: '#000',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1ed760')}
                onMouseLeave={e => (e.currentTarget.style.background = '#1db954')}
              >
                + Adicionar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
