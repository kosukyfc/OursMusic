import { useState, useMemo, memo } from 'react';

interface LyricsSearchProps {
  songs: any[];
  onSelectSong: (song: any) => void;
  onClose: () => void;
}

export const LyricsSearch = memo(function LyricsSearch({ songs, onSelectSong, onClose }: LyricsSearchProps) {
  const [searchLyrics, setSearchLyrics] = useState('');

  const results = useMemo(() => {
    if (!searchLyrics.trim()) return [];
    const query = searchLyrics.toLowerCase();
    return songs.filter(s => {
      const lyrics = `${s.title} ${s.artist} ${s.album || ''} ${s.lyricSnippet || ''}`.toLowerCase();
      return lyrics.includes(query);
    }).slice(0, 20);
  }, [searchLyrics, songs]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#121212', borderRadius: 16, padding: 24, maxWidth: 500, width: '90%', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <h2 style={{ color: '#fff', margin: 0, marginBottom: 16, fontSize: 20 }}>🔍 Buscar por Letras</h2>
        
        <input type="text" placeholder="Digite palavras da letra..." value={searchLyrics} onChange={e => setSearchLyrics(e.target.value)} style={{ width: '100%', background: '#282828', color: '#fff', border: '2px solid #404040', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 14 }} />

        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {results.length === 0 && searchLyrics ? (
            <div style={{ color: '#b3b3b3', textAlign: 'center', padding: 20 }}>Nenhuma música encontrada</div>
          ) : results.length === 0 ? (
            <div style={{ color: '#b3b3b3', textAlign: 'center', padding: 20 }}>Comece a digitar para buscar...</div>
          ) : (
            results.map(song => (
              <div key={song.id} onClick={() => { onSelectSong(song); onClose(); }} style={{ background: '#1db954', color: '#000', borderRadius: 8, padding: 12, marginBottom: 8, cursor: 'pointer' }}>
                <div style={{ fontWeight: 700 }}>{song.title}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{song.artist}</div>
              </div>
            ))
          )}
        </div>

        <button onClick={onClose} style={{ width: '100%', marginTop: 16, background: '#282828', color: '#fff', border: '1px solid #404040', borderRadius: 8, padding: 10, cursor: 'pointer' }}>Fechar</button>
      </div>
    </div>
  );
});
