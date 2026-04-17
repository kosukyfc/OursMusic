import { memo, useState } from 'react';

interface GenreExplorerProps {
  onSelectGenre: (genre: string) => void;
  onClose: () => void;
}

const GENRES = [
  { name: 'Rock', emoji: '🎸', color: '#FF6B6B', songs: 2500 },
  { name: 'Pop', emoji: '⭐', color: '#FFD700', songs: 4200 },
  { name: 'Hip-Hop', emoji: '🎤', color: '#FF9F43', songs: 3100 },
  { name: 'Jazz', emoji: '🎷', color: '#5A67D8', songs: 1800 },
  { name: 'Eletrônico', emoji: '🎛️', color: '#00B4D8', songs: 3500 },
  { name: 'Clássico', emoji: '🎻', color: '#8B5CF6', songs: 1200 },
  { name: 'Reggae', emoji: '🎵', color: '#10B981', songs: 900 },
  { name: 'Country', emoji: '🤠', color: '#F59E0B', songs: 1400 },
  { name: 'Soul', emoji: '❤️', color: '#EF4444', songs: 2100 },
  { name: 'Metal', emoji: '🤘', color: '#6B7280', songs: 2800 },
  { name: 'Samba', emoji: '💃', color: '#EC4899', songs: 1100 },
  { name: 'Flamengo', emoji: '🎭', color: '#F97316', songs: 600 },
];

export const GenreExplorer = memo(function GenreExplorer({ onSelectGenre, onClose }: GenreExplorerProps) {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(135deg, #1db954, #1aa34a)', borderRadius: 20, padding: 32, maxWidth: 700, width: '90%', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <h2 style={{ color: '#fff', margin: 0, marginBottom: 24, fontSize: 24 }}>🎧 Explorar Gêneros</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {GENRES.map(genre => (
            <button key={genre.name} onClick={() => setSelectedGenre(genre.name)} style={{ background: genre.color, border: selectedGenre === genre.name ? '4px solid #fff' : 'none', borderRadius: 12, padding: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'transform 0.2s' }} onMouseEnter={e => (e.currentTarget as any).style.transform = 'scale(1.05)'} onMouseLeave={e => (e.currentTarget as any).style.transform = 'scale(1)'}>
              <div style={{ fontSize: 28 }}>{genre.emoji}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#000' }}>{genre.name}</div>
              <div style={{ fontSize: 11, opacity: 0.8, color: '#000' }}>{genre.songs} músicas</div>
            </button>
          ))}
        </div>

        {selectedGenre && (
          <button onClick={() => { onSelectGenre(selectedGenre); onClose(); }} style={{ width: '100%', background: '#fff', color: '#1db954', border: 'none', borderRadius: 8, padding: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}>
            🎵 Ouvir {selectedGenre}
          </button>
        )}

        <button onClick={onClose} style={{ width: '100%', background: 'rgba(255,255,255,0.2)', color: '#fff', border: '2px solid #fff', borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Fechar</button>
      </div>
    </div>
  );
});
