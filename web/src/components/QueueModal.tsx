import { memo } from 'react';

interface Song {
  id: string;
  title: string;
  artist?: string;
  duration: number;
  coverUrl?: string;
}

interface QueueModalProps {
  queue: Song[];
  currentIdx: number;
  onClose: () => void;
  onPlayFromQueue: (idx: number) => void;
}

export const QueueModal = memo(function QueueModal({ queue, currentIdx, onClose, onPlayFromQueue }: QueueModalProps) {
  if (queue.length === 0) {
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
            padding: 40,
            maxWidth: 400,
            textAlign: 'center',
            zIndex: 10000,
            color: '#b3b3b3',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
          <div>Fila vazia</div>
          <button
            onClick={onClose}
            style={{
              marginTop: 24,
              background: '#1db954',
              border: 'none',
              color: '#fff',
              padding: '8px 24px',
              borderRadius: 500,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Fechar
          </button>
        </div>
      </>
    );
  }

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
          <div style={{ fontSize: 28, fontWeight: 900 }}>▶️ Fila de Reprodução</div>
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

        {/* Queue List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {queue.map((song, idx) => (
            <div
              key={`${song.id}-${idx}`}
              onClick={() => onPlayFromQueue(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: idx === currentIdx ? 'rgba(29, 185, 84, 0.2)' : '#282828',
                border: idx === currentIdx ? '1px solid #1db954' : 'none',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                if (idx !== currentIdx) {
                  e.currentTarget.style.background = '#333';
                }
              }}
              onMouseLeave={e => {
                if (idx !== currentIdx) {
                  e.currentTarget.style.background = '#282828';
                }
              }}
            >
              <div style={{ width: 32, textAlign: 'center', color: '#b3b3b3', fontWeight: 700 }}>
                {idx === currentIdx ? '▶️' : idx + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: idx === currentIdx ? '#1db954' : '#fff',
                  }}
                >
                  {song.title}
                </div>
                <div style={{ fontSize: 12, color: '#b3b3b3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {song.artist || 'Artista desconhecido'}
                </div>
              </div>
              {idx === currentIdx && (
                <div style={{ fontSize: 12, color: '#1db954', fontWeight: 700 }}>TOCANDO</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
});
