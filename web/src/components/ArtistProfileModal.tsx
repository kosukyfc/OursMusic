import { useState, useEffect } from 'react';
import { API_URL as API } from '../config';


interface ArtistProfile {
  name: string;
  totalSongs: number;
  totalPlays: number;
  totalDuration: number;
  topSongs: any[];
  albums: any[];
  genres: string[];
  isFollowing: boolean;
  followers: number;
}

interface Props {
  artistName: string;
  token?: string;
  onClose: () => void;
  onPlaySong: (song: any) => void;
}

export function ArtistProfileModal({ artistName, token, onClose, onPlaySong }: Props) {
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [tab, setTab] = useState<'topSongs' | 'albums' | 'about'>('topSongs');

  useEffect(() => {
    loadArtistProfile();
  }, [artistName]);

  const loadArtistProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/artists/profile/${encodeURIComponent(artistName)}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setIsFollowing(data.isFollowing || false);
      }
    } catch (err) {
      console.error('Error loading artist profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!token) {
      alert('Please log in to follow artists');
      return;
    }

    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const res = await fetch(`${API}/artists/${encodeURIComponent(artistName)}/follow`, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        setIsFollowing(!isFollowing);
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    }
  };

  if (loading) {
    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={styles.loading}>Carregando perfil do artista...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={styles.notFound}>
            <p>Artista não encontrado</p>
            <button onClick={onClose} style={styles.btn}>Fechar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <img
            src={profile.topSongs[0]?.coverUrl || 'https://via.placeholder.com/200'}
            alt={profile.name}
            style={styles.coverImg}
          />
          <div style={styles.headerInfo}>
            <h2 style={styles.artistName}>{profile.name}</h2>
            <div style={styles.stats}>
              <div>{profile.totalSongs} músicas</div>
              <div>{profile.totalPlays.toLocaleString()} plays</div>
              <div>{profile.followers} seguidores</div>
            </div>
            <button
              onClick={handleFollow}
              style={{
                ...styles.followBtn,
                ...(isFollowing ? styles.followingBtn : {}),
              }}
            >
              {isFollowing ? '✓ Seguindo' : '+ Seguir'}
            </button>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(tab === 'topSongs' ? styles.tabActive : {}),
            }}
            onClick={() => setTab('topSongs')}
          >
            Top Músicas
          </button>
          <button
            style={{
              ...styles.tab,
              ...(tab === 'albums' ? styles.tabActive : {}),
            }}
            onClick={() => setTab('albums')}
          >
            Álbuns
          </button>
          <button
            style={{
              ...styles.tab,
              ...(tab === 'about' ? styles.tabActive : {}),
            }}
            onClick={() => setTab('about')}
          >
            Sobre
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {tab === 'topSongs' && (
            <div style={styles.songList}>
              {profile.topSongs.slice(0, 15).map((song, i) => (
                <div
                  key={song.id}
                  style={styles.songRow}
                  onClick={() => onPlaySong(song)}
                >
                  <div style={styles.songNum}>{i + 1}</div>
                  <img src={song.coverUrl} alt={song.title} style={styles.songCover} />
                  <div style={styles.songInfo}>
                    <div style={styles.songTitle}>{song.title}</div>
                    <div style={styles.songAlbum}>{song.albumName}</div>
                  </div>
                  <div style={styles.songPlays}>{song.playCount.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'albums' && (
            <div style={styles.albumList}>
              {profile.albums.map((album) => (
                <div key={album.name} style={styles.albumCard}>
                  <img src={album.coverUrl} alt={album.name} style={styles.albumCover} />
                  <div style={styles.albumInfo}>
                    <h4 style={styles.albumName}>{album.name}</h4>
                    <p style={styles.albumSongCount}>{album.songs.length} faixas</p>
                  </div>
                  <div style={styles.albumSongs}>
                    {album.songs.slice(0, 5).map((song: any, i: number) => (
                      <div
                        key={song.id}
                        style={styles.albumSongRow}
                        onClick={() => onPlaySong(song)}
                      >
                        <span>{i + 1}. {song.title}</span>
                      </div>
                    ))}
                    {album.songs.length > 5 && (
                      <div style={styles.more}>+ {album.songs.length - 5} mais</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'about' && (
            <div style={styles.aboutSection}>
              <div style={styles.aboutItem}>
                <strong>Total de Plays:</strong>
                <span>{profile.totalPlays.toLocaleString()}</span>
              </div>
              <div style={styles.aboutItem}>
                <strong>Duração Total:</strong>
                <span>{Math.floor(profile.totalDuration / 60)} horas</span>
              </div>
              <div style={styles.aboutItem}>
                <strong>Gêneros:</strong>
                <span>{profile.genres.slice(0, 5).join(', ')}</span>
              </div>
              <div style={styles.aboutItem}>
                <strong>Álbuns:</strong>
                <span>{profile.albums.length}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    width: '90%',
    maxWidth: 800,
    maxHeight: '90vh',
    overflow: 'auto',
    color: '#fff',
  },
  header: {
    display: 'flex',
    gap: 20,
    padding: 20,
    borderBottom: '1px solid #333',
    position: 'relative',
  },
  coverImg: {
    width: 150,
    height: 150,
    borderRadius: 8,
    objectFit: 'cover',
  },
  headerInfo: {
    flex: 1,
  },
  artistName: {
    fontSize: 24,
    fontWeight: 'bold',
    margin: '0 0 10px 0',
  },
  stats: {
    display: 'flex',
    gap: 20,
    marginBottom: 15,
    fontSize: 14,
    color: '#aaa',
  },
  followBtn: {
    padding: '8px 24px',
    borderRadius: 24,
    border: '1px solid #1db954',
    backgroundColor: 'transparent',
    color: '#1db954',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: 14,
  },
  followingBtn: {
    backgroundColor: '#1db954',
    color: '#000',
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: 24,
    cursor: 'pointer',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #333',
    padding: '0 20px',
  },
  tab: {
    padding: '12px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#aaa',
    cursor: 'pointer',
    borderBottomWidth: '2px',
    borderBottomStyle: 'solid',
    borderBottomColor: 'transparent',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tabActive: {
    color: '#1db954',
    borderBottomColor: '#1db954',
  },
  content: {
    padding: 20,
  },
  songList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  songRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  songNum: {
    width: 30,
    textAlign: 'center',
    color: '#aaa',
    fontSize: 12,
  },
  songCover: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  songInfo: {
    flex: 1,
    minWidth: 0,
  },
  songTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  songAlbum: {
    fontSize: 12,
    color: '#aaa',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  songPlays: {
    color: '#aaa',
    fontSize: 12,
    width: 60,
    textAlign: 'right',
  },
  albumList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: 20,
  },
  albumCard: {
    backgroundColor: '#282828',
    borderRadius: 8,
    padding: 15,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  albumCover: {
    width: '100%',
    aspectRatio: '1',
    borderRadius: 4,
    objectFit: 'cover',
    marginBottom: 12,
  },
  albumInfo: {
    marginBottom: 12,
  },
  albumName: {
    fontSize: 14,
    fontWeight: 'bold',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  albumSongCount: {
    fontSize: 12,
    color: '#aaa',
    margin: '4px 0 0 0',
  },
  albumSongs: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  albumSongRow: {
    fontSize: 12,
    color: '#aaa',
    cursor: 'pointer',
    padding: '4px 0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    transition: 'color 0.2s',
  },
  more: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    padding: '4px 0',
  },
  aboutSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  aboutItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 14,
    padding: '8px 0',
    borderBottom: '1px solid #333',
  },
  loading: {
    padding: 40,
    textAlign: 'center',
    color: '#aaa',
  },
  notFound: {
    padding: 40,
    textAlign: 'center',
  },
  btn: {
    padding: '8px 24px',
    borderRadius: 4,
    backgroundColor: '#1db954',
    color: '#000',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginTop: 12,
  },
};
