interface Props {
  status: 'none' | 'downloading' | 'ready';
  onClick: (e: React.MouseEvent) => void;
  size?: number;
}

export function DownloadButton({ status, onClick, size = 16 }: Props) {
  if (status === 'ready') {
    return (
      <button
        onClick={onClick}
        title="Baixado"
        style={{
          background: 'none', border: 'none', cursor: 'default',
          color: '#1db954', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 4, flexShrink: 0,
        }}
      >
        {/* Green checkmark with cloud */}
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM10 17l-3.5-3.5 1.41-1.41L10 14.17l6.09-6.09 1.41 1.41L10 17z"/>
        </svg>
      </button>
    );
  }

  if (status === 'downloading') {
    return (
      <button
        title="Baixando..."
        style={{
          background: 'none', border: 'none', cursor: 'wait',
          color: '#1db954', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 4, flexShrink: 0,
        }}
      >
        {/* Spinning circle */}
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ animation: 'spin 1s linear infinite' }}>
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      title="Baixar para ouvir offline"
      className="sp-download-btn"
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#b3b3b3', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 4, flexShrink: 0, transition: 'color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
      onMouseLeave={e => (e.currentTarget.style.color = '#b3b3b3')}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
      </svg>
    </button>
  );
}
