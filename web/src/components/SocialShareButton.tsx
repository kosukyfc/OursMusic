import { memo, useState } from 'react';

interface SocialShareButtonProps {
  song: {
    id: string;
    title: string;
    artist?: string;
  };
  onCopied?: () => void;
}

export const SocialShareButton = memo(function SocialShareButton({ song, onCopied }: SocialShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}?song=${song.id}`;
  const text = `🎵 Ouvindo "${song.title}"${song.artist ? ` por ${song.artist}` : ''} em @OursMusicApp`;

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    onCopied?.();
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToWhatsApp = () => {
    const wa = `https://wa.me/?text=${encodeURIComponent(text + '\n\n' + shareUrl)}`;
    window.open(wa, '_blank');
  };

  const shareToTwitter = () => {
    const tw = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(tw, '_blank');
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        title="Compartilhar"
        style={{
          background: 'none',
          border: 'none',
          color: '#b3b3b3',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#1db954')}
        onMouseLeave={e => (e.currentTarget.style.color = '#b3b3b3')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 9.5c0 .83-.67 1.5-1.5 1.5S11 13.33 11 12.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5zm5 5.5H4V5h15v12zm-6-10l-6 7.5h5V19h2v-6.5h5L13 7z"/></svg>
      </button>

      {showMenu && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 998,
            }}
            onClick={() => setShowMenu(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 8,
              background: '#282828',
              border: '1px solid #404040',
              borderRadius: 8,
              zIndex: 999,
              minWidth: 200,
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}
          >
            {/* Copy Link */}
            <button
              onClick={copyToClipboard}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.2s',
                borderBottom: '1px solid #3a3a3a',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#3a3a3a')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {copied ? '✓ Copiado!' : '📋 Copiar link'}
            </button>

            {/* WhatsApp */}
            <button
              onClick={shareToWhatsApp}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.2s',
                borderBottom: '1px solid #3a3a3a',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#3a3a3a')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              💬 WhatsApp
            </button>

            {/* Twitter */}
            <button
              onClick={shareToTwitter}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#3a3a3a')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              𝕏 Twitter/X
            </button>
          </div>
        </>
      )}
    </div>
  );
});
