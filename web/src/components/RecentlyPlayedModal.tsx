import { memo } from 'react';
import type { PlayHistoryEntry } from '../hooks/usePlayHistory';

interface RecentlyPlayedProps {
  history: PlayHistoryEntry[];
  onClose: () => void;
}

export const RecentlyPlayedModal = memo(function RecentlyPlayedModal({ history, onClose }: RecentlyPlayedProps) {
  const formatTime = (ms: number) => {
    const date = new Date(ms);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 15, 15, 0.8)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(10px)',
        }}
        onClick={onClose}
      />

      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#121212',
          border: '1px solid #282828',
          borderRadius: 12,
          padding: 24,
          maxWidth: 600,
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          zIndex: 10000,
          color: '#fff',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 28, fontWeight: 900 }}>⏱️ Ouvido Recentemente</div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#b3b3b3',
              fontSize: 24,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* History List */}
        {history.length === 0 ? (
          <div style={{ color: '#b3b3b3', textAlign: 'center', padding: '40px 0' }}>
            🎵 Comece a ouvir para build seu histórico!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.slice(0, 50).map((entry, i) => (
              <div
                key={`${entry.songId}-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  background: '#282828',
                  borderRadius: 8,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#333')}
                onMouseLeave={e => (e.currentTarget.style.background = '#282828')}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#b3b3b3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.artist || 'Artista desconhecido'}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#b3b3b3', whiteSpace: 'nowrap' }}>
                  {formatTime(entry.playedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
});
