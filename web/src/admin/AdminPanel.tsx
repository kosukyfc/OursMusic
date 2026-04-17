import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { API_URL, EXTRA_HEADERS } from '../config';
import './admin.css';
import { OursMusicLogo } from '../components/OursMusicLogo';
import { DeployPanel } from './DeployPanel';

interface AdminPanelProps { token: string; userEmail: string; onExit: () => void; onLogout: () => void; }
type AdminPage = 'dashboard' | 'songs' | 'users' | 'import' | 'activity' | 'update' | 'settings';

function apiFetch(path: string, token: string, opts: RequestInit = {}) {
  const tok = (token && token !== 'authenticated') ? token : (sessionStorage.getItem('_om_access') ?? token);
  return fetch(`${API_URL}${path}`, {
    ...opts,
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${tok}`,
      'Content-Type': 'application/json',
      'X-Admin-Token': import.meta.env.VITE_ADMIN_SECRET ?? '',
      ...EXTRA_HEADERS,
      ...(opts.headers ?? {}),
    },
  }).then(r => r.json());
}

// ── Badge definitions ─────────────────────────────────────────────────────────
const ALL_BADGES = [
  { id: 'premium',  label: 'Premium',    emoji: '💎',  color: '#fbbf24' },
  { id: 'admin',    label: 'Admin',      emoji: '🛡️',  color: '#f59e0b' },
  { id: 'founder',  label: 'Fundador',   emoji: '👑',  color: '#a78bfa' },
  { id: 'dj',       label: 'DJ',         emoji: '🎧',  color: '#00D4FF' },
  { id: 'curator',  label: 'Curador',    emoji: '🎵',  color: '#00FF88' },
  { id: 'beta',     label: 'Beta',       emoji: '⚡',  color: '#f97316' },
  { id: 'verified', label: 'Verificado', emoji: '✅',  color: '#34d399' },
];

// ── Realistic Lightning Canvas ────────────────────────────────────────────────

/** Midpoint displacement: recursively splits a segment, offsetting the midpoint
 *  perpendicularly by a random amount that shrinks with depth. */
function buildBolt(
  x1: number, y1: number, x2: number, y2: number,
  roughness: number, depth: number, pts: [number, number][]
) {
  if (depth === 0) { pts.push([x2, y2]); return; }
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  // perpendicular offset
  const offset = (Math.random() - 0.5) * len * roughness;
  const nx = -dy / len;
  const ny =  dx / len;
  const ox = mx + nx * offset;
  const oy = my + ny * offset;
  buildBolt(x1, y1, ox, oy, roughness * 0.65, depth - 1, pts);
  buildBolt(ox, oy, x2, y2, roughness * 0.65, depth - 1, pts);
}

/** Draw one bolt from (x1,y1) to (x2,y2) with optional branches */
function drawBolt(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  color: string, alpha: number, width: number,
  roughness: number, depth: number, branchProb: number
) {
  const pts: [number, number][] = [[x1, y1]];
  buildBolt(x1, y1, x2, y2, roughness, depth, pts);

  // core bolt
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();

  // bright white core
  ctx.globalAlpha = alpha * 0.6;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = width * 0.35;
  ctx.shadowBlur = 3;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
  ctx.restore();

  // random branches
  if (depth > 1) {
    for (let i = 2; i < pts.length - 2; i++) {
      if (Math.random() < branchProb) {
        const [bx, by] = pts[i];
        const angle = Math.atan2(y2 - y1, x2 - x1) + (Math.random() - 0.5) * 1.2;
        const blen = Math.sqrt((x2-x1)**2 + (y2-y1)**2) * (0.2 + Math.random() * 0.3);
        drawBolt(ctx, bx, by, bx + Math.cos(angle) * blen, by + Math.sin(angle) * blen,
          color, alpha * 0.5, width * 0.5, roughness, depth - 1, 0);
      }
    }
  }
}

function LightningCanvas({
  color, count, rayStyle, size,
}: { color: string; count: number; rayStyle: string; size: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const bolts     = useRef<{ angle: number; nextAt: number; alpha: number; active: boolean; pts: [number,number][] }[]>([]);
  const plasma    = useRef<{ angle: number; endAngle: number; len: number; born: number }[]>([]);

  useLayoutEffect(() => {
    bolts.current = Array.from({ length: count }, (_, i) => ({
      angle:  (360 / count) * i,
      nextAt: performance.now() + Math.random() * 1800,
      alpha:  0,
      active: false,
      pts:    [],
    }));
    plasma.current = [];
  }, [count]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const S  = size * 2.6;
    canvas.width  = S;
    canvas.height = S;
    const cx = S / 2;
    const cy = S / 2;
    const r  = (size / 2) * 0.92;

    // ── storm mode: atmospheric stepped-leader + return stroke ──────────────
    if (rayStyle === 'storm') {
      // Each "strike" has phases:
      //   1. LEADER  – bolt grows segment by segment outward (stepped leader)
      //   2. RETURN  – full bolt flashes bright white (return stroke)
      //   3. GLOW    – fades out with afterglow + dart leaders (re-strikes)
      //   4. IDLE    – wait random interval before next strike

      type StrikePhase = 'idle' | 'leader' | 'return' | 'glow';
      interface Strike {
        angle: number;
        len: number;
        pts: [number, number][];
        branches: [number, number][][];
        phase: StrikePhase;
        phaseStart: number;
        leaderStep: number;   // how many pts revealed so far
        returnAlpha: number;
        glowAlpha: number;
        nextAt: number;
        dartCount: number;    // re-strikes remaining
      }

      /** Build a full stepped-leader path with branches */
      function buildStrike(sx: number, sy: number, ex: number, ey: number): {
        pts: [number, number][];
        branches: [number, number][][];
      } {
        const pts: [number, number][] = [[sx, sy]];
        buildBolt(sx, sy, ex, ey, 0.65, 8, pts);

        // 3-6 branches off random points
        const branches: [number, number][][] = [];
        const mainAngle = Math.atan2(ey - sy, ex - sx);
        const totalLen  = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);
        const numBranch = 3 + Math.floor(Math.random() * 4);
        for (let b = 0; b < numBranch; b++) {
          const pi = 4 + Math.floor(Math.random() * (pts.length - 8));
          if (pi >= pts.length) continue;
          const [bx, by] = pts[pi];
          const bAngle   = mainAngle + (Math.random() - 0.5) * 1.6;
          const bLen     = totalLen * (0.15 + Math.random() * 0.35);
          const bPts: [number, number][] = [[bx, by]];
          buildBolt(bx, by, bx + Math.cos(bAngle) * bLen, by + Math.sin(bAngle) * bLen, 0.7, 6, bPts);
          branches.push(bPts);
        }
        return { pts, branches };
      }

      const strikes: Strike[] = Array.from({ length: count }, (_, i) => {
        const angle = (360 / count) * i;
        const rad   = (angle * Math.PI) / 180;
        const sx    = cx + Math.cos(rad) * r;
        const sy2   = cy + Math.sin(rad) * r;
        const len   = size * (0.5 + Math.random() * 0.6);
        const ex    = cx + Math.cos(rad) * (r + len);
        const ey    = cy + Math.sin(rad) * (r + len);
        const { pts, branches } = buildStrike(sx, sy2, ex, ey);
        return {
          angle, len, pts, branches,
          phase: 'idle', phaseStart: 0,
          leaderStep: 0, returnAlpha: 0, glowAlpha: 0,
          nextAt: performance.now() + Math.random() * 2000,
          dartCount: 0,
        };
      });

      function strokePath(pts: [number, number][], upTo: number) {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        const end = Math.min(upTo, pts.length);
        for (let i = 1; i < end; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
      }

      function stormFrame(now: number) {
        ctx.clearRect(0, 0, S, S);

        strikes.forEach((s) => {
          // ── phase transitions ──
          if (s.phase === 'idle' && now >= s.nextAt) {
            // rebuild bolt shape for each new strike
            s.angle  += (Math.random() - 0.5) * (360 / count) * 0.5;
            const rad2 = (s.angle * Math.PI) / 180;
            const sx   = cx + Math.cos(rad2) * r;
            const sy2  = cy + Math.sin(rad2) * r;
            s.len      = size * (0.45 + Math.random() * 0.65);
            const ex   = cx + Math.cos(rad2) * (r + s.len);
            const ey   = cy + Math.sin(rad2) * (r + s.len);
            const built = buildStrike(sx, sy2, ex, ey);
            s.pts      = built.pts;
            s.branches = built.branches;
            s.phase    = 'leader';
            s.phaseStart = now;
            s.leaderStep = 1;
            s.dartCount  = 1 + Math.floor(Math.random() * 2);
          }

          if (s.phase === 'leader') {
            const elapsed = now - s.phaseStart;
            // advance ~3 segments per 16ms frame → full leader in ~80ms
            s.leaderStep = Math.min(s.pts.length, Math.floor(elapsed / 14) + 1);

            // dim purple-blue leader channel
            ctx.save();
            ctx.globalAlpha = 0.55;
            ctx.strokeStyle = color;
            ctx.lineWidth   = 0.8;
            ctx.lineCap     = 'round';
            ctx.lineJoin    = 'round';
            ctx.shadowColor = color;
            ctx.shadowBlur  = 6;
            strokePath(s.pts, s.leaderStep);

            // partial branches proportional to leader progress
            const prog = s.leaderStep / s.pts.length;
            s.branches.forEach(bp => {
              if (prog > 0.3) {
                ctx.globalAlpha = 0.3;
                ctx.lineWidth   = 0.5;
                strokePath(bp, Math.floor(bp.length * Math.min(1, (prog - 0.3) / 0.7)));
              }
            });
            ctx.restore();

            if (s.leaderStep >= s.pts.length) {
              s.phase      = 'return';
              s.phaseStart = now;
              s.returnAlpha = 1;
            }
          }

          if (s.phase === 'return') {
            const elapsed = now - s.phaseStart;
            // return stroke: blazing white flash, lasts ~60ms
            s.returnAlpha = Math.max(0, 1 - elapsed / 60);

            ctx.save();
            // wide outer glow
            ctx.globalAlpha = s.returnAlpha * 0.5;
            ctx.strokeStyle = color;
            ctx.lineWidth   = 6;
            ctx.lineCap     = 'round';
            ctx.lineJoin    = 'round';
            ctx.shadowColor = color;
            ctx.shadowBlur  = 28;
            strokePath(s.pts, s.pts.length);

            // bright white core
            ctx.globalAlpha = s.returnAlpha;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth   = 2.2;
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur  = 12;
            strokePath(s.pts, s.pts.length);

            // branches full bright
            s.branches.forEach(bp => {
              ctx.globalAlpha = s.returnAlpha * 0.75;
              ctx.strokeStyle = color;
              ctx.lineWidth   = 1.2;
              ctx.shadowColor = color;
              ctx.shadowBlur  = 14;
              strokePath(bp, bp.length);
            });
            ctx.restore();

            if (s.returnAlpha <= 0) {
              s.phase      = 'glow';
              s.phaseStart = now;
              s.glowAlpha  = 0.7;
            }
          }

          if (s.phase === 'glow') {
            const elapsed = now - s.phaseStart;
            // afterglow fades over ~300ms, with optional dart re-strikes
            s.glowAlpha = Math.max(0, 0.7 - elapsed / 300);

            ctx.save();
            ctx.globalAlpha = s.glowAlpha * 0.6;
            ctx.strokeStyle = color;
            ctx.lineWidth   = 1.8;
            ctx.lineCap     = 'round';
            ctx.lineJoin    = 'round';
            ctx.shadowColor = color;
            ctx.shadowBlur  = 16;
            strokePath(s.pts, s.pts.length);

            // dart leader re-strikes: quick bright flash on same channel
            if (s.dartCount > 0 && elapsed > 80 && elapsed < 200 && Math.random() < 0.08) {
              ctx.globalAlpha = 0.9;
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth   = 1.4;
              ctx.shadowBlur  = 8;
              strokePath(s.pts, s.pts.length);
              s.dartCount--;
            }

            s.branches.forEach(bp => {
              ctx.globalAlpha = s.glowAlpha * 0.4;
              ctx.strokeStyle = color;
              ctx.lineWidth   = 0.8;
              ctx.shadowBlur  = 8;
              strokePath(bp, bp.length);
            });
            ctx.restore();

            if (s.glowAlpha <= 0) {
              s.phase  = 'idle';
              // realistic inter-strike interval: 0.5s–4s
              s.nextAt = now + 500 + Math.random() * 3500;
            }
          }
        });

        rafRef.current = requestAnimationFrame(stormFrame);
      }

      rafRef.current = requestAnimationFrame(stormFrame);
      return () => cancelAnimationFrame(rafRef.current);
    }

    // ── plasma mode: continuous living bolts ──────────────────────────────
    if (rayStyle === 'plasma') {
      // spawn initial plasma bolts
      plasma.current = Array.from({ length: count }, (_, i) => ({
        angle:    (360 / count) * i + (Math.random() - 0.5) * 15,
        endAngle: (360 / count) * i + (Math.random() - 0.5) * 15,
        len:      size * (0.45 + Math.random() * 0.55),
        born:     performance.now() - Math.random() * 600,
      }));

      // trail buffer: draw semi-transparent black each frame for motion blur
      function plasmaFrame(now: number) {
        // soft trail
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, 0, S, S);

        plasma.current.forEach((b, bi) => {
          const age = now - b.born;
          const life = 500 + Math.random() * 400; // ms per bolt

          if (age > life) {
            // respawn with slight angle drift
            plasma.current[bi] = {
              angle:    b.endAngle + (Math.random() - 0.5) * 40,
              endAngle: b.endAngle + (Math.random() - 0.5) * 40,
              len:      size * (0.4 + Math.random() * 0.6),
              born:     now,
            };
            return;
          }

          // fade in/out envelope
          const t = age / life;
          const env = t < 0.15 ? t / 0.15 : t > 0.75 ? (1 - t) / 0.25 : 1;

          const rad = (b.angle * Math.PI) / 180;
          const sx  = cx + Math.cos(rad) * r;
          const sy  = cy + Math.sin(rad) * r;
          const ex  = cx + Math.cos(rad) * (r + b.len);
          const ey  = cy + Math.sin(rad) * (r + b.len);

          // redraw bolt shape every frame → living/trembling effect
          const pts: [number, number][] = [[sx, sy]];
          buildBolt(sx, sy, ex, ey, 0.55, 7, pts);

          // outer glow pass
          ctx.save();
          ctx.globalAlpha = env * 0.35;
          ctx.strokeStyle = color;
          ctx.lineWidth   = 4;
          ctx.lineCap     = 'round';
          ctx.lineJoin    = 'round';
          ctx.shadowColor = color;
          ctx.shadowBlur  = 18;
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.stroke();

          // main colored bolt
          ctx.globalAlpha = env * 0.85;
          ctx.strokeStyle = color;
          ctx.lineWidth   = 1.6;
          ctx.shadowBlur  = 10;
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.stroke();

          // bright white core
          ctx.globalAlpha = env * 0.7;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth   = 0.6;
          ctx.shadowBlur  = 4;
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.stroke();

          // sub-branches: pick 2-4 random points and shoot short bolts
          const branchCount = 2 + Math.floor(Math.random() * 3);
          for (let b2 = 0; b2 < branchCount; b2++) {
            const pi = 3 + Math.floor(Math.random() * (pts.length - 6));
            if (pi >= pts.length) continue;
            const [bx, by] = pts[pi];
            const bAngle = Math.atan2(ey - sy, ex - sx) + (Math.random() - 0.5) * 1.4;
            const bLen   = b.len * (0.15 + Math.random() * 0.25);
            const bPts: [number, number][] = [[bx, by]];
            buildBolt(bx, by, bx + Math.cos(bAngle) * bLen, by + Math.sin(bAngle) * bLen, 0.6, 5, bPts);

            ctx.globalAlpha = env * 0.5;
            ctx.strokeStyle = color;
            ctx.lineWidth   = 0.9;
            ctx.shadowBlur  = 8;
            ctx.beginPath();
            ctx.moveTo(bPts[0][0], bPts[0][1]);
            for (let i = 1; i < bPts.length; i++) ctx.lineTo(bPts[i][0], bPts[i][1]);
            ctx.stroke();
          }

          ctx.restore();
        });

        rafRef.current = requestAnimationFrame(plasmaFrame);
      }

      rafRef.current = requestAnimationFrame(plasmaFrame);
      return () => cancelAnimationFrame(rafRef.current);
    }

    // ── standard modes (normal / long / short / wide) ─────────────────────
    const depth     = rayStyle === 'long'  ? 7 : rayStyle === 'short' ? 4 : 6;
    const roughness = rayStyle === 'wide'  ? 0.7 : 0.5;
    const boltLen   = rayStyle === 'long'  ? size * 0.85
                    : rayStyle === 'short' ? size * 0.35
                    : size * 0.6;
    const branchP   = rayStyle === 'wide'  ? 0.18 : 0.12;

    function frame(now: number) {
      ctx.clearRect(0, 0, S, S);

      bolts.current.forEach(b => {
        if (!b.active && now >= b.nextAt) {
          b.active = true;
          b.alpha  = 1;
          // generate shape once per flash
          const rad = (b.angle * Math.PI) / 180;
          const sx  = cx + Math.cos(rad) * r;
          const sy  = cy + Math.sin(rad) * r;
          const ex  = cx + Math.cos(rad) * (r + boltLen);
          const ey  = cy + Math.sin(rad) * (r + boltLen);
          b.pts = [[sx, sy]];
          buildBolt(sx, sy, ex, ey, roughness, depth, b.pts);
        }
        if (!b.active) return;

        drawBolt(
          ctx,
          b.pts[0][0], b.pts[0][1],
          b.pts[b.pts.length - 1][0], b.pts[b.pts.length - 1][1],
          color, b.alpha, 1.4, roughness, depth, branchP
        );

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
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: S, height: S,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}

// ── Avatar with realistic lightning ──────────────────────────────────────────
function AvatarOrb({
  letter, image, rayColor, rayCount, rayStyle, size = 34, onClick,
}: {
  letter: string; image?: string; rayColor: string; rayCount: number;
  rayStyle: string; size?: number; onClick?: () => void;
}) {
  return (
    <div
      className="adm-avatar-wrap"
      style={{ width: size, height: size, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <LightningCanvas color={rayColor} count={rayCount} rayStyle={rayStyle} size={size} />
      <div className="adm-avatar-orb" style={{ width: size, height: size, background: image ? 'transparent' : undefined }}>
        {image
          ? <img src={image} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          : <span style={{ fontSize: size * 0.4 }}>{letter}</span>
        }
      </div>
    </div>
  );
}

// ── Profile Modal ─────────────────────────────────────────────────────────────
interface ProfileData {
  name: string;
  username: string;
  avatarUrl: string;
  coverUrl: string;
  badges: string[];
  rayColor: string;
  rayCount: number;
  rayStyle: string;
  nameColor: string;
}

const NAME_COLORS = [
  { id: '#ef4444', label: 'Vermelho'  },
  { id: '#f97316', label: 'Laranja'   },
  { id: '#f59e0b', label: 'Âmbar'     },
  { id: '#00FF88', label: 'Verde'     },
  { id: '#00D4FF', label: 'Ciano'     },
  { id: '#a78bfa', label: 'Roxo'      },
  { id: '#f43f5e', label: 'Rosa'      },
  { id: '#ffffff', label: 'Branco'    },
];

const RAY_PRESETS = [
  { id: 'normal', label: 'Normal'  },
  { id: 'long',   label: 'Longo'   },
  { id: 'short',  label: 'Curto'   },
  { id: 'wide',   label: 'Largo'   },
  { id: 'plasma', label: '⚡ Plasma' },
  { id: 'storm',  label: '🌩️ Tempestade (real)' },
];

const RAY_COLORS = [
  { id: '#00FF88', label: 'Verde'   },
  { id: '#a78bfa', label: 'Roxo'    },
  { id: '#00D4FF', label: 'Ciano'   },
  { id: '#f59e0b', label: 'Âmbar'   },
  { id: '#f97316', label: 'Laranja' },
  { id: '#f43f5e', label: 'Rosa'    },
  { id: '#ffffff', label: 'Branco'  },
];

function ProfileModal({ profile, onSave, onClose }: {
  profile: ProfileData;
  onSave: (p: ProfileData) => void;
  onClose: () => void;
}) {
  const [p, setP] = useState<ProfileData>({ ...profile });
  const [avatarMode, setAvatarMode] = useState<'link' | 'file'>('link');
  const [coverMode, setCoverMode] = useState<'link' | 'file'>('link');
  const [coverOffset, setCoverOffset] = useState(50);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef  = useRef<HTMLInputElement>(null);

  function handleFile(field: 'avatarUrl' | 'coverUrl', file: File) {
    const url = URL.createObjectURL(file);
    setP(prev => ({ ...prev, [field]: url }));
  }

  function toggleBadge(id: string) {
    setP(prev => ({
      ...prev,
      badges: prev.badges.includes(id) ? prev.badges.filter(b => b !== id) : [...prev.badges, id],
    }));
  }

  const letter = (p.name || p.username || '?')[0].toUpperCase();

  return (
    <div className="adm-modal-overlay">
      <div className="adm-modal adm-modal--profile">

        {/* cover */}
        <div className="adm-profile-cover" style={{
          backgroundImage: p.coverUrl ? `url(${p.coverUrl})` : undefined,
          backgroundPositionY: `${coverOffset}%`,
        }}>
          <div className="adm-profile-cover__overlay" />
          <div className="adm-profile-cover__avatar">
            <AvatarOrb letter={letter} image={p.avatarUrl} rayColor={p.rayColor} rayCount={p.rayCount} rayStyle={p.rayStyle} size={72} />
          </div>
          <button className="adm-modal-close adm-profile-close" onClick={onClose}>✕</button>
        </div>

        <div className="adm-profile-body">
          {/* name + username */}
          <div className="adm-profile-identity">
            <div className="adm-profile-name-row">
              <span className="adm-profile-name">{p.name || 'Sem nome'}</span>
              <div className="adm-profile-badges-inline">
                {p.badges.map(bid => {
                  const b = ALL_BADGES.find(x => x.id === bid);
                  return b ? <span key={bid} className="adm-profile-badge" style={{ borderColor: b.color, color: b.color }} title={b.label}>{b.emoji}</span> : null;
                })}
              </div>
            </div>
            <span className="adm-profile-username">@{p.username || 'username'}</span>
          </div>

          {/* form */}
          <div className="adm-profile-section-title">Informações</div>
          <div className="adm-form-row">
            <label>Nome</label>
            <input value={p.name} onChange={e => setP(v => ({ ...v, name: e.target.value }))} placeholder="Seu nome" />
          </div>
          <div className="adm-form-row">
            <label>Nome de usuário</label>
            <input value={p.username} onChange={e => setP(v => ({ ...v, username: e.target.value }))} placeholder="@username" />
          </div>

          {/* avatar */}
          <div className="adm-profile-section-title">Foto de perfil</div>
          <div className="adm-profile-source-tabs">
            <button className={`adm-profile-src-tab${avatarMode === 'link' ? ' active' : ''}`} onClick={() => setAvatarMode('link')}>Link</button>
            <button className={`adm-profile-src-tab${avatarMode === 'file' ? ' active' : ''}`} onClick={() => setAvatarMode('file')}>Arquivo</button>
          </div>
          {avatarMode === 'link'
            ? <div className="adm-form-row"><label>URL da imagem</label><input value={p.avatarUrl} onChange={e => setP(v => ({ ...v, avatarUrl: e.target.value }))} placeholder="https://..." /></div>
            : <div className="adm-form-row"><label>Selecionar arquivo</label><input ref={avatarRef} type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleFile('avatarUrl', e.target.files[0])} /></div>
          }

          {/* cover */}
          <div className="adm-profile-section-title">Capa do perfil</div>
          <div className="adm-profile-source-tabs">
            <button className={`adm-profile-src-tab${coverMode === 'link' ? ' active' : ''}`} onClick={() => setCoverMode('link')}>Link</button>
            <button className={`adm-profile-src-tab${coverMode === 'file' ? ' active' : ''}`} onClick={() => setCoverMode('file')}>Arquivo</button>
          </div>
          {coverMode === 'link'
            ? <div className="adm-form-row"><label>URL da capa</label><input value={p.coverUrl} onChange={e => setP(v => ({ ...v, coverUrl: e.target.value }))} placeholder="https://..." /></div>
            : <div className="adm-form-row"><label>Selecionar arquivo</label><input ref={coverRef} type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleFile('coverUrl', e.target.files[0])} /></div>
          }
          <div className="adm-form-row">
            <label>Ajuste vertical da capa ({coverOffset}%)</label>
            <input type="range" min={0} max={100} value={coverOffset} onChange={e => setCoverOffset(Number(e.target.value))} />
          </div>

          {/* name color */}
          <div className="adm-profile-section-title">Cor do nome</div>
          <div className="adm-form-row">
            <div className="adm-ray-colors">
              {NAME_COLORS.map(c => (
                <button
                  key={c.id}
                  className={`adm-ray-color-btn${p.nameColor === c.id ? ' active' : ''}`}
                  style={{ background: c.id, boxShadow: p.nameColor === c.id ? `0 0 10px ${c.id}` : undefined }}
                  title={c.label}
                  onClick={() => setP(v => ({ ...v, nameColor: c.id }))}
                />
              ))}
            </div>
          </div>

          {/* badges */}
          <div className="adm-profile-section-title">Badges</div>
          <div className="adm-badge-picker">
            {ALL_BADGES.map(b => (
              <button
                key={b.id}
                className={`adm-badge-pick-btn${p.badges.includes(b.id) ? ' active' : ''}`}
                style={{ '--badge-color': b.color } as any}
                onClick={() => toggleBadge(b.id)}
              >
                {b.emoji} {b.label}
              </button>
            ))}
          </div>

          {/* lightning */}
          <div className="adm-profile-section-title">⚡ Efeito de Raios</div>
          <div className="adm-form-row">
            <label>Cor dos raios</label>
            <div className="adm-ray-colors">
              {RAY_COLORS.map(c => (
                <button
                  key={c.id}
                  className={`adm-ray-color-btn${p.rayColor === c.id ? ' active' : ''}`}
                  style={{ background: c.id, boxShadow: p.rayColor === c.id ? `0 0 10px ${c.id}` : undefined }}
                  title={c.label}
                  onClick={() => setP(v => ({ ...v, rayColor: c.id }))}
                />
              ))}
            </div>
          </div>
          <div className="adm-form-row">
            <label>Estilo dos raios</label>
            <div className="adm-ray-styles">
              {RAY_PRESETS.map(r => (
                <button
                  key={r.id}
                  className={`adm-profile-src-tab${p.rayStyle === r.id ? ' active' : ''}`}
                  onClick={() => setP(v => ({ ...v, rayStyle: r.id }))}
                >{r.label}</button>
              ))}
            </div>
          </div>
          <div className="adm-form-row">
            <label>Quantidade de raios ({p.rayCount})</label>
            <input type="range" min={4} max={16} step={2} value={p.rayCount} onChange={e => setP(v => ({ ...v, rayCount: Number(e.target.value) }))} />
          </div>

          <div className="adm-modal__actions" style={{ marginTop: 20 }}>
            <button className="adm-btn adm-magic-btn" onClick={() => { onSave(p); onClose(); }}>Salvar perfil</button>
            <button className="adm-btn adm-btn--ghost" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ page, setPage, onExit, onLogout }: { page: AdminPage; setPage: (p: AdminPage) => void; onExit: () => void; onLogout: () => void }) {
  const items: { id: AdminPage; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
    { id: 'songs',     label: 'Músicas',   icon: '♪' },
    { id: 'users',     label: 'Usuários',  icon: '👥' },
    { id: 'import',    label: 'Importar',  icon: '⬆' },
    { id: 'activity',  label: 'Atividades',icon: '📋' },
    { id: 'update',    label: 'Atualizações', icon: '↻' },
    { id: 'settings',  label: 'Configurações', icon: '⚙' },
  ];
  return (
    <aside className="adm-sidebar">
      <div className="adm-logo">
        <OursMusicLogo size={20} showName={false} />
        <span>OursMusic</span>
      </div>
      <nav className="adm-nav">
        {items.map(i => (
          <button key={i.id} className={`adm-nav__item${page === i.id ? ' adm-nav__item--active' : ''}`} onClick={() => setPage(i.id)}>
            <span className="adm-nav__icon">{i.icon}</span>
            <span>{i.label}</span>
          </button>
        ))}
      </nav>
      <button className="adm-nav__item adm-nav__exit" onClick={onExit}>
        <span className="adm-nav__icon">←</span>
        <span>Voltar ao Player</span>
      </button>
      <button className="adm-nav__item adm-nav__logout" onClick={() => { if (confirm('Sair da conta?')) onLogout(); }}>
        <span className="adm-nav__icon">⏻</span>
        <span>Sair da conta</span>
      </button>
    </aside>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────────────
function Topbar({ userEmail, search, setSearch, profile, onOpenProfile }: {
  userEmail: string; search: string; setSearch: (s: string) => void;
  profile: ProfileData; onOpenProfile: () => void;
}) {
  const letter = (profile.name || userEmail)[0].toUpperCase();
  const activeBadges = ALL_BADGES.filter(b => profile.badges.includes(b.id));

  return (
    <header className="adm-topbar">
      <span className="adm-topbar__brand">OursMusic</span>
      <div className="adm-topbar__search">
        <span>🔍</span>
        <input placeholder="Buscar músicas, usuários..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="adm-topbar__right">
        <div className="adm-topbar__secure">🔒 Secure • HTTPS • 2FA</div>
        <div className="adm-topbar__restricted">Acesso Restrito — Admins</div>
        {/* badges ao lado do avatar */}
        <div className="adm-topbar__badges">
          {activeBadges.map(b => (
            <span key={b.id} className="adm-topbar-badge" style={{ color: b.color, borderColor: b.color }} title={b.label}>{b.emoji}</span>
          ))}
        </div>
        <AvatarOrb
          letter={letter}
          image={profile.avatarUrl}
          rayColor={profile.rayColor}
          rayCount={profile.rayCount}
          rayStyle={profile.rayStyle}
          size={36}
          onClick={onOpenProfile}
        />
      </div>
    </header>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, delta, color }: { label: string; value: string | number; icon: string; delta?: string; color?: string }) {
  return (
    <div className="adm-stat-card">
      <div className="adm-stat-card__icon" style={{ color: color ?? '#7c3aed' }}>{icon}</div>
      <div className="adm-stat-card__body">
        <div className="adm-stat-card__value">{value}</div>
        <div className="adm-stat-card__label">{label}</div>
        {delta && <div className={`adm-stat-card__delta ${delta.startsWith('+') ? 'pos' : 'neg'}`}>{delta}</div>}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ token, profile }: { token: string; profile: ProfileData }) {
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [playStats, setPlayStats] = useState<any[]>([]);

  useEffect(() => {
    apiFetch('/admin/stats', token).then(setStats).catch(() => {});
    apiFetch('/admin/activity?limit=10', token).then(d => setActivity(Array.isArray(d) ? d : [])).catch(() => {});
    apiFetch('/admin/songs/play-stats', token).then(d => {
      let songs = [];
      if (Array.isArray(d)) songs = d;
      else if (d?.songs && Array.isArray(d.songs)) songs = d.songs;
      setPlayStats(songs.slice(0, 10));
    }).catch(() => {});
  }, [token]);

  const maxPlays = playStats[0]?.playCount ?? 1;
  const activeBadges = ALL_BADGES.filter(b => profile.badges.includes(b.id));
  const letter = (profile.name || 'A')[0].toUpperCase();

  return (
    <div className="adm-page">
      {/* greeting row with name + badges */}
      <div className="adm-dashboard-greeting">
        <AvatarOrb letter={letter} image={profile.avatarUrl} rayColor={profile.rayColor} rayCount={profile.rayCount} rayStyle={profile.rayStyle} size={48} />
        <div>
          <div className="adm-dashboard-name-row">
            <span className="adm-dashboard-name">
              <span className="adm-name-shine" style={{ color: profile.nameColor || '#ef4444' }}>{profile.name || 'Admin'}</span>
            </span>
            {activeBadges.map(b => (
              <span key={b.id} className="adm-profile-badge" style={{ borderColor: b.color, color: b.color }} title={b.label}>{b.emoji} {b.label}</span>
            ))}
          </div>
          <span className="adm-dashboard-sub">Bem-vindo ao painel de controle</span>
        </div>
      </div>

      <div className="adm-stats-grid">
        <StatCard label="Total de Músicas" value={stats?.totalSongs ?? '—'} icon="🎵" delta="+12%" />
        <StatCard label="Usuários Ativos" value={stats?.totalUsers ?? '—'} icon="👥" delta="+5%" color="#00D4FF" />
        <StatCard label="Playlists" value={stats?.totalPlaylists ?? '—'} icon="📋" color="#a78bfa" />
        <StatCard label="Atividades" value={stats?.totalActivities ?? '—'} icon="📊" delta="+8%" color="#f59e0b" />
      </div>

      <div className="adm-charts-row">
        <div className="adm-card adm-card--wide">
          <div className="adm-card__title">Top 10 Músicas Mais Tocadas</div>
          {playStats.length === 0 ? <div className="adm-empty">Sem dados</div> : (
            <div className="adm-bar-chart">
              {playStats.map((s, i) => (
                <div key={s.id} className="adm-bar-chart__row">
                  <span className="adm-bar-chart__rank">#{i + 1}</span>
                  <span className="adm-bar-chart__name">{s.title}</span>
                  <div className="adm-bar-chart__bar-wrap">
                    <div className="adm-bar-chart__bar" style={{ width: `${Math.round((s.playCount / maxPlays) * 100)}%` }} />
                  </div>
                  <span className="adm-bar-chart__count">{s.playCount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="adm-card">
          <div className="adm-card__title">Distribuição de Planos</div>
          {stats?.planDistribution ? (
            <div className="adm-plan-dist">
              {Object.entries(stats.planDistribution).map(([plan, count]: any) => (
                <div key={plan} className="adm-plan-dist__row">
                  <span className="adm-plan-dist__label">{plan}</span>
                  <span className="adm-plan-dist__count">{count}</span>
                </div>
              ))}
            </div>
          ) : <div className="adm-empty">Sem dados</div>}
        </div>
      </div>

      <div className="adm-card adm-card--full">
        <div className="adm-card__title">Últimas Atividades</div>
        <table className="adm-table">
          <thead><tr><th>Usuário</th><th>Ação</th><th>Música</th><th>Data/Hora</th></tr></thead>
          <tbody>
            {activity.length === 0
              ? <tr><td colSpan={4} className="adm-empty">Sem atividades</td></tr>
              : activity.map((a, i) => (
                <tr key={i}>
                  <td>{a.user?.email ?? a.userId ?? '—'}</td>
                  <td><span className="adm-badge">{a.action}</span></td>
                  <td>{a.song?.title ?? a.songId ?? '—'}</td>
                  <td>{a.createdAt ? new Date(a.createdAt).toLocaleString('pt-BR') : '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Songs Page ────────────────────────────────────────────────────────────────
function SongsPage({ token, search }: { token: string; search: string }) {
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editSong, setEditSong] = useState<any | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/admin/songs${search ? `?q=${encodeURIComponent(search)}` : ''}`, token)
      .then(d => setSongs(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [token, search]);

  useEffect(() => { load(); }, [load]);

  async function deleteSong(id: string) {
    if (!confirm('Excluir esta música?')) return;
    await fetch(`${API_URL}/admin/songs/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    load();
  }

  async function saveEdit() {
    if (!editSong) return;
    await fetch(`${API_URL}/admin/songs/${editSong.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editSong.title, artist: editSong.artist, albumName: editSong.albumName, genre: editSong.genre }),
    });
    setEditSong(null);
    load();
  }

  return (
    <div className="adm-page">
      <h1 className="adm-page__title">Músicas <span className="adm-badge">{songs.length}</span></h1>
      {loading ? <div className="adm-loading">Carregando...</div> : (
        <div className="adm-card adm-card--full">
          <table className="adm-table">
            <thead><tr><th>Capa</th><th>Título</th><th>Artista</th><th>Álbum</th><th>Gênero</th><th>Plays</th><th>Ações</th></tr></thead>
            <tbody>
              {songs.map(s => (
                <tr key={s.id}>
                  <td><div className="adm-cover">{s.coverUrl ? <img src={s.coverUrl} alt="" /> : '🎵'}</div></td>
                  <td>{s.title}</td>
                  <td>{s.artist ?? '—'}</td>
                  <td>{s.albumName ?? '—'}</td>
                  <td>{s.genre ?? '—'}</td>
                  <td>{s.playCount ?? 0}</td>
                  <td>
                    <button className="adm-btn adm-btn--sm" onClick={() => setEditSong({ ...s })}>Editar</button>
                    <button className="adm-btn adm-btn--sm adm-btn--danger" onClick={() => deleteSong(s.id)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editSong && (
        <div className="adm-modal-overlay" onClick={() => setEditSong(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal__title">Editar Música</div>
            {(['title', 'artist', 'albumName', 'genre'] as const).map(f => (
              <div key={f} className="adm-form-row">
                <label>{f}</label>
                <input value={editSong[f] ?? ''} onChange={e => setEditSong((s: any) => ({ ...s, [f]: e.target.value }))} />
              </div>
            ))}
            <div className="adm-modal__actions">
              <button className="adm-btn" onClick={saveEdit}>Salvar</button>
              <button className="adm-btn adm-btn--ghost" onClick={() => setEditSong(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Users Page ────────────────────────────────────────────────────────────────
function UsersPage({ token, search }: { token: string; search: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/admin/users${search ? `?q=${encodeURIComponent(search)}` : ''}`, token)
      .then(d => setUsers(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [token, search]);

  useEffect(() => { load(); }, [load]);

  async function setPlan(id: string, plan: string, days?: number) {
    await apiFetch(`/admin/users/${id}/plan`, token, {
      method: 'PUT',
      body: JSON.stringify({ plan, durationDays: days }),
    });
    load();
  }

  async function toggleAdmin(id: string, current: boolean) {
    await apiFetch(`/admin/users/${id}/admin`, token, {
      method: 'PUT',
      body: JSON.stringify({ isAdmin: !current }),
    });
    load();
  }

  async function deleteUser(id: string) {
    if (!confirm('Excluir este usuário?')) return;
    await apiFetch(`/admin/users/${id}`, token, { method: 'DELETE' });
    load();
  }

  return (
    <div className="adm-page">
      <h1 className="adm-page__title">Usuários <span className="adm-badge">{users.length}</span></h1>
      {loading ? <div className="adm-loading">Carregando...</div> : (
        <div className="adm-card adm-card--full">
          <table className="adm-table">
            <thead><tr><th>Email</th><th>Nome</th><th>Plano</th><th>Admin</th><th>Criado em</th><th>Ações</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.name ?? '—'}</td>
                  <td>
                    <select className="adm-select" value={u.plan} onChange={e => setPlan(u.id, e.target.value, e.target.value === 'free' ? undefined : -1)}>
                      <option value="free">Free</option>
                      <option value="premium">Premium</option>
                      <option value="family">Family</option>
                    </select>
                  </td>
                  <td>
                    <button className={`adm-btn adm-btn--sm ${u.isAdmin ? 'adm-btn--active' : 'adm-btn--ghost'}`} onClick={() => toggleAdmin(u.id, u.isAdmin)}>
                      {u.isAdmin ? 'Admin ✓' : 'Admin'}
                    </button>
                  </td>
                  <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '—'}</td>
                  <td><button className="adm-btn adm-btn--sm adm-btn--danger" onClick={() => deleteUser(u.id)}>Excluir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Magic Import Modal ────────────────────────────────────────────────────────
type MagicMode = 'album_artist' | 'track' | 'album_only' | 'playlist' | 'artist' | 'all_albums';

interface ArtistTrack { id: string; title: string; artist: string; album: string; coverUrl: string; durationMs: number; }

function ArtistPickerModal({ token, artist, onConfirm, onClose }: {
  token: string; artist: string;
  onConfirm: (tracks: ArtistTrack[], jobId: string) => void;
  onClose: () => void;
}) {
  const [tracks, setTracks] = useState<ArtistTrack[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    setLoading(true); setError('');
    fetch(`${API_URL}/admin/magic-import/artist-tracks?artist=${encodeURIComponent(artist)}&limit=50`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Admin-Token': import.meta.env.VITE_ADMIN_SECRET ?? '' },
      credentials: 'include',
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) { setTracks(data); setSelected(new Set(data.slice(0, 10).map((t: ArtistTrack) => t.id))); }
        else setError('Artista não encontrado no Deezer.');
      })
      .catch(() => setError('Erro ao buscar músicas.'))
      .finally(() => setLoading(false));
  }, [artist, token]);

  function toggleAll() {
    if (selected.size === tracks.slice(0, limit).length) setSelected(new Set());
    else setSelected(new Set(tracks.slice(0, limit).map(t => t.id)));
  }

  function toggle(id: string) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function handleConfirm() {
    const chosen = tracks.filter(t => selected.has(t.id));
    if (!chosen.length) return;
    onConfirm(chosen, `job-${Date.now()}`);
  }

  const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;

  return (
    <div className="adm-modal-overlay" style={{ zIndex: 1100 }} onClick={onClose}>
      <div className="adm-modal adm-modal--artist-picker" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="adm-magic-header">
          <span className="adm-magic-title">🎤 {artist}</span>
          <button className="adm-modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '8px 20px', borderBottom: '1px solid #313244', display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ color: '#a6adc8', fontSize: 13 }}>Mostrar top</label>
          <input type="number" value={limit} min={1} max={50} onChange={e => setLimit(Math.min(50, Math.max(1, Number(e.target.value))))} style={{ width: 60, background: '#313244', border: 'none', borderRadius: 6, color: '#cdd6f4', padding: '4px 8px', fontSize: 13 }} />
          <label style={{ color: '#a6adc8', fontSize: 13 }}>músicas</label>
          <button onClick={toggleAll} style={{ marginLeft: 'auto', background: 'none', border: '1px solid #45475a', borderRadius: 6, color: '#a6adc8', padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
            {selected.size === tracks.slice(0, limit).length ? 'Desmarcar todos' : 'Selecionar todos'}
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading && <div style={{ padding: 24, textAlign: 'center', color: '#a6adc8' }}>🔍 Buscando músicas...</div>}
          {error && <div style={{ padding: 24, textAlign: 'center', color: '#f38ba8' }}>{error}</div>}
          {!loading && !error && tracks.slice(0, limit).map((t, i) => (
            <div key={t.id} onClick={() => toggle(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', cursor: 'pointer', background: selected.has(t.id) ? 'rgba(124,58,237,0.15)' : 'transparent', borderBottom: '1px solid #1e1e2e', transition: 'background 0.15s' }}>
              <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} onClick={e => e.stopPropagation()} style={{ accentColor: '#7c3aed', width: 16, height: 16, cursor: 'pointer' }} />
              {t.coverUrl && <img src={t.coverUrl} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#cdd6f4', fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i + 1}. {t.title}</div>
                <div style={{ color: '#6c7086', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.album}</div>
              </div>
              <span style={{ color: '#6c7086', fontSize: 12, flexShrink: 0 }}>{fmt(t.durationMs)}</span>
            </div>
          ))}
        </div>
        <div className="adm-modal__actions" style={{ borderTop: '1px solid #313244' }}>
          <button className="adm-btn adm-magic-btn" onClick={handleConfirm} disabled={selected.size === 0}>
            ✨ Importar {selected.size} música{selected.size !== 1 ? 's' : ''}
          </button>
          <button className="adm-btn adm-btn--ghost" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

interface DeezerAlbum { id: string; title: string; coverUrl: string; releaseDate: string; trackCount: number; alreadyImported?: boolean; }

function AlbumPickerModal({ token, artist, onConfirm, onClose }: {
  token: string; artist: string;
  onConfirm: (albumIds: string[], jobId: string) => void;
  onClose: () => void;
}) {
  const [albums, setAlbums] = useState<DeezerAlbum[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true); setError('');
    apiFetch(`/admin/magic-import/artist-albums?artist=${encodeURIComponent(artist)}`, token)
      .then(data => {
        if (Array.isArray(data)) {
          setAlbums(data);
          // Pré-seleciona apenas os que ainda não foram importados
          setSelected(new Set(data.filter((a: DeezerAlbum) => !a.alreadyImported).map((a: DeezerAlbum) => a.id)));
        } else setError('Artista não encontrado no Deezer.');
      })
      .catch(() => setError('Erro ao buscar álbuns.'))
      .finally(() => setLoading(false));
  }, [artist, token]);

  function toggleAll() {
    setSelected(selected.size === albums.length ? new Set() : new Set(albums.map(a => a.id)));
  }

  function toggle(id: string) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  const totalTracks = albums.filter(a => selected.has(a.id)).reduce((sum, a) => sum + a.trackCount, 0);

  return (
    <div className="adm-modal-overlay" style={{ zIndex: 1100 }} onClick={onClose}>
      <div className="adm-modal adm-modal--artist-picker" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="adm-magic-header">
          <span className="adm-magic-title">💿 Álbuns de {artist}</span>
          <button className="adm-modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '8px 20px', borderBottom: '1px solid #313244', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#a6adc8', fontSize: 13 }}>{albums.length} álbuns encontrados</span>
          {albums.some(a => a.alreadyImported) && (
            <span style={{ color: '#6c7086', fontSize: 12 }}>· {albums.filter(a => a.alreadyImported).length} já importados</span>
          )}
          <button onClick={toggleAll} style={{ marginLeft: 'auto', background: 'none', border: '1px solid #45475a', borderRadius: 6, color: '#a6adc8', padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
            {selected.size === albums.length ? 'Desmarcar todos' : 'Selecionar todos'}
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading && <div style={{ padding: 24, textAlign: 'center', color: '#a6adc8' }}>🔍 Buscando álbuns...</div>}
          {error && <div style={{ padding: 24, textAlign: 'center', color: '#f38ba8' }}>{error}</div>}
          {!loading && !error && albums.map(a => (
            <div key={a.id} onClick={() => toggle(a.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', cursor: 'pointer', background: selected.has(a.id) ? 'rgba(124,58,237,0.15)' : 'transparent', borderBottom: '1px solid #1e1e2e', transition: 'background 0.15s', opacity: a.alreadyImported ? 0.5 : 1 }}>
              <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} onClick={e => e.stopPropagation()} style={{ accentColor: '#7c3aed', width: 16, height: 16, cursor: 'pointer' }} />
              {a.coverUrl && <img src={a.coverUrl} alt="" style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#cdd6f4', fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
                  {a.alreadyImported && <span style={{ fontSize: 10, background: 'rgba(29,185,84,0.2)', color: '#1db954', borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>✓ importado</span>}
                </div>
                <div style={{ color: '#6c7086', fontSize: 12, display: 'flex', gap: 8 }}>
                  <span>{a.releaseDate?.slice(0, 4)}</span>
                  <span style={{ color: '#a6adc8', fontWeight: 600 }}>{a.trackCount} faixas</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="adm-modal__actions" style={{ borderTop: '1px solid #313244' }}>
          <button className="adm-btn adm-magic-btn" onClick={() => onConfirm([...selected], `job-${Date.now()}`)} disabled={selected.size === 0}>
            ✨ Importar {selected.size} álbum{selected.size !== 1 ? 'ns' : ''} (~{totalTracks} faixas)
          </button>
          <button className="adm-btn adm-btn--ghost" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function MagicImportModal({ token, onClose }: { token: string; onClose: () => void }) {
  const [mode, setMode] = useState<MagicMode>('album_artist');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [trackQuery, setTrackQuery] = useState('');
  const [playlistId, setPlaylistId] = useState('');
  const [artistOnly, setArtistOnly] = useState('');
  const [showArtistPicker, setShowArtistPicker] = useState(false);
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);
  const [maxTracks, setMaxTracks] = useState(100);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [totalTracks, setTotalTracks] = useState(0);
  const [currentTrack, setCurrentTrack] = useState(0);

  const addLog = (msg: string) => setLog(l => [...l, msg]);

  async function handleArtistImport(tracks: ArtistTrack[], jobId: string) {
    setShowArtistPicker(false);
    setLoading(true); setProgress(0); setLog([]); setStatus('Iniciando...');
    try {
      const res = await fetch(`${API_URL}/admin/magic-import/artist-tracks`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Admin-Token': import.meta.env.VITE_ADMIN_SECRET ?? '' },
        credentials: 'include',
        body: JSON.stringify({ tracks, jobId }),
      });
      const data = await res.json();
      addLog(JSON.stringify(data, null, 2));
      setStatus(`✅ Concluído! ${data.imported ?? '?'} músicas importadas.`);
      setProgress(100);
    } catch (e: any) {
      setStatus(`❌ Erro: ${e.message}`); addLog(`Erro: ${e.message}`);
    } finally { setLoading(false); }
  }

  async function handleAlbumImport(albumIds: string[], jobId: string) {
    setShowAlbumPicker(false);
    setLoading(true); setProgress(0); setLog([]); setStatus('Buscando faixas dos álbuns...');
    try {
      const data = await apiFetch('/admin/magic-import/artist-albums', token, {
        method: 'POST',
        body: JSON.stringify({ artist: artistOnly, albumIds, jobId }),
      });
      addLog(JSON.stringify(data, null, 2));
      setStatus(`✅ Concluído! ${data.imported ?? '?'} músicas importadas.`);
      setProgress(100);
    } catch (e: any) {
      setStatus(`❌ Erro: ${e.message}`); addLog(`Erro: ${e.message}`);
    } finally { setLoading(false); }
  }

  async function handleImport() {
    setLoading(true); setProgress(0); setLog([]); setStatus('Iniciando...'); setTotalTracks(0); setCurrentTrack(0);
    const body: Record<string, any> = { mode, maxTracks: Math.min(maxTracks, 100) };
    if (mode === 'album_artist') { body.artist = artist; body.album = album; }
    if (mode === 'track')        { body.artist = artist; body.trackQuery = trackQuery; }
    if (mode === 'album_only')   { body.album = album; }
    if (mode === 'playlist')     { body.playlistId = playlistId; }
    try {
      const res = await fetch(`${API_URL}/admin/magic-import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n'); buf = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            try {
              const ev = JSON.parse(line.slice(5).trim());
              if (ev.totalTracks) setTotalTracks(ev.totalTracks);
              if (ev.trackIndex !== undefined) setCurrentTrack(ev.trackIndex + 1);
              if (ev.status)   setStatus(ev.status);
              if (ev.log)      addLog(ev.log);
              if (ev.progress) setProgress(ev.progress);
            } catch {}
          }
        }
        setStatus('✅ Importação concluída!'); setProgress(100);
      } else {
        const data = await res.json();
        addLog(JSON.stringify(data, null, 2));
        setStatus(`✅ Concluído! ${data.imported ?? data.count ?? '?'} músicas importadas.`);
        setProgress(100);
      }
    } catch (e: any) {
      setStatus(`❌ Erro: ${e.message}`); addLog(`Erro: ${e.message}`);
    } finally { setLoading(false); }
  }

  const modes: { id: MagicMode; label: string }[] = [
    { id: 'album_artist', label: '🎤 Artista + Álbum' },
    { id: 'track',        label: '🎵 Música (single)' },
    { id: 'album_only',   label: '💿 Álbum' },
    { id: 'playlist',     label: '🎧 Playlist Deezer' },
    { id: 'artist',       label: '🎤 Por Artista' },
    { id: 'all_albums',   label: '💿 Todos os Álbuns' },
  ];

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal adm-modal--magic" onClick={e => e.stopPropagation()}>
        <div className="adm-magic-header">
          <span className="adm-magic-title">✨ Magic Import</span>
          <button className="adm-modal-close" onClick={onClose}>✕</button>
        </div>
        <p className="adm-magic-sub">Busca no Deezer · Download via YouTube · Tags automáticas</p>
        <div className="adm-magic-tabs">
          {modes.map(m => (
            <button key={m.id} className={`adm-magic-tab${mode === m.id ? ' adm-magic-tab--active' : ''}`} onClick={() => setMode(m.id)} disabled={loading}>{m.label}</button>
          ))}
        </div>
        <div className="adm-magic-fields">
          {(mode === 'album_artist' || mode === 'track') && (
            <div className="adm-form-row"><label>Artista</label><input value={artist} onChange={e => setArtist(e.target.value)} placeholder="Ex: Linkin Park" disabled={loading} /></div>
          )}
          {(mode === 'album_artist' || mode === 'album_only') && (
            <div className="adm-form-row"><label>Álbum</label><input value={album} onChange={e => setAlbum(e.target.value)} placeholder="Ex: Meteora" disabled={loading} /></div>
          )}
          {mode === 'track' && (
            <div className="adm-form-row"><label>Nome da música</label><input value={trackQuery} onChange={e => setTrackQuery(e.target.value)} placeholder="Ex: In The End" disabled={loading} /></div>
          )}
          {mode === 'playlist' && (
            <div className="adm-form-row"><label>URL ou ID da playlist</label><input value={playlistId} onChange={e => setPlaylistId(e.target.value)} placeholder="https://www.deezer.com/playlist/..." disabled={loading} /></div>
          )}
          {mode === 'artist' && (
            <div className="adm-form-row">
              <label>Nome do artista</label>
              <input value={artistOnly} onChange={e => setArtistOnly(e.target.value)} placeholder="Ex: Eminem" disabled={loading} onKeyDown={e => e.key === 'Enter' && artistOnly.trim() && setShowArtistPicker(true)} />
              <button className="adm-btn adm-btn--primary" style={{ marginLeft: 8, padding: '6px 14px', fontSize: 13 }} onClick={() => artistOnly.trim() && setShowArtistPicker(true)} disabled={loading || !artistOnly.trim()}>Buscar</button>
            </div>
          )}
          {mode === 'all_albums' && (
            <div className="adm-form-row">
              <label>Nome do artista</label>
              <input value={artistOnly} onChange={e => setArtistOnly(e.target.value)} placeholder="Ex: Linkin Park" disabled={loading} onKeyDown={e => e.key === 'Enter' && artistOnly.trim() && setShowAlbumPicker(true)} />
              <button className="adm-btn adm-btn--primary" style={{ marginLeft: 8, padding: '6px 14px', fontSize: 13 }} onClick={() => artistOnly.trim() && setShowAlbumPicker(true)} disabled={loading || !artistOnly.trim()}>Ver Álbuns</button>
            </div>
          )}
          {mode !== 'artist' && mode !== 'all_albums' && (
            <div className="adm-form-row">
              <label>Limite máximo de faixas (máx 100)</label>
              <input type="number" value={maxTracks} min={1} max={100} onChange={e => setMaxTracks(Math.min(100, Math.max(1, Number(e.target.value))))} disabled={loading} style={{ width: 80 }} />
            </div>
          )}
        </div>
        {(loading || progress > 0) && (
          <div className="adm-magic-progress">
            <div className="adm-magic-status">
              {status}
              {totalTracks > 0 && currentTrack > 0 && (
                <span style={{ marginLeft: 12, color: '#a6adc8', fontSize: 12 }}>
                  ({currentTrack} de {totalTracks} {totalTracks === 1 ? 'música' : 'músicas'})
                </span>
              )}
            </div>
            <div className="adm-magic-bar-wrap"><div className="adm-magic-bar" style={{ width: `${progress}%` }} /></div>
          </div>
        )}
        {log.length > 0 && <pre className="adm-log">{log.join('\n')}</pre>}
        <div className="adm-modal__actions">
          {mode !== 'artist' && mode !== 'all_albums' && <button className="adm-btn adm-magic-btn" onClick={handleImport} disabled={loading}>{loading ? '⏳ Importando...' : '✨ Importar'}</button>}
          <button className="adm-btn adm-btn--ghost" onClick={onClose} disabled={loading}>Fechar</button>
        </div>
      </div>
      {showArtistPicker && (
        <ArtistPickerModal
          token={token}
          artist={artistOnly}
          onConfirm={handleArtistImport}
          onClose={() => setShowArtistPicker(false)}
        />
      )}
      {showAlbumPicker && (
        <AlbumPickerModal
          token={token}
          artist={artistOnly}
          onConfirm={handleAlbumImport}
          onClose={() => setShowAlbumPicker(false)}
        />
      )}
    </div>
  );
}

// ── Import Page ───────────────────────────────────────────────────────────────
function ImportPage({ token }: { token: string }) {
  const [url, setUrl] = useState('');
  const [maxTracks, setMaxTracks] = useState(20);
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const [showMagic, setShowMagic] = useState(false);

  async function importByUrl() {
    if (!url.trim()) return;
    setLoading(true); setLog(['Iniciando importação...']);
    try {
      const data = await apiFetch('/admin/magic-import/url', token, {
        method: 'POST',
        body: JSON.stringify({ url: url.trim(), maxTracks, jobId: `job-${Date.now()}` }),
      });
      setLog(l => [...l, JSON.stringify(data, null, 2)]);
    } catch (e: any) { setLog(l => [...l, `Erro: ${e.message}`]); }
    finally { setLoading(false); }
  }

  async function uploadSong() {
    if (!uploadFile) return;
    setUploadProgress('Enviando...');
    const form = new FormData();
    form.append('file', uploadFile); form.append('storageType', 's3');
    try {
      const tok = (token && token !== 'authenticated') ? token : (sessionStorage.getItem('_om_access') ?? token);
      const res = await fetch(`${API_URL}/admin/songs/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}`, 'X-Admin-Token': import.meta.env.VITE_ADMIN_SECRET ?? '', ...EXTRA_HEADERS },
        body: form,
      });
      const data = await res.json();
      setUploadProgress(data.song_id ? `Enviado! ID: ${data.song_id}` : JSON.stringify(data));
      setUploadFile(null);
      // Disparar evento para atualizar lista de músicas sem recarregar
      window.dispatchEvent(new CustomEvent('songUploaded', { detail: data }));
    } catch (e: any) { setUploadProgress(`Erro: ${e.message}`); }
  }

  async function enrichSpotify() { setLog(['Enriquecendo metadados com Spotify...']); const r = await apiFetch('/admin/spotify/enrich', token, { method: 'POST' }); setLog(l => [...l, JSON.stringify(r)]); }
  async function enrichCovers()  { setLog(['Enriquecendo capas...']); const r = await apiFetch('/admin/spotify/enrich-covers', token, { method: 'POST' }); setLog(l => [...l, JSON.stringify(r)]); }
  async function enrichGenres()  { setLog(['Enriquecendo gêneros...']); const r = await apiFetch('/admin/spotify/enrich-genres', token, { method: 'POST' }); setLog(l => [...l, JSON.stringify(r)]); }
  async function enrichLyrics()  { setLog(['Buscando letras...']); const r = await apiFetch('/admin/spotify/enrich-lyrics', token, { method: 'POST' }); setLog(l => [...l, JSON.stringify(r)]); }
  async function enrichVideos()  { setLog(['Buscando vídeos clipes...']); const r = await apiFetch('/admin/spotify/enrich-videos', token, { method: 'POST' }); setLog(l => [...l, JSON.stringify(r)]); }

  return (
    <div className="adm-page">
      <h1 className="adm-page__title">Importar Músicas</h1>
      <div className="adm-magic-card">
        <div className="adm-magic-card__left">
          <div className="adm-magic-card__title">✨ Magic Import</div>
          <div className="adm-magic-card__desc">Busca automática no Deezer · Download via YouTube com ISRC · Tags ID3 completas · Capa iTunes · Letras Genius</div>
        </div>
        <button className="adm-btn adm-magic-btn" onClick={() => setShowMagic(true)}>✨ Magic Import</button>
      </div>
      <div className="adm-import-grid">
        <div className="adm-card">
          <div className="adm-card__title">Importar por URL (Spotify / Deezer)</div>
          <div className="adm-form-row"><label>URL</label><input placeholder="https://open.spotify.com/album/..." value={url} onChange={e => setUrl(e.target.value)} /></div>
          <div className="adm-form-row"><label>Máx. faixas</label><input type="number" value={maxTracks} onChange={e => setMaxTracks(Number(e.target.value))} min={1} max={500} /></div>
          <button className="adm-btn adm-btn--primary" onClick={importByUrl} disabled={loading}>{loading ? 'Importando...' : 'Importar'}</button>
          {log.length > 0 && <pre className="adm-log">{log.join('\n')}</pre>}
        </div>
        <div className="adm-card">
          <div className="adm-card__title">Upload de Arquivo</div>
          <div className="adm-form-row"><label>Arquivo MP3/FLAC</label><input type="file" accept="audio/*" onChange={e => setUploadFile(e.target.files?.[0] ?? null)} /></div>
          <button className="adm-btn adm-btn--primary" onClick={uploadSong} disabled={!uploadFile}>Enviar</button>
          {uploadProgress && <div className="adm-log">{uploadProgress}</div>}
        </div>
        <div className="adm-card">
          <div className="adm-card__title">Enriquecimento de Metadados</div>
          <div className="adm-enrich-btns">
            <button className="adm-btn adm-btn--primary adm-enrich-btn" onClick={enrichSpotify}>🎵 Spotify (info completa)</button>
            <button className="adm-btn adm-btn--primary adm-enrich-btn" onClick={enrichCovers}>🖼️ Capas</button>
            <button className="adm-btn adm-btn--primary adm-enrich-btn" onClick={enrichGenres}>🎸 Gêneros</button>
            <button className="adm-btn adm-btn--primary adm-enrich-btn" onClick={enrichLyrics}>📝 Letras</button>
            <button className="adm-btn adm-btn--primary adm-enrich-btn adm-enrich-btn--video" onClick={enrichVideos}>▶ Vídeos Clipes</button>
          </div>
          {log.length > 0 && <pre className="adm-log">{log.join('\n')}</pre>}
        </div>
      </div>
      {showMagic && <MagicImportModal token={token} onClose={() => setShowMagic(false)} />}
    </div>
  );
}

// ── Activity Page ─────────────────────────────────────────────────────────────
function ActivityPage({ token }: { token: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    apiFetch('/admin/activity/users', token).then(d => setUsers(Array.isArray(d) ? d : []));
  }, [token]);

  async function openUser(u: any) {
    setSelected(u);
    setLoadingLogs(true);
    try {
      const data = await apiFetch(`/admin/activity/users/${u.id}?limit=200`, token);
      setLogs(Array.isArray(data) ? data : []);
    } finally { setLoadingLogs(false); }
  }

  const actionLabel: Record<string, string> = {
    play: '▶ Play', download: '⬇ Download', skip: '⏭ Skip',
    like: '❤ Curtiu', add_to_playlist: '➕ Playlist',
  };
  const actionColor: Record<string, string> = {
    play: '#4ade80', download: '#60a5fa', skip: '#94a3b8',
    like: '#f43f5e', add_to_playlist: '#a78bfa',
  };

  if (selected) {
    return (
      <div className="adm-page">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button className="adm-btn adm-btn--ghost" onClick={() => { setSelected(null); setLogs([]); }}>
            ← Voltar
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {selected.avatarUrl
              ? <img src={selected.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
              : <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff' }}>
                  {(selected.username ?? selected.name ?? selected.email ?? '?')[0].toUpperCase()}
                </div>
            }
            <div>
              <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: 15 }}>
                @{selected.username ?? selected.name ?? selected.email}
              </div>
              <div style={{ fontSize: 11, color: '#475569' }}>{selected.email} · {selected.totalLogs} atividade(s)</div>
            </div>
          </div>
        </div>

        <div className="adm-card adm-card--full">
          {loadingLogs
            ? <div className="adm-loading">Carregando...</div>
            : logs.length === 0
              ? <div className="adm-empty">Nenhuma atividade registrada.</div>
              : (
                <table className="adm-table">
                  <thead>
                    <tr><th>Ação</th><th>Música</th><th>Artista</th><th>Data/Hora</th></tr>
                  </thead>
                  <tbody>
                    {logs.map((log, i) => (
                      <tr key={i}>
                        <td>
                          <span style={{
                            background: `${actionColor[log.action] ?? '#94a3b8'}22`,
                            color: actionColor[log.action] ?? '#94a3b8',
                            padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                          }}>
                            {actionLabel[log.action] ?? log.action}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500 }}>{log.song?.title ?? '—'}</td>
                        <td style={{ color: '#94a3b8' }}>{log.song?.artist ?? '—'}</td>
                        <td style={{ color: '#64748b', fontSize: 12 }}>
                          {log.timestamp ? new Date(log.timestamp).toLocaleString('pt-BR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', second: '2-digit',
                          }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
          }
        </div>
      </div>
    );
  }

  return (
    <div className="adm-page">
      <h1 className="adm-page__title">Atividades <span className="adm-badge">{users.length}</span></h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {users.length === 0 && <div className="adm-empty">Nenhuma atividade registrada.</div>}
        {users.map(u => {
          const last = u.lastActivity;
          const displayName = u.username ? `@${u.username}` : (u.name ?? u.email);
          return (
            <div key={u.id} className="adm-card" style={{ cursor: 'pointer', transition: 'border-color .15s' }}
              onClick={() => openUser(u)}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#7c3aed'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = ''}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                {u.avatarUrl
                  ? <img src={u.avatarUrl} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                  : <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 16, flexShrink: 0 }}>
                      {displayName[0].toUpperCase()}
                    </div>
                }
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName}
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {u.totalLogs} atividade(s)
                </span>
                {last && (
                  <span style={{ fontSize: 11, color: '#475569' }}>
                    {new Date(last.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              {last && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8', borderTop: '1px solid #1e293b', paddingTop: 8 }}>
                  <span style={{ color: actionColor[last.action] ?? '#94a3b8' }}>{actionLabel[last.action] ?? last.action}</span>
                  {last.song?.title && <span> · {last.song.title}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Update App Page ───────────────────────────────────────────────────────────
function UpdateAppPage({ token }: { token: string }) {
  const [tab, setTab] = useState<'deploy' | 'app'>('deploy');
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');
  const [currentVersion, setCurrentVersion] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastType, setBroadcastType] = useState<'info' | 'update' | 'warning'>('update');
  const [broadcastStatus, setBroadcastStatus] = useState('');
  const adminHeaders = { Authorization: `Bearer ${token}`, 'X-Admin-Token': import.meta.env.VITE_ADMIN_SECRET ?? '' };

  useEffect(() => {
    apiFetch('/app/version', token).then(setCurrentVersion).catch(() => {});
    apiFetch('/app/history', token).then(setHistory).catch(() => {});
  }, [token]);

  async function publish() {
    if (!file) { setStatus('Selecione um arquivo APK.'); return; }
    setStatus('Enviando...');
    const form = new FormData();
    form.append('apk', file);
    if (version) form.append('version', version);
    if (notes) form.append('notes', notes);
    try {
      const res = await fetch(`${API_URL}/app/release/mobile`, {
        method: 'POST',
        headers: adminHeaders,
        credentials: 'include',
        body: form,
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(`✅ Publicado! Versão ${data.version}`);
        setCurrentVersion(data);
        setHistory(h => [data, ...h.slice(0, 19)]);
        setFile(null); setVersion(''); setNotes('');
      } else {
        setStatus(`❌ ${data.message ?? 'Erro ao publicar'}`);
      }
    } catch (e: any) { setStatus(`❌ ${e.message}`); }
  }

  async function sendBroadcast() {
    if (!broadcastMsg.trim()) { setBroadcastStatus('Digite uma mensagem.'); return; }
    setBroadcastStatus('Enviando...');
    try {
      const res = await fetch(`${API_URL}/app/broadcast`, {
        method: 'POST',
        headers: { ...adminHeaders, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: broadcastMsg.trim(), type: broadcastType }),
      });
      const data = await res.json();
      if (res.ok) { setBroadcastStatus('✅ Mensagem enviada para todos os usuários!'); setBroadcastMsg(''); }
      else setBroadcastStatus(`❌ ${data.message ?? 'Erro'}`);
    } catch (e: any) { setBroadcastStatus(`❌ ${e.message}`); }
  }

  const typeColors: Record<string, string> = { info: '#3b82f6', update: '#7c3aed', warning: '#f59e0b' };
  const typeLabels: Record<string, string> = { info: 'ℹ️ Informação', update: '🚀 Atualização', warning: '⚠️ Aviso' };

  return (
    <div className="adm-page">
      <h1 className="adm-page__title">Gerenciar Atualizações</h1>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {([['deploy', '🚀 Deploy da Plataforma'], ['app', '📱 App Mobile']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            background: tab === id ? '#4ade80' : '#1e293b',
            color: tab === id ? '#0f172a' : '#94a3b8',
            border: `1px solid ${tab === id ? '#4ade80' : '#334155'}`,
          }}>{label}</button>
        ))}
      </div>

      {/* ── Deploy da Plataforma tab ── */}
      {tab === 'deploy' && <DeployPanel token={token} />}

      {/* ── App Mobile tab ── */}
      {tab === 'app' && (<>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Versão atual */}
        <div className="adm-card">
          <div className="adm-card__title">📦 Versão Atual</div>
          {currentVersion ? (
            <>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#7c3aed', marginBottom: 8 }}>
                v{currentVersion.version}
              </div>
              <div style={{ fontSize: 12, color: '#6a6a6a', marginBottom: 8 }}>
                Publicada em: {currentVersion.releasedAt ? new Date(currentVersion.releasedAt).toLocaleString('pt-BR') : '—'}
              </div>
              <div style={{ fontSize: 13, color: '#b3b3b3', background: '#1a1a1a', borderRadius: 8, padding: '10px 12px', lineHeight: 1.6 }}>
                {currentVersion.notes || 'Sem notas de atualização.'}
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <a href={currentVersion.mobileUrl} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: '#7c3aed', textDecoration: 'none', background: 'rgba(124,58,237,0.1)', padding: '4px 10px', borderRadius: 6 }}>
                  📱 Download Mobile
                </a>
              </div>
            </>
          ) : (
            <div style={{ color: '#6a6a6a', fontSize: 13 }}>Carregando...</div>
          )}
        </div>

        {/* Histórico */}
        <div className="adm-card">
          <div className="adm-card__title">📋 Histórico de Versões</div>
          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.length === 0 && <div style={{ color: '#6a6a6a', fontSize: 13 }}>Nenhum histórico ainda.</div>}
            {history.map((h, i) => (
              <div key={i} style={{ background: '#1a1a1a', borderRadius: 8, padding: '8px 12px', borderLeft: '3px solid #7c3aed' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>v{h.version}</span>
                  <span style={{ fontSize: 11, color: '#6a6a6a' }}>{h.releasedAt ? new Date(h.releasedAt).toLocaleDateString('pt-BR') : ''}</span>
                </div>
                <div style={{ fontSize: 12, color: '#b3b3b3', marginTop: 4 }}>{h.notes}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Editar notas da versão atual */}
      <div className="adm-card" style={{ marginBottom: 20 }}>
        <div className="adm-card__title">📝 Notas de Atualização — Versão Atual</div>
        <div style={{ fontSize: 13, color: '#6a6a6a', marginBottom: 12 }}>
          Edite as notas que os usuários veem ao abrir o app. Não precisa publicar um APK novo.
        </div>
        <div className="adm-form-row">
          <label>Notas (suporta emojis e quebras de linha)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={5}
            placeholder={`Ex:\n🎉 Busca por usuários, álbuns e playlists\n⚡ Efeitos de raio para usuários Premium\n🐛 Correções de bugs e melhorias de performance`}
            style={{ fontFamily: 'monospace', fontSize: 13 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="adm-btn adm-btn--primary" onClick={async () => {
            if (!notes.trim()) { setStatus('Digite as notas.'); return; }
            setStatus('Salvando...');
            try {
              const r = await apiFetch('/app/notes', token, { method: 'POST', body: JSON.stringify({ notes, version: version || undefined }) });
              setCurrentVersion(r);
              setStatus('✅ Notas salvas!');
              setTimeout(() => setStatus(''), 3000);
            } catch (e: any) { setStatus(`❌ ${e.message}`); }
          }}>
            💾 Salvar Notas
          </button>
          {currentVersion?.notes && (
            <button className="adm-btn adm-btn--ghost" style={{ fontSize: 12 }}
              onClick={() => setNotes(currentVersion.notes)}>
              Carregar notas atuais
            </button>
          )}
        </div>
        {status && <div className="adm-log" style={{ marginTop: 10 }}>{status}</div>}
      </div>

      {/* Publicar nova versão */}
      <div className="adm-card" style={{ marginBottom: 20 }}>
        <div className="adm-card__title">🚀 Publicar Nova Versão</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="adm-form-row">
            <label>Versão (ex: 1.2.0) — deixe vazio para auto-incrementar</label>
            <input value={version} onChange={e => setVersion(e.target.value)} placeholder={`${currentVersion?.version ?? '1.0.0'} → auto`} />
          </div>
          <div className="adm-form-row">
            <label>Arquivo APK (Mobile)</label>
            <input type="file" accept=".apk" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <div className="adm-form-row">
          <label>Notas de atualização (o que há de novo)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Ex: Novo player, correção de bugs, melhorias de performance..." />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="adm-btn adm-btn--primary" onClick={publish} disabled={!file}>
            📤 Publicar APK
          </button>
          {file && <span style={{ fontSize: 12, color: '#b3b3b3' }}>📎 {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</span>}
        </div>
        {status && <div className="adm-log" style={{ marginTop: 12 }}>{status}</div>}
      </div>

      {/* Broadcast global */}
      <div className="adm-card">
        <div className="adm-card__title">📢 Mensagem Global — Todas as Plataformas</div>
        <div style={{ fontSize: 13, color: '#6a6a6a', marginBottom: 16 }}>
          Envia uma notificação em tempo real para todos os usuários conectados (web, mobile e TV).
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 12 }}>
          <div className="adm-form-row" style={{ margin: 0 }}>
            <label>Tipo de mensagem</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['info', 'update', 'warning'] as const).map(t => (
                <button key={t} onClick={() => setBroadcastType(t)} style={{
                  padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: broadcastType === t ? typeColors[t] : '#2a2a2a',
                  color: broadcastType === t ? '#fff' : '#b3b3b3',
                  border: `1px solid ${broadcastType === t ? typeColors[t] : '#3a3a3a'}`,
                }}>
                  {typeLabels[t]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="adm-form-row">
          <label>Mensagem</label>
          <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} rows={3}
            placeholder="Ex: 🎉 Nova versão 1.2.0 disponível! Avalie as novidades e nos dê seu feedback..." />
        </div>
        <button className="adm-btn adm-btn--primary" onClick={sendBroadcast} disabled={!broadcastMsg.trim()}
          style={{ background: typeColors[broadcastType] }}>
          📡 Enviar para Todos
        </button>
        {broadcastStatus && <div className="adm-log" style={{ marginTop: 12 }}>{broadcastStatus}</div>}
      </div>
      </>)}
    </div>
  );
}

// ── Settings Page ─────────────────────────────────────────────────────────────
function SettingsPage({ userEmail }: { userEmail: string }) {
  return (
    <div className="adm-page">
      <h1 className="adm-page__title">Configurações</h1>
      <div className="adm-card" style={{ maxWidth: 480 }}>
        <div className="adm-card__title">Conta Admin</div>
        <div className="adm-form-row"><label>Email</label><input value={userEmail} readOnly /></div>
        <div className="adm-card__title" style={{ marginTop: 24 }}>Segurança</div>
        <div className="adm-plan-dist__row"><span>HTTPS</span><span className="adm-badge adm-badge--green">Ativo</span></div>
        <div className="adm-plan-dist__row"><span>2FA</span><span className="adm-badge adm-badge--green">Ativo</span></div>
        <div className="adm-plan-dist__row"><span>Acesso restrito</span><span className="adm-badge adm-badge--green">Admins only</span></div>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
const DEFAULT_PROFILE: ProfileData = {
  name: '', username: '', avatarUrl: '', coverUrl: '',
  badges: ['admin'], rayColor: '#7c3aed', rayCount: 8, rayStyle: 'normal', nameColor: '#ef4444',
};

export function AdminPanel({ token: tokenProp, userEmail, onExit, onLogout }: AdminPanelProps) {
  // Resolve o JWT real — quando cross-origin (ngrok), o token prop pode ser 'authenticated'
  const token = (tokenProp && tokenProp !== 'authenticated')
    ? tokenProp
    : (sessionStorage.getItem('_om_access') ?? tokenProp);
  const [page, setPage] = useState<AdminPage>('dashboard');
  const [search, setSearch] = useState('');
  const [profile, setProfile] = useState<ProfileData>(() => {
    try { return JSON.parse(localStorage.getItem('adm_profile') ?? 'null') || DEFAULT_PROFILE; }
    catch { return DEFAULT_PROFILE; }
  });
  const [showProfile, setShowProfile] = useState(false);

  // Sincroniza avatarUrl e nome do backend ao abrir o painel
  useEffect(() => {
    apiFetch('/social/profile/me', token)
      .then((data: any) => {
        if (!data?.id) return;
        setProfile(prev => ({
          ...prev,
          name: data.name ?? prev.name,
          username: data.username ?? prev.username,
          avatarUrl: data.avatarUrl ?? prev.avatarUrl,
          coverUrl: data.coverUrl ?? prev.coverUrl,
        }));
      })
      .catch(() => {});
  }, [token]);

  async function saveProfile(p: ProfileData) {
    setProfile(p);
    localStorage.setItem('adm_profile', JSON.stringify(p));
    // Persiste flair no backend para que outros usuários vejam
    const flair = {
      enabled: true,
      beatSync: false,
      badges: p.badges,
      rayColor: p.rayColor,
      rayCount: p.rayCount,
      rayStyle: p.rayStyle,
      nameColor: p.nameColor,
    };
    try {
      await apiFetch('/social/profile', token, { method: 'POST', body: JSON.stringify({ name: p.name, username: p.username, flair }) });
    } catch { /* silently fail */ }
  }

  return (
    <div className="adm-root">
      <Sidebar page={page} setPage={setPage} onExit={onExit} onLogout={onLogout} />
      <div className="adm-main">
        <Topbar userEmail={userEmail} search={search} setSearch={setSearch} profile={profile} onOpenProfile={() => setShowProfile(true)} />
        <div className="adm-content">
          {page === 'dashboard' && <Dashboard token={token} profile={profile} />}
          {page === 'songs'     && <SongsPage token={token} search={search} />}
          {page === 'users'     && <UsersPage token={token} search={search} />}
          {page === 'import'    && <ImportPage token={token} />}
          {page === 'activity'  && <ActivityPage token={token} />}
          {page === 'update'    && <UpdateAppPage token={token} />}
          {page === 'settings'  && <SettingsPage userEmail={userEmail} />}
        </div>
      </div>
      {showProfile && <ProfileModal profile={profile} onSave={saveProfile} onClose={() => setShowProfile(false)} />}
    </div>
  );
}
