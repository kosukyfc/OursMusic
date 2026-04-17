import { memo, useState } from 'react';

interface SimilarArtistsChainProps {
  startArtist?: string;
  onClose: () => void;
}

const ARTIST_CHAINS: Record<string, string[]> = {
  'Drake': ['The Weeknd', 'J. Cole', 'Kendrick Lamar', 'Travis Scott', 'Post Malone'],
  'The Weeknd': ['Drake', 'Dua Lipa', 'SZA', 'Metro Boomin', 'Ariana Grande'],
  'Taylor Swift': ['Billie Eilish', 'Olivia Rodrigo', 'Dua Lipa', 'Ariana Grande', 'Selena Gomez'],
  'Bad Bunny': ['J Balvin', 'Reggaeton Artists', 'Trap Latino', 'Urban Artists', 'Collaborators'],
};

export const SimilarArtistsChain = memo(function SimilarArtistsChain({ startArtist = 'Drake', onClose }: SimilarArtistsChainProps) {
  const [selectedArtist, setSelectedArtist] = useState(startArtist);
  const chainPath = [startArtist];

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', borderRadius: 16, padding: 24, maxWidth: 500, width: '90%', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <h2 style={{ color: '#fff', margin: 0, marginBottom: 16, fontSize: 20 }}>🔗 Artistas Similares</h2>

        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#b3b3b3', fontSize: 12, marginBottom: 8 }}>Caminho de Exploração:</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {chainPath.map((artist, i) => (
              <div key={i}><span style={{ color: '#1db954', fontWeight: 700 }}>{artist}</span>{i < chainPath.length - 1 && <span style={{ color: '#666', margin: '0 4px' }}>→</span>}</div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#b3b3b3', fontSize: 12, marginBottom: 8 }}>Similares a <strong>{selectedArtist}</strong>:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {(ARTIST_CHAINS[selectedArtist] || ['Artista A', 'Artista B', 'Artista C']).map(artist => (
              <button key={artist} onClick={() => setSelectedArtist(artist)} style={{ background: '#1db954', color: '#000', border: 'none', borderRadius: 8, padding: 12, fontWeight: 700, cursor: 'pointer' }}>
                {artist}
              </button>
            ))}
          </div>
        </div>

        <button onClick={onClose} style={{ width: '100%', background: '#404040', color: '#fff', border: 'none', borderRadius: 8, padding: 10, cursor: 'pointer' }}>Fechar</button>
      </div>
    </div>
  );
});
