import { useEffect, useRef, memo } from 'react';

interface AudioVisualizerProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  barCount?: number;
  height?: number;
  color?: string;
}

export const AudioVisualizer = memo(function AudioVisualizer({
  audioRef,
  isPlaying,
  barCount = 32,
  height = 40,
  color = '#1db954',
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;

    // Initialize Web Audio API
    const audio = audioRef.current;
    if (!audioContextRef.current) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      const source = audioContext.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount) as any;
    }
  }, [audioRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current || !dataArrayRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!analyserRef.current || !dataArrayRef.current || !ctx) return;

      analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);

      ctx.fillStyle = '#0f0f0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / barCount;
      const barStep = Math.floor(dataArrayRef.current.length / barCount);

      for (let i = 0; i < barCount; i++) {
        const index = i * barStep;
        const value = dataArrayRef.current[index] || 0;
        const barHeight = (value / 255) * canvas.height;

        // Gradient
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, color + '99');

        ctx.fillStyle = isPlaying ? gradient : '#333';
        const x = i * barWidth;

        // Draw rounded bars
        ctx.fillRect(x + 2, canvas.height - barHeight, barWidth - 4, barHeight);

        // Draw background
        ctx.fillStyle = '#222';
        ctx.fillRect(x + 2, 0, barWidth - 4, canvas.height - barHeight);
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    if (isPlaying) {
      draw();
    } else {
      animationFrameRef.current = requestAnimationFrame(draw);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, barCount, color]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={height}
      style={{
        width: '100%',
        height,
        display: 'block',
        borderRadius: 8,
        background: '#0f0f0f',
      }}
    />
  );
});
