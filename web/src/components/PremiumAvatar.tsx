import { useState, useEffect } from 'react';

interface Props {
  avatarUrl?: string | null;
  name: string;
  plan: string;
  playing?: boolean;
  size?: number;
  onClick?: () => void;
}

// Gera pontos de um raio (lightning bolt) em SVG path
function lightningPath(cx: number, cy: number, r: number, angle: number, len: number, seed: number): string {
  const segs = 4;
  const segLen = len / segs;
  let x = cx + Math.cos(angle) * r;
  let y = cy + Math.sin(angle) * r;
  let d = `M ${x} ${y}`;
  const rng = (n: number) => Math.sin(seed * 127.1 + n * 311.7) * 5;
  for (let i = 0; i < segs; i++) {
    const jitter = i < segs - 1 ? rng(i) : 0;
    const nx = x + Math.cos(angle) * segLen + Math.cos(angle + Math.PI / 2) * jitter;
    const ny = y + Math.sin(angle) * segLen + Math.sin(angle + Math.PI / 2) * jitter;
    d += ` L ${nx} ${ny}`;
    x = nx; y = ny;
  }
  return d;
}

export function PremiumAvatar({ avatarUrl, name, plan, playing = false, size = 32, onClick }: Props) {
  const isPremium = plan === 'premium' || plan === 'family';
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!isPremium) return;
    let id: number;
    let f = 0;
    const tick = () => {
      f++;
      setFrame(f);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [isPremium]);

  const pad = isPremium ? 14 : 0;
  const total = size + pad * 2;
  const cx = total / 2;
  const cy = total / 2;
  const r = size / 2;

  // Beat pulse
  const beat = isPremium && playing
    ? 0.5 + 0.5 * Math.abs(Math.sin(frame * 0.1)) * Math.abs(Math.sin(frame * 0.04))
    : 0.3;

  // Generate bolt angles — change every ~8 frames
  const boltSeed = Math.floor(frame / 8);
  const bolts = isPremium && playing && frame % 6 < 4
    ? Array.from({ length: 4 }, (_, i) => {
        const angle = (Math.sin(boltSeed * 13.7 + i * 2.3) * Math.PI * 2);
        const len = 8 + Math.abs(Math.sin(boltSeed * 7.1 + i)) * 10;
        return { angle, len, alpha: (0.5 + Math.abs(Math.sin(boltSeed + i)) * 0.5) * beat };
      })
    : [];

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: total,
        height: total,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        flexShrink: 0,
      }}
    >
      {/* SVG effects — fully transparent, no background */}
      {isPremium && (
        <svg
          width={total}
          height={total}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
        >
          {/* Neon ring */}
          <circle
            cx={cx} cy={cy} r={r + 2}
            fill="none"
            stroke={`rgba(29,185,84,${0.8 * beat})`}
            strokeWidth="2"
            filter="url(#glow)"
          />
          {/* Lightning bolts */}
          {bolts.map((b, i) => (
            <path
              key={i}
              d={lightningPath(cx, cy, r, b.angle, b.len, boltSeed + i)}
              fill="none"
              stroke={`rgba(29,185,84,${b.alpha})`}
              strokeWidth="1.5"
              filter="url(#glow)"
            />
          ))}
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>
      )}

      {/* Avatar — on top, no background bleed */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
          flexShrink: 0,
          background: avatarUrl ? 'transparent' : 'linear-gradient(135deg,#1db954,#0d7a3a)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.4,
          fontWeight: 800,
          color: '#000',
        }}
      >
        {avatarUrl
          ? <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : name[0]?.toUpperCase() ?? '?'
        }
      </div>
    </div>
  );
}
