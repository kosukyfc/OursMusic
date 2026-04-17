import { memo } from 'react';

interface TempoControlPanelProps {
  tempo?: number;
  onTempoChange?: (tempo: number) => void;
  onClose: () => void;
}

export const TempoControlPanel = memo(function TempoControlPanel({ tempo = 1, onTempoChange = () => {}, onClose }: TempoControlPanelProps) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', borderRadius: 16, padding: 24, maxWidth: 400, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <h2 style={{ color: '#fff', margin: 0, marginBottom: 16, fontSize: 20 }}>⏱️ Velocidade de Reprodução</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => onTempoChange(tempo - 0.1)} style={{ background: '#1db954', color: '#000', border: 'none', borderRadius: 8, width: 40, height: 40, fontSize: 18, cursor: 'pointer', fontWeight: 700 }}>−</button>
          <input type="range" min="0.5" max="2" step="0.1" value={tempo} onChange={e => onTempoChange(parseFloat(e.target.value))} style={{ flex: 1, height: 6, borderRadius: 3 }} />
          <button onClick={() => onTempoChange(tempo + 0.1)} style={{ background: '#1db954', color: '#000', border: 'none', borderRadius: 8, width: 40, height: 40, fontSize: 18, cursor: 'pointer', fontWeight: 700 }}>+</button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ color: '#1db954', fontSize: 32, fontWeight: 700 }}>{tempo.toFixed(1)}x</div>
          <div style={{ color: '#b3b3b3', fontSize: 12 }}>Velocidade de Reprodução</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map(t => (
            <button key={t} onClick={() => onTempoChange(t)} style={{ background: tempo === t ? '#1db954' : '#282828', color: tempo === t ? '#000' : '#fff', border: 'none', borderRadius: 6, padding: 8, fontWeight: 700, cursor: 'pointer' }}>
              {t}x
            </button>
          ))}
        </div>

        <button onClick={onClose} style={{ width: '100%', background: '#404040', color: '#fff', border: 'none', borderRadius: 8, padding: 10, cursor: 'pointer', fontWeight: 700 }}>Fechar</button>
      </div>
    </div>
  );
});
