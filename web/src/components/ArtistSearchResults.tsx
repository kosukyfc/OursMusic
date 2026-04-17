import { useState } from 'react';
import { ArtistProfileModal } from './ArtistProfileModal';

interface ArtistSearchResult {
  name: string;
  coverUrl?: string;
  playCount: number;
  songCount: number;
}

interface Props {
  artists: ArtistSearchResult[];
  token?: string;
  onPlaySong: (song: any) => void;
}

export function ArtistSearchResults({ artists, token, onPlaySong }: Props) {
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);

  if (!artists || artists.length === 0) {
    return null;
  }

  return (
    <>
      <div style={styles.container}>
        <h3 style={styles.title}>🎤 Artistas</h3>
        <div style={styles.grid}>
          {artists.slice(0, 8).map((artist) => (
            <div
              key={artist.name}
              style={styles.card}
              onClick={() => setSelectedArtist(artist.name)}
            >
              <img
                src={artist.coverUrl || 'https://via.placeholder.com/150'}
                alt={artist.name}
                style={styles.cover}
              />
              <div style={styles.info}>
                <div style={styles.name}>{artist.name}</div>
                <div style={styles.meta}>
                  <div>{artist.songCount} músicas</div>
                  <div>{artist.playCount.toLocaleString()} plays</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedArtist && (
        <ArtistProfileModal
          artistName={selectedArtist}
          token={token}
          onClose={() => setSelectedArtist(null)}
          onPlaySong={onPlaySong}
        />
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: 30,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#fff',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: 20,
  },
  card: {
    backgroundColor: '#282828',
    borderRadius: 8,
    padding: 12,
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center',
  },
  cover: {
    width: '100%',
    aspectRatio: '1',
    borderRadius: 8,
    objectFit: 'cover',
    marginBottom: 12,
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  meta: {
    fontSize: 12,
    color: '#aaa',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
};
