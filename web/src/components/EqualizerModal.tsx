import { memo, useRef, useEffect } from 'react';

interface EqualizerSettings {
  bass: number;
  mid: number;
  treble: number;
  volume: number;
}

interface EqualizerModalProps {
  settings: EqualizerSettings;
  onSettingsChange: (settings: EqualizerSettings) => void;
  onClose: () => void;
  onApplyPreset: (preset: 'normal' | 'bass' | 'pop' | 'rock' | 'speech') => void;
}

// const PRESETS: Record<'normal' | 'bass' | 'pop' | 'rock' | 'speech', EqualizerSettings> = {
//   normal: { bass: 0, mid: 0, treble: 0, volume: 100 },
//   bass: { bass: 8, mid: 4, treble: 0, volume: 100 },
//   pop: { bass: 4, mid: 6, treble: 4, volume: 100 },
//   rock: { bass: 6, mid: 2, treble: 8, volume: 100 },
//   speech: { bass: -4, mid: 8, treble: 2, volume: 100 },
// };

export const EqualizerModal = memo(function EqualizerModal({
  settings,
  onSettingsChange,
  onClose,
  onApplyPreset,
}: EqualizerModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // const [hoveredBand, setHoveredBand] = useState<'bass' | 'mid' | 'treble' | null>(null);

  // Draw frequency response curve
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 20;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    // White background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (graphHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();

      const x = padding + (graphWidth / 4) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Draw frequency curve
    ctx.strokeStyle = '#1db954';
    ctx.lineWidth = 3;
    ctx.beginPath();

    // Bass (low freq)
    const bassX = padding + graphWidth * 0.2;
    const bassY = height - padding - (settings.bass * graphHeight) / 20 - graphHeight / 2;

    // Mid (mid freq)
    const midX = width / 2;
    const midY = height - padding - (settings.mid * graphHeight) / 20 - graphHeight / 2;

    // Treble (high freq)
    const trebleX = width - padding - graphWidth * 0.2;
    const trebleY = height - padding - (settings.treble * graphHeight) / 20 - graphHeight / 2;

    ctx.moveTo(padding, height - padding - graphHeight / 2);
    ctx.quadraticCurveTo(bassX, bassY, midX, midY);
    ctx.quadraticCurveTo(trebleX, trebleY, width - padding, height - padding - graphHeight / 2);
    ctx.stroke();

    // Draw control points
    [
      { x: bassX, y: bassY, label: 'Bass', color: '#ff6b6b' },
      { x: midX, y: midY, label: 'Mid', color: '#4ecdc4' },
      { x: trebleX, y: trebleY, label: 'Treble', color: '#45b7d1' },
    ].forEach(point => {
      ctx.fillStyle = point.color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      ctx.stroke();
    });
  }, [settings]);

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
          padding: 24,
          maxWidth: 600,
          width: '90%',
          zIndex: 10000,
          color: '#fff',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 28, fontWeight: 900 }}>🎛️ Equalizador</div>
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

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={500}
          height={200}
          style={{
            width: '100%',
            border: '1px solid #282828',
            borderRadius: 8,
            marginBottom: 24,
            background: '#1a1a1a',
          }}
        />

        {/* Sliders */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
          {[
            { key: 'bass', label: '🔊 Bass', color: '#ff6b6b' },
            { key: 'mid', label: '🎵 Mid', color: '#4ecdc4' },
            { key: 'treble', label: '✨ Treble', color: '#45b7d1' },
          ].map(({ key, label, color }) => (
            <div key={key}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 8,
                  color,
                }}
              >
                {label}
              </div>
              <input
                type="range"
                min="-10"
                max="10"
                value={settings[key as keyof typeof settings]}
                onChange={e => {
                  onSettingsChange({
                    ...settings,
                    [key]: parseInt(e.target.value),
                  });
                }}
                // onMouseEnter={() => setHoveredBand(key as 'bass' | 'mid' | 'treble')}
                // onMouseLeave={() => setHoveredBand(null)}
                style={{
                  width: '100%',
                  accentColor: color,
                }}
              />
              <div
                style={{
                  fontSize: 11,
                  color: '#b3b3b3',
                  marginTop: 4,
                  textAlign: 'center',
                }}
              >
                {settings[key as keyof typeof settings]}
              </div>
            </div>
          ))}
        </div>

        {/* Volume */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>🔈 Volume</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.volume}
              onChange={e => {
                onSettingsChange({
                  ...settings,
                  volume: parseInt(e.target.value),
                });
              }}
              style={{ flex: 1, accentColor: '#1db954' }}
            />
            <div style={{ fontSize: 12, color: '#b3b3b3', minWidth: 30 }}>{settings.volume}%</div>
          </div>
        </div>

        {/* Presets */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Presets</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {(['normal', 'bass', 'pop', 'rock', 'speech'] as const).map(preset => (
              <button
                key={preset}
                onClick={() => onApplyPreset(preset)}
                style={{
                  padding: '8px 12px',
                  background: '#282828',
                  border: '1px solid #404040',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#1db954';
                  e.currentTarget.style.borderColor = '#1db954';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#282828';
                  e.currentTarget.style.borderColor = '#404040';
                }}
              >
                {preset === 'normal'
                  ? 'Normal'
                  : preset === 'bass'
                    ? 'Bass'
                    : preset === 'pop'
                      ? 'Pop'
                      : preset === 'rock'
                        ? 'Rock'
                        : 'Fala'}
              </button>
            ))}
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px',
            background: '#1db954',
            border: 'none',
            borderRadius: 500,
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#1ed760';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#1db954';
          }}
        >
          Fechar
        </button>
      </div>
    </>
  );
});
