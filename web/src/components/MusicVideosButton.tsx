import { memo, useState } from 'react';

interface MusicVideosButtonProps {
  songId: string;
  title: string;
  artist?: string;
}

export const MusicVideosButton = memo(function MusicVideosButton({
  title,
  artist,
}: Omit<MusicVideosButtonProps, 'songId'>) {
  const [showVideo, setShowVideo] = useState(false);
  
  const videoUrl = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(
    `${title} ${artist || ''}`
  )}`;

  return (
    <>
      <button
        onClick={() => setShowVideo(true)}
        style={{
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        🎬 Vídeo
      </button>

      {showVideo && (
        <div
          onClick={() => setShowVideo(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: 1000,
              position: 'relative',
              background: '#000',
            }}
          >
            <button
              onClick={() => setShowVideo(false)}
              style={{
                position: 'absolute',
                top: -40,
                right: 0,
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: 24,
                cursor: 'pointer',
                zIndex: 10000,
              }}
            >
              ✕
            </button>
            <div style={{ aspectRatio: '16/9' }}>
              <iframe
                width="100%"
                height="100%"
                src={videoUrl}
                frameBorder="0"
                allowFullScreen
              />
            </div>
            <div style={{ padding: 16, textAlign: 'center', color: '#fff' }}>
              <p>
                {title} {artist ? `- ${artist}` : ''}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
