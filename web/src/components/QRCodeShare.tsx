import { memo, useEffect, useRef } from 'react';

interface QRCodeShareProps {
  playlistName: string;
  playlistId: string;
  onClose: () => void;
}

export const QRCodeShare = memo(function QRCodeShare({ playlistName, playlistId, onClose }: QRCodeShareProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 256;
      canvas.height = 256;
      
      // Simulated QR code (simplified)
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 256, 256);
      
      ctx.fillStyle = '#000';
      for (let i = 0; i < 256; i++) {
        for (let j = 0; j < 256; j++) {
          if (Math.random() > 0.5) {
            ctx.fillRect(i, j, 1, 1);
          }
        }
      }
      
      ctx.fillStyle = '#fff';
      ctx.fillRect(10, 10, 50, 50);
      ctx.fillRect(196, 10, 50, 50);
      ctx.fillRect(10, 196, 50, 50);
      
      ctx.fillStyle = '#000';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(playlistId.substring(0, 8), 80, 128);
    }
  }, [playlistId]);

  const shareUrl = `https://oursmusic.com/playlist/${playlistId}`;

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 400, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <h2 style={{ color: '#000', margin: 0, marginBottom: 16, fontSize: 20 }}>📱 Compartilhar Playlist</h2>
        <div style={{ color: '#666', marginBottom: 20, fontSize: 14 }}>{playlistName}</div>

        <canvas ref={canvasRef} style={{ border: '3px solid #1db954', borderRadius: 12, marginBottom: 20, width: 200, height: 200 }} />

        <div style={{ background: '#f0f0f0', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#666' }}>
          {shareUrl}
        </div>

        <button onClick={() => { navigator.clipboard.writeText(shareUrl); alert('Link copiado!'); }} style={{ width: '100%', background: '#1db954', color: '#fff', border: 'none', borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>
          📋 Copiar Link
        </button>

        <button onClick={() => { if (navigator.share) navigator.share({ title: playlistName, url: shareUrl }); }} style={{ width: '100%', background: '#667eea', color: '#fff', border: 'none', borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>
          📤 Compartilhar
        </button>

        <button onClick={onClose} style={{ width: '100%', background: '#e0e0e0', color: '#000', border: 'none', borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Fechar
        </button>
      </div>
    </div>
  );
});
