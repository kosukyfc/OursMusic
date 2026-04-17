import { useEffect, useRef } from 'react';

const NOTES = ['\u266A', '\u266B', '\u{1D158}', '\u{1D15C}', '\u{1D11E}', '\u{1D122}', '\u266D', '\u266E', '\u266F'];

export function AuthBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    }
    resize();
    window.addEventListener('resize', resize);

    const notes: any[] = [];
    let lastNote = 0;

    function spawnNote(now: number) {
      if (now - lastNote < 400) return;
      lastNote = now;
      const W = canvas!.width;
      const H = canvas!.height;
      const count = Math.random() < 0.35 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        notes.push({
          x: Math.random() * W, y: H + 20,
          vy: -(0.5 + Math.random() * 1.1), vx: (Math.random() - 0.5) * 0.5,
          size: 18 + Math.random() * 30, alpha: 0,
          rot: (Math.random() - 0.5) * 0.5, rotV: (Math.random() - 0.5) * 0.01,
          char: NOTES[Math.floor(Math.random() * NOTES.length)],
          hue: 245 + Math.random() * 75, life: 6000 + Math.random() * 5000, born: now,
        });
      }
    }

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      hue: number;
      trail: Array<{ x: number; y: number }>;
    }> = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.45, vy: (Math.random() - 0.5) * 0.45 - 0.12,
      size: 0.8 + Math.random() * 2.4, alpha: 0.15 + Math.random() * 0.5,
      hue: 245 + Math.random() * 65, trail: [],
    }));

    const WAVE_LAYERS = [
      { amp: 0.065, freq: 0.007, speed: 0.0007, phase: 0,   color: 'rgba(124,58,237,',  lw: 2.2 },
      { amp: 0.042, freq: 0.012, speed: 0.0012, phase: 2.1, color: 'rgba(99,102,241,',   lw: 1.5 },
      { amp: 0.026, freq: 0.020, speed: 0.0019, phase: 4.3, color: 'rgba(167,139,250,',  lw: 1.0 },
      { amp: 0.016, freq: 0.032, speed: 0.0028, phase: 1.5, color: 'rgba(56,189,248,',   lw: 0.6 },
    ];

    const BAR_COUNT = 48;
    const bars = Array.from({ length: BAR_COUNT }, (_, i) => ({
      target: 0.1 + Math.random() * 0.7, current: 0.05,
      speed: 0.025 + Math.random() * 0.045, hueOff: (i / BAR_COUNT) * 45,
    }));
    let lastBarUpdate = 0;

    function updateBars(now: number) {
      if (now - lastBarUpdate < 110 + Math.random() * 90) return;
      lastBarUpdate = now;
      const beat = Math.random() < 0.28;
      for (let i = 0; i < BAR_COUNT; i++) {
        bars[i].target = beat && i < 8 ? 0.72 + Math.random() * 0.28
          : beat && i < 28 ? 0.42 + Math.random() * 0.38
          : 0.05 + Math.random() * 0.65;
      }
    }

    function frame(now: number) {
      if (!canvas || !ctx) return;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0, 0, W * 0.6, H);
      bg.addColorStop(0, '#0d0818'); bg.addColorStop(0.4, '#0a0a14'); bg.addColorStop(1, '#060610');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      const glow = ctx.createRadialGradient(W*0.5, H*0.5, 0, W*0.5, H*0.5, W*0.55);
      glow.addColorStop(0, 'rgba(124,58,237,0.08)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

      for (let li = 0; li < WAVE_LAYERS.length; li++) {
        const lyr = WAVE_LAYERS[li];
        const baseY = H * (0.38 + li * 0.07);
        const amp = H * lyr.amp * (1 + 0.14 * Math.sin(now * 0.0004 + li));
        ctx.beginPath(); ctx.moveTo(0, baseY);
        for (let x = 0; x <= W; x += 2) {
          const y = baseY + Math.sin(x*lyr.freq + now*lyr.speed + lyr.phase)*amp
            + Math.sin(x*lyr.freq*2.5 + now*lyr.speed*1.8 + lyr.phase)*amp*0.3
            + Math.sin(x*lyr.freq*0.5 + now*lyr.speed*0.6 + lyr.phase)*amp*0.18;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
        const wf = ctx.createLinearGradient(0, baseY - amp, 0, H);
        wf.addColorStop(0, lyr.color + '0.08)'); wf.addColorStop(1, lyr.color + '0)');
        ctx.fillStyle = wf; ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, baseY);
        for (let x = 0; x <= W; x += 2) {
          const y = baseY + Math.sin(x*lyr.freq + now*lyr.speed + lyr.phase)*amp
            + Math.sin(x*lyr.freq*2.5 + now*lyr.speed*1.8 + lyr.phase)*amp*0.3
            + Math.sin(x*lyr.freq*0.5 + now*lyr.speed*0.6 + lyr.phase)*amp*0.18;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = lyr.color + (0.55 - li * 0.1) + ')';
        ctx.lineWidth = lyr.lw; ctx.shadowColor = lyr.color + '0.5)'; ctx.shadowBlur = 8;
        ctx.stroke(); ctx.shadowBlur = 0;
      }

      updateBars(now);
      const barAreaW = W * 0.74, barAreaX = W * 0.13, barBaseY = H * 0.97;
      const barSlot = barAreaW / BAR_COUNT, barW = barSlot * 0.62, maxBarH = H * 0.22;
      for (let i = 0; i < BAR_COUNT; i++) {
        const b = bars[i];
        b.current += (b.target - b.current) * b.speed;
        const bH = maxBarH * b.current, bX = barAreaX + i * barSlot + (barSlot - barW) / 2;
        const bY = barBaseY - bH, hue = 255 + b.hueOff + b.current * 35;
        const rg = ctx.createLinearGradient(0, barBaseY, 0, barBaseY + bH * 0.32);
        rg.addColorStop(0, `hsla(${hue},75%,60%,0.16)`); rg.addColorStop(1, `hsla(${hue},75%,60%,0)`);
        ctx.fillStyle = rg; ctx.beginPath(); ctx.roundRect(bX, barBaseY, barW, bH * 0.32, 2); ctx.fill();
        const bg2 = ctx.createLinearGradient(0, bY, 0, barBaseY);
        bg2.addColorStop(0, `hsla(${hue+20},85%,75%,0.95)`);
        bg2.addColorStop(0.45, `hsla(${hue},80%,58%,0.85)`);
        bg2.addColorStop(1, `hsla(${hue-10},70%,40%,0.6)`);
        ctx.fillStyle = bg2; ctx.beginPath(); ctx.roundRect(bX, bY, barW, bH, [2,2,0,0]); ctx.fill();
        ctx.fillStyle = `hsla(${hue+30},95%,88%,${0.7 + b.current * 0.3})`;
        ctx.beginPath(); ctx.roundRect(bX, bY, barW, 2.5, 1); ctx.fill();
        if (b.current > 0.58) {
          const gg = ctx.createRadialGradient(bX+barW/2, bY, 0, bX+barW/2, bY, barW*3.5);
          gg.addColorStop(0, `hsla(${hue},90%,70%,${(b.current-0.58)*0.45})`); gg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(bX+barW/2, bY, barW*3.5, 0, Math.PI*2); ctx.fill();
        }
      }

      for (const p of particles) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 12) p.trail.shift();
        for (let t = 1; t < p.trail.length; t++) {
          const ta = (t / p.trail.length) * p.alpha * 0.38;
          ctx.beginPath(); ctx.moveTo(p.trail[t-1].x, p.trail[t-1].y); ctx.lineTo(p.trail[t].x, p.trail[t].y);
          ctx.strokeStyle = `hsla(${p.hue},80%,70%,${ta})`; ctx.lineWidth = p.size * 0.45; ctx.stroke();
        }
        const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size*3.5);
        pg.addColorStop(0, `hsla(${p.hue},85%,78%,${p.alpha})`); pg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size*3.5, 0, Math.PI*2); ctx.fillStyle = pg; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx.fillStyle = `hsla(${p.hue},90%,88%,${p.alpha*1.2})`; ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) { p.x = W+10; p.trail = []; } if (p.x > W+10) { p.x = -10; p.trail = []; }
        if (p.y < -10) { p.y = H+10; p.trail = []; } if (p.y > H+10) { p.y = -10; p.trail = []; }
      }

      spawnNote(now);
      for (let i = notes.length - 1; i >= 0; i--) {
        const n = notes[i], prog = (now - n.born) / n.life;
        if (prog >= 1) { notes.splice(i, 1); continue; }
        n.alpha = (prog < 0.12 ? prog/0.12 : prog > 0.72 ? (1-prog)/0.28 : 1) * 0.6;
        n.x += n.vx; n.y += n.vy; n.rot += n.rotV;
        ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(n.rot);
        ctx.font = `${n.size}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = `hsla(${n.hue},90%,70%,${n.alpha})`; ctx.shadowBlur = 28;
        ctx.fillStyle = `hsla(${n.hue},75%,60%,${n.alpha*0.45})`; ctx.fillText(n.char, 0, 0);
        ctx.shadowBlur = 14; ctx.fillStyle = `hsla(${n.hue},82%,76%,${n.alpha*0.85})`; ctx.fillText(n.char, 0, 0);
        ctx.shadowBlur = 5; ctx.fillStyle = `hsla(${n.hue},92%,93%,${n.alpha})`; ctx.fillText(n.char, 0, 0);
        ctx.shadowBlur = 0; ctx.restore();
      }

      const vig = ctx.createRadialGradient(W/2, H/2, H*0.12, W/2, H/2, H*0.95);
      vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,8,0.82)');
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />;
}