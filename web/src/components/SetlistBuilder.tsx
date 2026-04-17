import { memo, useState } from 'react';
import { useSetlistBuilder } from '../hooks/useSetlistBuilder';

interface SetlistBuilderProps {
  onClose: () => void;
  onSelectSetlist?: (_setlist: any) => void;
}

export const SetlistBuilder = memo(function SetlistBuilder({ onClose, onSelectSetlist: _onSelectSetlist }: SetlistBuilderProps) {
  const { setlists, currentBuild, saveSetlist, addSongToCurrent, removeSongFromCurrent, deleteSetlist, loadSetlist, getTotalDuration } = useSetlistBuilder();
  const [newSetlistName, setNewSetlistName] = useState('');
  const [mode, setMode] = useState<'build' | 'browse'>('build');

  const mockSongs = [
    { id: '1', title: 'Song 1', artist: 'Artist A' },
    { id: '2', title: 'Song 2', artist: 'Artist B' },
    { id: '3', title: 'Song 3', artist: 'Artist C' },
    { id: '4', title: 'Song 4', artist: 'Artist D' },
  ];

  const handleSaveSetlist = () => {
    if (newSetlistName && currentBuild.length > 0) {
      saveSetlist(newSetlistName);
      setNewSetlistName('');
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', borderRadius: 16, padding: 24, maxWidth: 600, width: '95%', margin: '20px 0' }}>
        <h2 style={{ color: '#fff', margin: '0 0 16px 0', fontSize: 20 }}>🎵 Construtor de Setlist</h2>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setMode('build')}
            style={{
              background: mode === 'build' ? '#1db954' : '#282828',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              cursor: 'pointer',
            }}
          >
            Construir
          </button>
          <button
            onClick={() => setMode('browse')}
            style={{
              background: mode === 'browse' ? '#1db954' : '#282828',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              cursor: 'pointer',
            }}
          >
            Meus Setlists ({setlists.length})
          </button>
        </div>

        {mode === 'build' ? (
          <>
            {/* Available Songs */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#b3b3b3', fontSize: 12, marginBottom: 8 }}>Adicionar Músicas</div>
              <div style={{ display: 'grid', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                {mockSongs.map(song => (
                  <div key={song.id} style={{ background: '#282828', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{song.title}</div>
                      <div style={{ color: '#b3b3b3', fontSize: 12 }}>{song.artist}</div>
                    </div>
                    <button onClick={() => addSongToCurrent(song)} style={{ background: '#1db954', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer' }}>+</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Build */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#b3b3b3', fontSize: 12, marginBottom: 8 }}>
                Setlist Atual ({currentBuild.length} músicas, {getTotalDuration().toFixed(0)} min)
              </div>
              <div style={{ display: 'grid', gap: 8, maxHeight: 250, overflowY: 'auto', marginBottom: 12 }}>
                {currentBuild.map((song, idx) => (
                  <div key={idx} style={{ background: '#282828', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                      <div style={{ color: '#b3b3b3', fontSize: 12, minWidth: 20 }}>{idx + 1}</div>
                      <div>
                        <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{song.title}</div>
                        <div style={{ color: '#b3b3b3', fontSize: 12 }}>{song.artist}</div>
                      </div>
                    </div>
                    <button onClick={() => removeSongFromCurrent(idx)} style={{ background: '#ff4444', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
              </div>

              {currentBuild.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input
                    type="text"
                    value={newSetlistName}
                    onChange={e => setNewSetlistName(e.target.value)}
                    placeholder="Nome do setlist..."
                    style={{ flex: 1, background: '#282828', color: '#fff', border: 'none', borderRadius: 8, padding: 10, fontSize: 14 }}
                  />
                  <button onClick={handleSaveSetlist} style={{ background: '#1db954', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontWeight: 700 }}>Salvar</button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Saved Setlists */}
            <div style={{ display: 'grid', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
              {setlists.length === 0 ? (
                <div style={{ color: '#b3b3b3', textAlign: 'center', padding: 20 }}>Nenhum setlist salvo</div>
              ) : (
                setlists.map(setlist => (
                  <div key={setlist.id} style={{ background: '#282828', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                      <div>
                        <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{setlist.name}</div>
                        <div style={{ color: '#b3b3b3', fontSize: 12 }}>{setlist.songs.length} músicas • {(setlist.duration / 60).toFixed(0)} min</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => loadSetlist(setlist.id)} style={{ background: '#1db954', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>Carregar</button>
                        <button onClick={() => deleteSetlist(setlist.id)} style={{ background: '#ff4444', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>✕</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        <button onClick={onClose} style={{ width: '100%', background: '#404040', color: '#fff', border: 'none', borderRadius: 8, padding: 10, cursor: 'pointer', marginTop: 16 }}>Fechar</button>
      </div>
    </div>
  );
});
