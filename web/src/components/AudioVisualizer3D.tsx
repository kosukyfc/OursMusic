import { memo } from 'react';

interface AudioVisualizerProps {
  playing?: boolean;
  currentTime?: number;
  duration?: number;
}

export const AudioVisualizer3D = memo(function AudioVisualizer3D({ playing = false, currentTime = 0, duration = 0 }: AudioVisualizerProps) {
  const rotation = duration > 0 ? (currentTime / duration) * 360 : 0;
  
  return (
    <div style={{ position: 'absolute', bottom: 100, right: 20, width: 200, height: 200, perspective: '1000px', zIndex: 1000 }}>
      <canvas width={200} height={200} style={{ 
        display: 'block', 
        background: 'radial-gradient(circle, rgba(29,185,84,0.1) 0%, transparent 100%)',
        borderRadius: '50%',
        transform: `rotateZ(${rotation}deg)`
      }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#1db954', fontWeight: 700, fontSize: 14 }}>
        {playing ? '🎵' : '⏸'}
      </div>
    </div>
  );
});
