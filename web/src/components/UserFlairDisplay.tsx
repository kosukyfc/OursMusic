/**
 * UserFlairDisplay — exibe raios, badges e nome animado de um usuário.
 * Usado no perfil, cards de amigos, feed de atividade, etc.
 *
 * Props:
 *   flair       — objeto flair do usuário (vindo da API)
 *   name        — nome do usuário
 *   avatarUrl   — URL do avatar
 *   size        — tamanho do avatar em px (default 40)
 *   playing     — se uma música está tocando (para beat-sync)
 *   audioRef    — ref do elemento <audio> para beat detection
 *   showName    — se deve renderizar o nome animado abaixo do avatar
 *   onClick     — callback ao clicar
 */

import { useRef, useEffect, useLayoutEffect, useState } from 'react';
import type React from 'react';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface UserFlair {
  enabled?: boolean;          // efeitos ligados/desligados
  beatSync?: boolean;         // sincronizar com batida
  rayColor?: string;
  rayCount?: number;
  rayStyle?: string;          // normal | long | short | wide | plasma | storm
  nameColor?: string;
  badges?: string[];
}

export const ALL_BADGES = [
  { id: 'premium',  label: 'Premium',    emoji: '💎',  color: '#fbbf24' },
  { id: 'admin',    label: 'Admin',      emoji: '🛡️',  color: '#f59e0b' },
  { id: 'founder',  label: 'Fundador',   emoji: '👑',  color: '#a78bfa' },
  { id: 'dj',       label: 'DJ',         emoji: '🎧',  color: '#00D4FF' },
  { id: 'curator',  label: 'Curador',    emoji: '🎵',  color: '#00FF88' },
  { id: 'beta',     label: 'Beta',       emoji: '⚡',  color: '#f97316' },
  { id: 'verified', label: 'Verificado', emoji: '✅',  color: '#34d399' },
];

// ── Lightning helpers ─────────────────────────────────────────────────────────

function buildBolt(
  x1: number, y1: number, x2: number, y2: number,
  roughness: number, depth: number, pts: [number, number][]
) {
  if (depth === 0) { pts.push([x2, y2]); return; }
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const offset = (Math.random() - 0.5) * len * roughness;
  const nx = -dy / len, ny = dx / len;
  const ox = mx + nx * offset, oy = my + ny * offset;
  buildBolt(x1, y1, ox, oy, roughness * 0.65, depth - 1, pts);
  buildBolt(ox, oy, x2, y2, roughness * 0.65, depth - 1, pts);
}

function drawBolt(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  color: string, alpha: number, width: number,
  roughness: number, depth: number, branchProb: number
) {
  const pts: [number, number][] = [[x1, y1]];
  buildBolt(x1, y1, x2, y2, roughness, depth, pts);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.shadowColor = color; ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
  ctx.globalAlpha = alpha * 0.6;
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = width * 0.35; ctx.shadowBlur = 3;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
  ctx.restore();
  if (depth > 1) {
    for (let i = 2; i < pts.length - 2; i++) {
      if (Math.random() < branchProb) {
        const [bx, by] = pts[i];
        const angle = Math.atan2(y2 - y1, x2 - x1) + (Math.random() - 0.5) * 1.2;
        const blen = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) * (0.2 + Math.random() * 0.3);
        drawBolt(ctx, bx, by, bx + Math.cos(angle) * blen, by + Math.sin(angle) * blen,
          color, alpha * 0.5, width * 0.5, roughness, depth - 1, 0);
      }
    }
  }
}

// ── LightningCanvas ───────────────────────────────────────────────────────────

function LightningCanvas({
  color, count, rayStyle, size, beatPulse,
}: { color: string; count: number; rayStyle: string; size: number; beatPulse: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const bolts     = useRef<{ angle: number; nextAt: number; alpha: number; active: boolean; pts: [number,number][] }[]>([]);
  const plasma    = useRef<{ angle: number; endAngle: number; len: number; born: number }[]>([]);
  const beatRef   = useRef(beatPulse);

  useEffect(() => { beatRef.current = beatPulse; }, [beatPulse]);

  useLayoutEffect(() => {
    bolts.current = Array.from({ length: count }, (_, i) => ({
      angle: (360 / count) * i,
      nextAt: performance.now() + Math.random() * 1800,
      alpha: 0, active: false, pts: [],
    }));
    plasma.current = [];
  }, [count]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const S = size * 2.6;
    canvas.width = S; canvas.height = S;
    const cx = S / 2, cy = S / 2;
    const r = (size / 2) * 0.92;

    // ── plasma ──────────────────────────────────────────────────────────────
    if (rayStyle === 'plasma') {
      plasma.current = Array.from({ length: count }, (_, i) => ({
        angle: (360 / count) * i + (Math.random() - 0.5) * 15,
        endAngle: (360 / count) * i + (Math.random() - 0.5) * 15,
        len: size * (0.45 + Math.random() * 0.55),
        born: performance.now() - Math.random() * 600,
      }));

      function plasmaFrame(now: number) {
        const bp = beatRef.current;
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, 0, S, S);
        plasma.current.forEach((b, bi) => {
          const age = now - b.born;
          const life = 500 + Math.random() * 400;
          if (age > life) {
            plasma.current[bi] = {
              angle: b.endAngle + (Math.random() - 0.5) * 40,
              endAngle: b.endAngle + (Math.random() - 0.5) * 40,
              len: size * (0.4 + Math.random() * 0.6) * (1 + bp * 0.4),
              born: now,
            };
            return;
          }
          const t = age / life;
          const env = (t < 0.15 ? t / 0.15 : t > 0.75 ? (1 - t) / 0.25 : 1) * (1 + bp * 0.5);
          const rad = (b.angle * Math.PI) / 180;
          const sx = cx + Math.cos(rad) * r, sy = cy + Math.sin(rad) * r;
          const ex = cx + Math.cos(rad) * (r + b.len), ey = cy + Math.sin(rad) * (r + b.len);
          const pts: [number, number][] = [[sx, sy]];
          buildBolt(sx, sy, ex, ey, 0.55, 7, pts);
          ctx.save();
          ctx.globalAlpha = env * 0.35; ctx.strokeStyle = color; ctx.lineWidth = 4;
          ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowColor = color; ctx.shadowBlur = 18;
          ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.stroke();
          ctx.globalAlpha = env * 0.85; ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.stroke();
          ctx.globalAlpha = env * 0.7; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.6; ctx.shadowBlur = 4;
          ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.stroke();
          ctx.restore();
        });
        rafRef.current = requestAnimationFrame(plasmaFrame);
      }
      rafRef.current = requestAnimationFrame(plasmaFrame);
      return () => cancelAnimationFrame(rafRef.current);
    }

    // ── storm mode ───────────────────────────────────────────────────────────
    if (rayStyle === 'storm') {
      // Tempestade real: múltiplos raios simultâneos, ramificações pesadas, flashes
      const stormBolts = Array.from({ length: count * 2 }, (_, i) => ({
        angle: (360 / (count * 2)) * i + (Math.random() - 0.5) * 20,
        nextAt: performance.now() + Math.random() * 600,
        alpha: 0, active: false,
        pts: [] as [number, number][],
        width: 1.2 + Math.random() * 1.4,
        len: size * (0.5 + Math.random() * 0.7),
      }));
      let flashAlpha = 0;

      function stormFrame(now: number) {
        const bp = beatRef.current;
        ctx.clearRect(0, 0, S, S);

        // Flash de tela no beat
        if (bp > 0.6) {
          flashAlpha = Math.min(0.18, flashAlpha + bp * 0.12);
        } else {
          flashAlpha = Math.max(0, flashAlpha - 0.025);
        }
        if (flashAlpha > 0) {
          ctx.save();
          ctx.globalAlpha = flashAlpha;
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, S, S);
          ctx.restore();
        }

        stormBolts.forEach(b => {
          const triggerBeat = bp > 0.5 && Math.random() < 0.4;
          if (!b.active && (now >= b.nextAt || triggerBeat)) {
            b.active = true;
            b.alpha = 0.7 + Math.random() * 0.3;
            b.angle += (Math.random() - 0.5) * 30;
            b.len = size * (0.5 + Math.random() * 0.8) * (1 + bp * 0.6);
            b.width = 1.0 + Math.random() * 2.0;
            const rad = (b.angle * Math.PI) / 180;
            const sx = cx + Math.cos(rad) * r, sy = cy + Math.sin(rad) * r;
            const ex = cx + Math.cos(rad) * (r + b.len), ey = cy + Math.sin(rad) * (r + b.len);
            b.pts = [[sx, sy]];
            buildBolt(sx, sy, ex, ey, 0.65, 8, b.pts);
          }
          if (!b.active) return;

          const pts = b.pts;
          const alpha = b.alpha * (1 + bp * 0.5);

          // Glow externo largo
          ctx.save();
          ctx.globalAlpha = alpha * 0.2;
          ctx.strokeStyle = color; ctx.lineWidth = b.width * 5;
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.shadowColor = color; ctx.shadowBlur = 30;
          ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.stroke();
          ctx.restore();

          // Raio principal
          ctx.save();
          ctx.globalAlpha = alpha * 0.9;
          ctx.strokeStyle = color; ctx.lineWidth = b.width;
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.shadowColor = color; ctx.shadowBlur = 14;
          ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.stroke();
          ctx.restore();

          // Core branco
          ctx.save();
          ctx.globalAlpha = alpha * 0.75;
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = b.width * 0.3;
          ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 6;
          ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.stroke();
          ctx.restore();

          // Ramificações pesadas
          for (let i = 2; i < pts.length - 2; i++) {
            if (Math.random() < 0.28) {
              const [bx, by] = pts[i];
              const [ex2, ey2] = pts[pts.length - 1];
              const angle = Math.atan2(ey2 - pts[0][1], ex2 - pts[0][0]) + (Math.random() - 0.5) * 1.8;
              const blen = b.len * (0.15 + Math.random() * 0.4);
              const branchPts: [number, number][] = [[bx, by]];
              buildBolt(bx, by, bx + Math.cos(angle) * blen, by + Math.sin(angle) * blen, 0.6, 5, branchPts);
              ctx.save();
              ctx.globalAlpha = alpha * 0.5;
              ctx.strokeStyle = color; ctx.lineWidth = b.width * 0.5;
              ctx.shadowColor = color; ctx.shadowBlur = 8;
              ctx.beginPath(); ctx.moveTo(branchPts[0][0], branchPts[0][1]);
              for (let j = 1; j < branchPts.length; j++) ctx.lineTo(branchPts[j][0], branchPts[j][1]);
              ctx.stroke();
              ctx.restore();
            }
          }

          b.alpha -= 0.028 + Math.random() * 0.02;
          if (b.alpha <= 0) {
            b.active = false;
            // Intervalo curto para tempestade densa
            b.nextAt = now + 80 + Math.random() * 500;
          }
        });
        rafRef.current = requestAnimationFrame(stormFrame);
      }
      rafRef.current = requestAnimationFrame(stormFrame);
      return () => cancelAnimationFrame(rafRef.current);
    }

    // ── standard modes ───────────────────────────────────────────────────────
    const depth     = rayStyle === 'long' ? 7 : rayStyle === 'short' ? 4 : 6;
    const roughness = rayStyle === 'wide' ? 0.7 : 0.5;
    const boltLen   = rayStyle === 'long'  ? size * 0.85
                    : rayStyle === 'short' ? size * 0.35
                    : size * 0.6;
    const branchP   = rayStyle === 'wide' ? 0.18 : 0.12;

    function frame(now: number) {
      const bp = beatRef.current;
      ctx.clearRect(0, 0, S, S);
      bolts.current.forEach(b => {
        // beat-sync: trigger bolts on beat pulse
        if (!b.active && (now >= b.nextAt || bp > 0.7)) {
          b.active = true; b.alpha = 1;
          const rad = (b.angle * Math.PI) / 180;
          const sx = cx + Math.cos(rad) * r, sy = cy + Math.sin(rad) * r;
          const lenMult = 1 + bp * 0.5;
          const ex = cx + Math.cos(rad) * (r + boltLen * lenMult);
          const ey = cy + Math.sin(rad) * (r + boltLen * lenMult);
          b.pts = [[sx, sy]];
          buildBolt(sx, sy, ex, ey, roughness, depth, b.pts);
        }
        if (!b.active) return;
        drawBolt(ctx,
          b.pts[0][0], b.pts[0][1],
          b.pts[b.pts.length - 1][0], b.pts[b.pts.length - 1][1],
          color, b.alpha * (1 + bp * 0.4), 1.4, roughness, depth, branchP);
        b.alpha -= 0.045;
        if (b.alpha <= 0) {
          b.active = false;
          b.nextAt = now + 400 + Math.random() * 1600;
          b.angle += (Math.random() - 0.5) * (360 / count) * 0.4;
        }
      });
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [color, count, rayStyle, size]);

  const S = size * 2.6;
  return (
    <canvas ref={canvasRef} style={{
      position: 'absolute', left: '50%', top: '50%',
      transform: 'translate(-50%, -50%)',
      width: S, height: S, pointerEvents: 'none', zIndex: 0,
    }} />
  );
}

// ── AnimatedName ──────────────────────────────────────────────────────────────

function AnimatedName({ name, color, beatPulse }: { name: string; color: string; beatPulse: number }) {
  const scale = 1 + beatPulse * 0.08;
  return (
    <span style={{
      color,
      fontWeight: 700,
      display: 'inline-block',
      transform: `scale(${scale})`,
      transition: beatPulse > 0.5 ? 'none' : 'transform 0.15s ease-out',
      textShadow: `0 0 ${6 + beatPulse * 10}px ${color}`,
      letterSpacing: '0.02em',
    }}>
      {name}
    </span>
  );
}

// ── Beat detection hook ───────────────────────────────────────────────────────

function useBeatPulse(audioRef: React.RefObject<HTMLAudioElement | null> | null, enabled: boolean): number {
  const [pulse, setPulse] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef   = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef      = useRef<number>(0);
  const prevEnergy  = useRef(0);

  useEffect(() => {
    if (!enabled || !audioRef?.current) return;
    const audio = audioRef.current;

    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
      sourceRef.current = source;

      const data = new Uint8Array(analyser.frequencyBinCount);
      function tick() {
        analyser.getByteFrequencyData(data);
        // bass energy (first 8 bins ~0-344Hz)
        let energy = 0;
        for (let i = 0; i < 8; i++) energy += data[i];
        energy /= 8 * 255;
        const delta = Math.max(0, energy - prevEnergy.current);
        prevEnergy.current = energy * 0.85;
        setPulse(Math.min(1, delta * 4));
        rafRef.current = requestAnimationFrame(tick);
      }
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      // AudioContext may fail if audio is cross-origin; fallback to time-based
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      analyserRef.current?.disconnect();
      sourceRef.current?.disconnect();
    };
  }, [enabled, audioRef]);

  return pulse;
}

// ── Main component ────────────────────────────────────────────────────────────

interface UserFlairDisplayProps {
  flair?: UserFlair | null;
  name: string;
  avatarUrl?: string | null;
  size?: number;
  playing?: boolean;
  audioRef?: React.RefObject<HTMLAudioElement | null> | null;
  showName?: boolean;
  onClick?: () => void;
  className?: string;
  userPlan?: string; // 'free' | 'premium' | 'family' — raios só para premium/family
  isAdmin?: boolean; // admin vê badges admin/founder
  showBadges?: boolean; // mostrar badges de admin/founder (default true)
}

export function UserFlairDisplay({
  flair, name, avatarUrl, size = 40, playing = false,
  audioRef = null, showName = false, onClick, className = '',
  userPlan, isAdmin = false, showBadges = true,
}: UserFlairDisplayProps) {
  const f = flair ?? {};
  const isPremium = userPlan === 'premium' || userPlan === 'family' || userPlan == null; // null = não sabemos, mostra
  const isFamily = userPlan === 'family';
  const enabled   = f.enabled !== false && isPremium; // raios só para premium
  const beatSync  = f.beatSync ?? false;
  const rayColor  = f.rayColor  ?? '#00FF88';
  const rayCount  = f.rayCount  ?? 6;
  // Tempestade real (storm) apenas para Family
  const rayStyle  = (f.rayStyle === 'storm' && !isFamily) ? 'normal' : (f.rayStyle ?? 'normal');
  const nameColor = f.nameColor ?? '#ffffff';
  const allBadges = f.badges ?? [];

  // Filtra badges: admin/founder só para admins
  const badges = allBadges.filter((id: string) => {
    if (id === 'admin' || id === 'founder') return isAdmin;
    return true;
  });

  // beat pulse: only when beatSync is on and playing
  const beatPulse = useBeatPulse(beatSync && playing ? audioRef : null, beatSync && playing);

  const activeBadges = ALL_BADGES.filter(b => badges.includes(b.id));
  const initial = name?.[0]?.toUpperCase() ?? '?';

  return (
    <div className={`uf-wrap ${className}`} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      {/* Avatar + lightning */}
      <div
        onClick={onClick}
        style={{
          position: 'relative',
          width: size, height: size,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          cursor: onClick ? 'pointer' : 'default',
          flexShrink: 0,
        }}
      >
        {enabled && (
          <LightningCanvas
            color={rayColor}
            count={rayCount}
            rayStyle={rayStyle}
            size={size}
            beatPulse={beatSync ? beatPulse : 0}
          />
        )}

        {/* Avatar */}
        <div style={{
          width: size, height: size, borderRadius: '50%', overflow: 'hidden',
          position: 'relative', zIndex: 1, flexShrink: 0,
          background: avatarUrl ? 'transparent' : 'linear-gradient(135deg,#1db954,#0d7a3a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.4, fontWeight: 800, color: '#000',
          boxShadow: enabled ? `0 0 ${8 + beatPulse * 12}px ${rayColor}55` : undefined,
          transition: 'box-shadow 0.1s',
        }}>
          {avatarUrl
            ? <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <span style={{ color: '#ffffff' }}>{initial}</span>
          }
        </div>
      </div>

      {/* Badges — sobre/ao lado do avatar */}
      {enabled && activeBadges.length > 0 && showBadges && (
        <div style={{ position: 'absolute', bottom: -16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', maxWidth: size * 2 }}>
          {activeBadges.map(b => (
            <span
              key={b.id}
              title={b.label}
              style={{
                fontSize: Math.max(10, size * 0.35),
                filter: `drop-shadow(0 0 4px ${b.color})`,
                lineHeight: 1,
                textShadow: `0 0 8px ${b.color}80`,
              }}
            >
              {b.emoji}
            </span>
          ))}
        </div>
      )}

      {/* Animated name — sem fundo, só texto com glow */}
      {showName && (
        <div style={{ fontSize: Math.max(11, size * 0.3), maxWidth: size * 2.5, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {enabled && nameColor !== '#ffffff'
            ? <AnimatedName name={name} color={nameColor} beatPulse={beatSync ? beatPulse : 0} />
            : <span style={{ color: '#e0e0e0' }}>{name}</span>
          }
        </div>
      )}
    </div>
  );
}
