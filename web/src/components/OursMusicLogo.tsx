/**
 * OursMusicLogo — logo oficial da plataforma.
 * SVG de onda senoidal animada, usada em todas as superfícies web.
 *
 * Props:
 *   size      — altura em px (largura proporcional ~2.5x)
 *   animated  — se a onda deve animar (default true)
 *   color     — cor da onda (default #1db954)
 *   showName  — exibir "OursMusic" ao lado (default true)
 *   nameFontSize — tamanho da fonte do nome
 */

import { useRef, useEffect } from 'react';

interface Props {
  size?: number;
  animated?: boolean;
  color?: string;
  showName?: boolean;
  nameFontSize?: number;
  className?: string;
}

export function OursMusicLogo({
  size = 28,
  animated = true,
  color = '#1db954',
  showName = true,
  nameFontSize,
  className = '',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const phaseRef  = useRef(0);

  const W = size * 2.8;
  const H = size;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    function draw() {
      ctx.clearRect(0, 0, W, H);

      const amp   = H * 0.28;
      const cy    = H / 2;
      const freq  = (2 * Math.PI) / W;

      // glow pass
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth   = size * 0.12;
      ctx.lineCap     = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur  = size * 0.5;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      for (let x = 0; x <= W; x++) {
        const y = cy + amp * Math.sin(freq * x * 2.2 + phaseRef.current);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // main wave
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth   = size * 0.1;
      ctx.lineCap     = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur  = size * 0.2;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      for (let x = 0; x <= W; x++) {
        const y = cy + amp * Math.sin(freq * x * 2.2 + phaseRef.current);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      if (animated) {
        phaseRef.current += 0.06;
        rafRef.current = requestAnimationFrame(draw);
      }
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [W, H, color, animated, size]);

  const fontSize = nameFontSize ?? Math.round(size * 0.55);

  return (
    <div
      className={`oursmusic-logo ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.3, userSelect: 'none' }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', flexShrink: 0 }} />
      {showName && (
        <span style={{
          fontSize,
          fontWeight: 900,
          color: '#fff',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}>
          OursMusic
        </span>
      )}
    </div>
  );
}
