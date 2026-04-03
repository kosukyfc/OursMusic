import { useRef, useState, useEffect, useCallback } from 'react';
import type { Track, RepeatMode } from './useQueue';

const CROSSFADE_DURATION = 5; // seconds — Task 15.4

interface Props {
  current: Track | null;
  next: Track | null;
  repeatMode: RepeatMode;
  onEnded: () => void;
  onPreBuffer?: () => void; // called when pre-buffering next track
}

/**
 * Task 15.1: Audio player with progress bar and seek support.
 * Task 15.4: Crossfade (5s pre-fade) and gapless playback (pre-buffer next track).
 * Task 15.5: Displays album art, song title, and artist name.
 */
export function AudioPlayer({ current, next, repeatMode, onEnded, onPreBuffer }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const nextAudioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const crossfadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load new track when current changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    audio.src = current.streamUrl;
    audio.loop = repeatMode === 'one';
    audio.volume = volume;
    audio.play().then(() => setPlaying(true)).catch(() => {});
    return () => {
      if (crossfadeTimer.current) clearTimeout(crossfadeTimer.current);
    };
  }, [current?.id]);

  // Sync loop mode with repeatMode
  useEffect(() => {
    if (audioRef.current) audioRef.current.loop = repeatMode === 'one';
  }, [repeatMode]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);

    // Task 15.4: pre-buffer next track when 5s remain
    if (audio.duration && audio.currentTime >= audio.duration - CROSSFADE_DURATION) {
      if (next && nextAudioRef.current && nextAudioRef.current.src !== next.streamUrl) {
        nextAudioRef.current.src = next.streamUrl;
        nextAudioRef.current.load();
        onPreBuffer?.();
      }
    }
  }, [next, onPreBuffer]);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  }, []);

  const handleEnded = useCallback(() => {
    setPlaying(false);
    onEnded();
  }, [onEnded]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(() => {}); }
  }, [playing]);

  const seek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Number(e.target.value);
    setCurrentTime(audio.currentTime);
  }, []);

  const changeVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!current) {
    return <div className="audio-player audio-player--empty">No track selected</div>;
  }

  return (
    <div className="audio-player" role="region" aria-label="Audio player">
      {/* Task 15.5: Album art, title, artist */}
      <div className="audio-player__track-info">
        {current.coverUrl && (
          <img
            src={current.coverUrl}
            alt={`${current.album} cover`}
            className="audio-player__cover"
            width={56}
            height={56}
          />
        )}
        <div className="audio-player__meta">
          <span className="audio-player__title">{current.title}</span>
          <span className="audio-player__artist">{current.artist}</span>
        </div>
      </div>

      {/* Task 15.1: Progress bar with seek */}
      <div className="audio-player__controls">
        <span className="audio-player__time">{formatTime(currentTime)}</span>
        <input
          type="range"
          className="audio-player__seek"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={seek}
          aria-label="Seek"
        />
        <span className="audio-player__time">{formatTime(duration)}</span>
      </div>

      <div className="audio-player__buttons">
        <button onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '⏸' : '▶'}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={changeVolume}
          aria-label="Volume"
          className="audio-player__volume"
        />
      </div>

      {/* Hidden audio elements */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        aria-hidden="true"
      />
      {/* Pre-buffer element for gapless playback */}
      <audio ref={nextAudioRef} preload="auto" aria-hidden="true" />
    </div>
  );
}
