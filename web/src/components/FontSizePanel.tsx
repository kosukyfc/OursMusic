import { memo } from 'react';
import { useFontSizeAdjuster } from '../hooks/useFontSizeAdjuster';

interface FontSizePanelProps {
  onClose: () => void;
}

export const FontSizePanel = memo(function FontSizePanel({ onClose }: FontSizePanelProps) {
  const { preset, customSize, lineHeight, letterSpacing, applyPreset, setCustomSize, setLineHeight, setLetterSpacing } = useFontSizeAdjuster();

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', borderRadius: 16, padding: 24, maxWidth: 400, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <h2 style={{ color: '#fff', margin: 0, marginBottom: 16, fontSize: 20 }}>🔤 Tamanho da Fonte</h2>

        {/* Presets */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#b3b3b3', fontSize: 12, marginBottom: 8 }}>Predefinições</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {(['small', 'normal', 'large', 'xlarge'] as const).map(p => (
              <button
                key={p}
                onClick={() => applyPreset(p)}
                style={{
                  background: preset === p ? '#1db954' : '#282828',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: 8,
                  cursor: 'pointer',
                  fontSize: ['small', 'normal', 'large', 'xlarge'].indexOf(p) * 2 + 12,
                }}
              >
                {p === 'small' ? 'S' : p === 'normal' ? 'M' : p === 'large' ? 'L' : 'XL'}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Size */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#b3b3b3', fontSize: 12, marginBottom: 6 }}>Personalizado: {customSize}%</div>
          <input
            type="range"
            min="70"
            max="200"
            value={customSize}
            onChange={e => setCustomSize(parseInt(e.target.value))}
            style={{ width: '100%', height: 6, borderRadius: 3, background: '#282828', outline: 'none', WebkitAppearance: 'none' }}
          />
          <div style={{ fontSize: Math.max(12, customSize * 0.12), color: '#1db954', marginTop: 8, textAlign: 'center', fontWeight: 700 }}>Preview</div>
        </div>

        {/* Line Height */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#b3b3b3', fontSize: 12, marginBottom: 6 }}>Espaçamento de Linha: {lineHeight.toFixed(1)}</div>
          <input
            type="range"
            min="1"
            max="2.5"
            step="0.1"
            value={lineHeight}
            onChange={e => setLineHeight(parseFloat(e.target.value))}
            style={{ width: '100%', height: 6, borderRadius: 3, background: '#282828', outline: 'none', WebkitAppearance: 'none' }}
          />
        </div>

        {/* Letter Spacing */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#b3b3b3', fontSize: 12, marginBottom: 6 }}>Espaçamento de Letras: {letterSpacing}px</div>
          <input
            type="range"
            min="0"
            max="5"
            step="0.5"
            value={letterSpacing}
            onChange={e => setLetterSpacing(parseFloat(e.target.value))}
            style={{ width: '100%', height: 6, borderRadius: 3, background: '#282828', outline: 'none', WebkitAppearance: 'none' }}
          />
        </div>

        <button onClick={onClose} style={{ width: '100%', background: '#404040', color: '#fff', border: 'none', borderRadius: 8, padding: 10, cursor: 'pointer' }}>Fechar</button>
      </div>
    </div>
  );
});
