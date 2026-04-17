import { memo } from 'react';

interface Song {
  id: string;
  title: string;
  artist?: string;
  duration: number;
  genre?: string;
  tempo?: number;
}

interface SmartPlaylistConfig {
  name: string;
  emoji: string;
  description: string;
  filter: (song: Song) => boolean;
  maxSongs: number;
}

/**
 * 🎵 SmartPlaylistGenerator — Creates auto-generated playlists based on music characteristics
 * 
 * Playlists:
 * - 🎧 Chill: Low energy, slow tempo, acoustic
 * - 💪 Workout: High energy, paced, intense
 * - 😴 Sleep: Very slow, ambient, relaxing tones
 * - 🎉 Party: Danceable, upbeat, high energy
 * - 🧠 Focus: Minimal vocals, instrumental, consistent
 */

export const SmartPlaylistGenerator = memo(function SmartPlaylistGenerator({ songs }: { songs: Song[] }) {
  // Lyrics analysis heuristics for energy detection based on title/artist patterns
  // This is simplified; real implementation would use audio analysis or backend tags
  const getEnergyLevel = (song: Song): number => {
    const title = (song.title || '').toLowerCase();
    const artist = (song.artist || '').toLowerCase();
    const combined = `${title} ${artist}`;

    let energy = 0.5; // default medium

    // Tempo-based (if available)
    if (song.tempo) {
      energy = Math.min(1, song.tempo / 140); // Normalize to 140 BPM = high energy
    }

    // Title-based heuristics
    const slowKeywords = ['slow', 'chill', 'ambient', 'dream', 'sleep', 'night', 'rain', 'gentle', 'soft'];
    const fastKeywords = ['pump', 'jump', 'electro', 'dance', 'hard', 'heavy', 'rock', 'metal', 'beast', 'remix', 'club'];

    const hasSlow = slowKeywords.some(k => combined.includes(k));
    const hasFast = fastKeywords.some(k => combined.includes(k));

    if (hasFast) energy = Math.min(1, energy + 0.5);
    if (hasSlow) energy = Math.max(0, energy - 0.3);

    return Math.max(0, Math.min(1, energy));
  };

  const isMainlyVocal = (song: Song): boolean => {
    const title = (song.title || '').toLowerCase();
    const instrumentalKeywords = ['instrumental', 'remix', 'version (inst', 'karaoke', 'acapella'];
    return !instrumentalKeywords.some(k => title.includes(k));
  };

  const playlists: Array<{ config: SmartPlaylistConfig; songs: Song[] }> = [
    {
      config: {
        name: '🎧 Chill',
        emoji: '🎧',
        description: 'Relaxing vibes — low energy, smooth',
        filter: song => {
          const energy = getEnergyLevel(song);
          return energy < 0.4 && song.duration > 120;
        },
        maxSongs: 30,
      },
      songs: [] as Song[],
    },
    {
      config: {
        name: '💪 Workout',
        emoji: '💪',
        description: 'High energy — get moving!',
        filter: song => {
          const energy = getEnergyLevel(song);
          return energy > 0.6 && song.duration < 300;
        },
        maxSongs: 25,
      },
      songs: [] as Song[],
    },
    {
      config: {
        name: '😴 Sleep',
        emoji: '😴',
        description: 'Slow & ambient — perfect for rest',
        filter: song => {
          const energy = getEnergyLevel(song);
          return energy < 0.2 && song.duration > 180;
        },
        maxSongs: 20,
      },
      songs: [] as Song[],
    },
    {
      config: {
        name: '🎉 Party',
        emoji: '🎉',
        description: 'Danceable & fun — high vibe',
        filter: song => {
          const energy = getEnergyLevel(song);
          const title = (song.title || '').toLowerCase();
          const isDanceable = ['dance', 'party', 'club', 'electro', 'dance-pop'].some(k => title.includes(k)) || energy > 0.7;
          return isDanceable && song.duration < 250;
        },
        maxSongs: 25,
      },
      songs: [] as Song[],
    },
    {
      config: {
        name: '🧠 Focus',
        emoji: '🧠',
        description: 'Minimal vocals — stay focused',
        filter: song => {
          const energy = getEnergyLevel(song);
          const hasLowVocal = !isMainlyVocal(song) || energy < 0.5;
          return hasLowVocal && song.duration > 180;
        },
        maxSongs: 30,
      },
      songs: [] as Song[],
    },
  ];

  // Generate playlists
  for (const playlist of playlists) {
    const filtered = songs.filter(playlist.config.filter);
    playlist.songs = filtered.sort(() => Math.random() - 0.5).slice(0, playlist.config.maxSongs);
  }

  return (
    <div style={{ padding: '20px', background: '#1a1a1a', borderRadius: 12, marginTop: 20 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#fff' }}>
        ✨ Smart Playlists — Auto-Generated
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {playlists.map(({ config, songs: playlistSongs }) => (
          <div
            key={config.name}
            style={{
              background: 'linear-gradient(135deg, rgba(29,185,84,0.1), rgba(124,58,237,0.1))',
              border: '1px solid rgba(29,185,84,0.3)',
              borderRadius: 10,
              padding: 14,
              cursor: 'default',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 24 }}>{config.emoji}</span>
              <div>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{config.name}</div>
                <div style={{ color: '#b3b3b3', fontSize: 11 }}>{playlistSongs.length} músicas</div>
              </div>
            </div>
            <div style={{ color: '#b3b3b3', fontSize: 11, lineHeight: 1.4 }}>{config.description}</div>
            {playlistSongs.length === 0 && (
              <div style={{ color: '#6a6a6a', fontSize: 10, marginTop: 8, fontStyle: 'italic' }}>
                Nenhuma música corresponde — adicione mais para gerar
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, padding: 12, background: 'rgba(124,58,237,0.1)', borderRadius: 8, color: '#b3b3b3', fontSize: 12 }}>
        💡 <strong>Dica:</strong> As playlists se atualizam automaticamente conforme você adiciona novas músicas. Cada uma possui até{' '}
        <strong>30 faixas</strong> selecionadas aleatoriamente.
      </div>
    </div>
  );
});
