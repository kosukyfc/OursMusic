import { memo } from 'react';
import type { Badge } from '../hooks/useBadges';

interface StatsModalProps {
  stats: {
    totalPlays: number;
    uniqueArtists: number;
    topArtist: string;
    adventureScore: number;
  };
  badges: Badge[];
  onClose: () => void;
}

export const StatsModal = memo(function StatsModal({ stats, badges, onClose }: StatsModalProps) {
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
          maxWidth: 500,
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          zIndex: 10000,
          color: '#fff',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 28, fontWeight: 900 }}>📊 Estatísticas</div>
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

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
          <div style={{ background: '#282828', padding: 16, borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1db954' }}>{stats.totalPlays}</div>
            <div style={{ fontSize: 12, color: '#b3b3b3', marginTop: 4 }}>Músicas Tocadas</div>
          </div>

          <div style={{ background: '#282828', padding: 16, borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1db954' }}>{stats.uniqueArtists}</div>
            <div style={{ fontSize: 12, color: '#b3b3b3', marginTop: 4 }}>Artistas Únicos</div>
          </div>

          <div style={{ background: '#282828', padding: 16, borderRadius: 8, textAlign: 'center', gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1db954' }}>{stats.topArtist}</div>
            <div style={{ fontSize: 12, color: '#b3b3b3', marginTop: 4 }}>Seu Artista Favorito</div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #1db954, #1ed760)', padding: 16, borderRadius: 8, textAlign: 'center', gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#fff' }}>🎯 {stats.adventureScore}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Adventure Score</div>
          </div>
        </div>

        {/* Badges */}
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>🏆 Conquistas</div>

          {badges.length === 0 ? (
            <div style={{ color: '#b3b3b3', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
              Continue tocando para desbloquear badges!
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 12 }}>
              {badges.map(badge => (
                <div
                  key={badge.id}
                  style={{
                    background: badge.unlocked ? '#1db954' : '#282828',
                    padding: 12,
                    borderRadius: 8,
                    textAlign: 'center',
                    opacity: badge.unlocked ? 1 : 0.5,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  title={badge.description}
                >
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{badge.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>
                    {badge.progress}/{badge.maxProgress}
                  </div>
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.2)',
                      height: 2,
                      borderRadius: 1,
                      marginTop: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        background: '#1db954',
                        height: '100%',
                        width: `${(badge.progress / badge.maxProgress) * 100}%`,
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
});
