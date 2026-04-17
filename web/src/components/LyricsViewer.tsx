// import { useState } from 'react';

interface Lyric {
  time: number;
  text: string;
}

interface LyricsViewerProps {
  songTitle: string;
  lyrics: Lyric[];
  currentTime: number; // Current playback time in ms
}

/**
 * Lyrics Viewer Component
 * Displays synchronized lyrics with highlight tracking
 */
export const LyricsViewer = ({ songTitle, lyrics, currentTime }: LyricsViewerProps) => {
  // const [scrollTo, setScrollTo] = useState(0);

  // Find current lyric index based on playback time
  const currentLyricIndex = lyrics.findIndex(
    (lyric, index) =>
      lyric.time <= currentTime &&
      (index === lyrics.length - 1 || lyrics[index + 1].time > currentTime),
  );

  return (
    <div className="lyrics-viewer">
      <h2 className="song-title">{songTitle}</h2>

      <div className="lyrics-container">
        {lyrics.length === 0 ? (
          <p className="no-lyrics">Lyrics not available for this song</p>
        ) : (
          <div className="lyrics-list">
            {lyrics.map((lyric, index) => (
              <div
                key={index}
                className={`lyric-line ${index === currentLyricIndex ? 'active' : ''}`}
                // onClick={() => setScrollTo(index)}
              >
                <span className="lyric-text">{lyric.text}</span>
                <span className="lyric-time">{formatTime(lyric.time)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export default LyricsViewer;
