import { memo } from 'react';
import { MusicTheory } from '../hooks/useMusicTheory';

interface MusicTheoryDisplayProps {
  theory: MusicTheory;
  onClose: () => void;
}

export const MusicTheoryDisplay = memo(function MusicTheoryDisplay({ theory, onClose }: MusicTheoryDisplayProps) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', borderRadius: 16, padding: 24, maxWidth: 400, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <h2 style={{ color: '#fff', margin: 0, marginBottom: 16, fontSize: 20 }}>🎼 Análise Musical</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
          <div style={{ background: '#282828', borderRadius: 8, padding: 12 }}>
            <div style={{ color: '#b3b3b3', fontSize: 11 }}>BPM</div>
            <div style={{ color: '#1db954', fontSize: 24, fontWeight: 700 }}>{theory.bpm}</div>
          </div>
          <div style={{ background: '#282828', borderRadius: 8, padding: 12 }}>
            <div style={{ color: '#b3b3b3', fontSize: 11 }}>Tom</div>
            <div style={{ color: '#1db954', fontSize: 24, fontWeight: 700 }}>{theory.key}</div>
          </div>
          <div style={{ background: '#282828', borderRadius: 8, padding: 12 }}>
            <div style={{ color: '#b3b3b3', fontSize: 11 }}>Escala</div>
            <div style={{ color: '#1db954', fontSize: 16, fontWeight: 700 }}>{theory.scale}</div>
          </div>
          <div style={{ background: '#282828', borderRadius: 8, padding: 12 }}>
            <div style={{ color: '#b3b3b3', fontSize: 11 }}>Compasso</div>
            <div style={{ color: '#1db954', fontSize: 20, fontWeight: 700 }}>{theory.timeSignature}</div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#b3b3b3', fontSize: 12, marginBottom: 6 }}>⚡ Energia: {theory.energy}%</div>
          <div style={{ background: '#282828', borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <div style={{ background: '#1db954', width: `${theory.energy}%`, height: '100%' }} />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#b3b3b3', fontSize: 12, marginBottom: 6 }}>💃 Danceability: {theory.danceability}%</div>
          <div style={{ background: '#282828', borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <div style={{ background: '#1db954', width: `${theory.danceability}%`, height: '100%' }} />
          </div>
        </div>

        <button onClick={onClose} style={{ width: '100%', background: '#404040', color: '#fff', border: 'none', borderRadius: 8, padding: 10, cursor: 'pointer' }}>Fechar</button>
      </div>
    </div>
  );
});
