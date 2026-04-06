import { useState, useRef, useEffect, useCallback } from 'react';

interface Props {
  src: string;
  aspectRatio: number; // 1 = avatar quadrado, 3 = capa wide
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

export function ImagePositioner({ src, aspectRatio, onConfirm, onCancel }: Props) {
  const isAvatar = aspectRatio === 1;
  const PREVIEW_W = 340;
  const PREVIEW_H = Math.round(PREVIEW_W / aspectRatio);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [minScale, setMinScale] = useState(1);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      const scaleX = PREVIEW_W / img.naturalWidth;
      const scaleY = PREVIEW_H / img.naturalHeight;
      const initial = Math.max(scaleX, scaleY);
      setMinScale(initial);
      setScale(initial);
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      setOffset({
        x: (PREVIEW_W - img.naturalWidth * initial) / 2,
        y: (PREVIEW_H - img.naturalHeight * initial) / 2,
      });
    };
  }, [src]);

  const clamp = useCallback((ox: number, oy: number, sc: number, iw: number, ih: number) => ({
    x: Math.min(0, Math.max(PREVIEW_W - iw * sc, ox)),
    y: Math.min(0, Math.max(PREVIEW_H - ih * sc, oy)),
  }), [PREVIEW_W, PREVIEW_H]);

  useEffect(() => {
    const onMove = (cx: number, cy: number) => {
      if (!dragging.current) return;
      const dx = cx - last.current.x;
      const dy = cy - last.current.y;
      last.current = { x: cx, y: cy };
      setOffset(o => clamp(o.x + dx, o.y + dy, scale, imgSize.w, imgSize.h));
    };
    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => onMove(e.touches[0].clientX, e.touches[0].clientY);
    const stop = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', stop);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', stop);
    };
  }, [scale, imgSize, clamp]);

  function startDrag(cx: number, cy: number) {
    dragging.current = true;
    last.current = { x: cx, y: cy };
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.04 : 0.04;
    setScale(s => {
      const next = Math.max(minScale, Math.min(4, s + delta));
      setOffset(o => clamp(o.x, o.y, next, imgSize.w, imgSize.h));
      return next;
    });
  }

  function changeScale(next: number) {
    setScale(next);
    setOffset(o => clamp(o.x, o.y, next, imgSize.w, imgSize.h));
  }

  function confirm() {
    const OUTPUT_W = isAvatar ? 400 : 1200;
    const OUTPUT_H = Math.round(OUTPUT_W / aspectRatio);
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_W;
    canvas.height = OUTPUT_H;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      const sx = -offset.x / scale;
      const sy = -offset.y / scale;
      const sw = PREVIEW_W / scale;
      const sh = PREVIEW_H / scale;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUTPUT_W, OUTPUT_H);
      canvas.toBlob(blob => { if (blob) onConfirm(blob); }, 'image/jpeg', 0.92);
    };
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>

      {/* Preview com máscara — circular para avatar, retangular para capa */}
      <div style={{ position: 'relative' }}>
        <div
          style={{
            width: PREVIEW_W,
            height: PREVIEW_H,
            borderRadius: isAvatar ? '50%' : 10,
            overflow: 'hidden',
            cursor: dragging.current ? 'grabbing' : 'grab',
            background: '#111',
            userSelect: 'none',
            position: 'relative',
            boxShadow: '0 0 0 3px #1db954',
          }}
          onMouseDown={e => { startDrag(e.clientX, e.clientY); e.preventDefault(); }}
          onTouchStart={e => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
          onWheel={onWheel}
        >
          {imgSize.w > 0 && (
            <img
              src={src}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                left: offset.x,
                top: offset.y,
                width: imgSize.w * scale,
                height: imgSize.h * scale,
                pointerEvents: 'none',
                transition: dragging.current ? 'none' : 'none',
              }}
            />
          )}
          {/* Ícone de mover */}
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{
              background: 'rgba(0,0,0,0.35)', borderRadius: '50%',
              width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white" opacity={0.8}>
                <path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Zoom */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: PREVIEW_W }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#b3b3b3"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
        <input
          type="range"
          min={minScale}
          max={Math.min(4, minScale * 4)}
          step={0.01}
          value={scale}
          onChange={e => changeScale(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#b3b3b3"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
      </div>

      <p style={{ fontSize: 11, color: '#6a6a6a', textAlign: 'center' }}>
        Arraste para reposicionar · Scroll ou slider para zoom
      </p>

      <div style={{ display: 'flex', gap: 8, width: PREVIEW_W }}>
        <button onClick={onCancel} style={{
          flex: 1, background: '#3a3a3a', color: '#fff',
          borderRadius: 500, padding: '10px 0', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
        }}>
          Cancelar
        </button>
        <button onClick={confirm} style={{
          flex: 2, background: '#1db954', color: '#000',
          borderRadius: 500, padding: '10px 0', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer',
        }}>
          ✓ Aplicar
        </button>
      </div>
    </div>
  );
}
