import { memo, useState, useEffect } from 'react';

interface WrappedData {
  topArtists: Array<{ name: string; plays: number }>;
  topGenres: Array<{ name: string; plays: number }>;
  totalMinutes: number;
  topSong: { title: string; artist: string };
  uniqueArtists: number;
  adventureScore: number;
}

interface WrappedModalProps {
  data: WrappedData;
  onClose: () => void;
}

export const WrappedModal = memo(function WrappedModal({ data, onClose }: WrappedModalProps) {
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (slide < 4) setSlide(s => s + 1);
    }, 3000);
    return () => clearTimeout(timer);
  }, [slide]);

  const slides = [
    {
      title: '🎵 Seu Wrapped 2026',
      subtitle: 'Veja suas estatísticas de streaming',
      content: (
        <div style={{ fontSize: 48, fontWeight: 900, marginTop: 20 }}>
          Pronto para descobrir<br />
          <span style={{ color: '#1db954' }}>seu ano musical?</span>
        </div>
      ),
    },
    {
      title: '🎧 Minutos Ouvidos',
      subtitle: 'Você passou assim neste ano',
      content: (
        <div>
          <div style={{ fontSize: 64, fontWeight: 900, color: '#1db954', marginTop: 20 }}>
            {data.totalMinutes.toLocaleString()}
          </div>
          <div style={{ fontSize: 16, color: '#b3b3b3', marginTop: 12 }}>
            = {Math.floor(data.totalMinutes / 60)} horas de música 🎵
          </div>
        </div>
      ),
    },
    {
      title: '⭐ Artista Favorito',
      subtitle: 'Seu artista mais tocado',
      content: (
        <div>
          <div style={{ fontSize: 48, fontWeight: 900, marginTop: 20, color: '#fbbf24' }}>
            {data.topArtists[0]?.name || 'N/A'}
          </div>
          <div style={{ fontSize: 14, color: '#b3b3b3', marginTop: 12 }}>
            {data.topArtists[0]?.plays || 0} plays
          </div>
        </div>
      ),
    },
    {
      title: '🔝 Música do Ano',
      subtitle: 'Sua favorita',
      content: (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 900, marginTop: 20, color: '#1db954' }}>
            {data.topSong?.title || 'N/A'}
          </div>
          <div style={{ fontSize: 14, color: '#b3b3b3', marginTop: 8 }}>
            por {data.topSong?.artist || 'N/A'}
          </div>
        </div>
      ),
    },
    {
      title: '📊 Resumo Final',
      subtitle: 'Números que definem seu ano',
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 20 }}>
          <div style={{ background: 'rgba(29,185,84,0.1)', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1db954' }}>{data.uniqueArtists}</div>
            <div style={{ fontSize: 11, color: '#b3b3b3', marginTop: 4 }}>Artistas únicos</div>
          </div>
          <div style={{ background: 'rgba(124,58,237,0.1)', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#a78bfa' }}>
              {data.topGenres[0]?.name || 'N/A'}
            </div>
            <div style={{ fontSize: 11, color: '#b3b3b3', marginTop: 4 }}>Gênero principal</div>
          </div>
        </div>
      ),
    },
  ];

  const current = slides[slide];

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.9)',
          zIndex: 9999,
        }}
        onClick={onClose}
      />

      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'linear-gradient(135deg, #1a0a2e, #0a1a2e)',
          borderRadius: 20,
          padding: 40,
          maxWidth: 500,
          width: '90%',
          zIndex: 10000,
          textAlign: 'center',
          border: '1px solid #1db954',
          boxShadow: '0 0 60px rgba(29,185,84,0.2)',
          animation: 'fadeIn 0.3s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 14, color: '#6a6a6a', fontWeight: 700 }}>
            Slide {slide + 1} / 5
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#b3b3b3',
              fontSize: 24,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Title */}
        <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 4 }}>
          {current.title}
        </div>
        <div style={{ fontSize: 12, color: '#6a6a6a', marginBottom: 16 }}>
          {current.subtitle}
        </div>

        {/* Content */}
        {current.content}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 8, marginTop: 32, justifyContent: 'center' }}>
          {slides.map((_, i) => (
            <div
              key={i}
              onClick={() => setSlide(i)}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: i === slide ? '#1db954' : '#3a3a3a',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button
            onClick={() => setSlide(Math.max(0, slide - 1))}
            disabled={slide === 0}
            style={{
              flex: 1,
              padding: '12px',
              background: slide === 0 ? '#3a3a3a' : '#282828',
              border: 'none',
              borderRadius: 500,
              color: '#fff',
              fontWeight: 700,
              cursor: slide === 0 ? 'not-allowed' : 'pointer',
              opacity: slide === 0 ? 0.5 : 1,
            }}
          >
            ← Anterior
          </button>
          <button
            onClick={() => setSlide(Math.min(slides.length - 1, slide + 1))}
            disabled={slide === slides.length - 1}
            style={{
              flex: 1,
              padding: '12px',
              background: slide === slides.length - 1 ? '#1db954' : '#1db954',
              border: 'none',
              borderRadius: 500,
              color: '#000',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {slide === slides.length - 1 ? 'Fechar 🎉' : 'Próximo →'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -48%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>
    </>
  );
});
