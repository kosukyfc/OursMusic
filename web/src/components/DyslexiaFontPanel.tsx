import { memo } from 'react';
import { useDyslexiaFont } from '../hooks/useDyslexiaFont';

interface DyslexiaFontPanelProps {
  onClose: () => void;
}

export const DyslexiaFontPanel = memo(function DyslexiaFontPanel({ onClose }: DyslexiaFontPanelProps) {
  const { enabled, font, fontSize, lineHeight, letterSpacing, backgroundContrast, toggleDyslexia, setFont, setFontSize, setLineHeight, setLetterSpacing, setContrast } = useDyslexiaFont();

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', borderRadius: 16, padding: 24, maxWidth: 450, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <h2 style={{ color: '#fff', margin: '0 0 16px 0', fontSize: 20 }}>📖 Fonte Dislexia Amigável</h2>

        {/* Enable Toggle */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={toggleDyslexia}
            style={{
              background: enabled ? '#1db954' : '#404040',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {enabled ? '✓ Ativado' : 'Desativado'}
          </button>
          <div style={{ color: '#b3b3b3', fontSize: 12 }}>Ativa suporte para dislexia</div>
        </div>

        {enabled && (
          <>
            {/* Font Selection */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#b3b3b3', fontSize: 12, marginBottom: 8 }}>Tipo de Fonte</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {(['default', 'dyslexia-friendly', 'open-dyslexic'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFont(f)}
                    style={{
                      background: font === f ? '#1db954' : '#282828',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: 8,
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    {f === 'default' ? 'Padrão' : f === 'dyslexia-friendly' ? 'Amigável' : 'OpenDyslexic'}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#b3b3b3', fontSize: 12, marginBottom: 6 }}>Tamanho: {fontSize}%</div>
              <input
                type="range"
                min="80"
                max="150"
                value={fontSize}
                onChange={e => setFontSize(parseInt(e.target.value))}
                style={{ width: '100%', height: 6, borderRadius: 3, background: '#282828', outline: 'none', WebkitAppearance: 'none' }}
              />
            </div>

            {/* Line Height */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#b3b3b3', fontSize: 12, marginBottom: 6 }}>Espaço entre Linhas: {lineHeight.toFixed(1)}</div>
              <input
                type="range"
                min="1.4"
                max="2.5"
                step="0.1"
                value={lineHeight}
                onChange={e => setLineHeight(parseFloat(e.target.value))}
                style={{ width: '100%', height: 6, borderRadius: 3, background: '#282828', outline: 'none', WebkitAppearance: 'none' }}
              />
            </div>

            {/* Letter Spacing */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#b3b3b3', fontSize: 12, marginBottom: 6 }}>Espaço entre Letras: {letterSpacing}px</div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={letterSpacing}
                onChange={e => setLetterSpacing(parseFloat(e.target.value))}
                style={{ width: '100%', height: 6, borderRadius: 3, background: '#282828', outline: 'none', WebkitAppearance: 'none' }}
              />
            </div>

            {/* Contrast */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#b3b3b3', fontSize: 12, marginBottom: 8 }}>Contraste</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {(['normal', 'high', 'inverted'] as const).map(c => (
                  <button
                    key={c}
                    onClick={() => setContrast(c)}
                    style={{
                      background: backgroundContrast === c ? '#1db954' : '#282828',
                      color: backgroundContrast === c ? '#000' : '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: 8,
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    {c === 'normal' ? 'Normal' : c === 'high' ? 'Alto' : 'Invertido'}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <button onClick={onClose} style={{ width: '100%', background: '#404040', color: '#fff', border: 'none', borderRadius: 8, padding: 10, cursor: 'pointer' }}>Fechar</button>
      </div>
    </div>
  );
});
