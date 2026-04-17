import { memo } from 'react';

interface SongEnergyIndicatorProps {
  songId: string;
  title: string;
  energy?: number; // 0-1 scale
}

export const SongEnergyIndicator = memo(function SongEnergyIndicator({ songId: _, title: __, energy }: SongEnergyIndicatorProps) {
  // Simple heuristic energy calculation if not provided
  const energyScore = energy ?? 0.5;
  const energyPercent = Math.round(energyScore * 100);

  const getEnergyLabel = (score: number) => {
    if (score < 0.2) return 'Muito Chill';
    if (score < 0.4) return 'Relaxante';
    if (score < 0.6) return 'Moderado';
    if (score < 0.8) return 'Energético';
    return 'Intenso!';
  };

  const getEnergyColor = (score: number) => {
    if (score < 0.2) return '#00d4ff'; // Cyan - chill
    if (score < 0.4) return '#1db954'; // Green - relaxed
    if (score < 0.6) return '#fbbf24'; // Amber - moderate
    if (score < 0.8) return '#f97316'; // Orange - energetic
    return '#f15e6c'; // Red - intense
  };

  const color = getEnergyColor(energyScore);

  return (
    <div
      title={`Energia: ${getEnergyLabel(energyScore)} (${energyPercent}%)`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        background: `${color}20`,
        border: `1px solid ${color}40`,
        borderRadius: 6,
        fontSize: 11,
      }}
    >
      {/* Energy bar */}
      <div
        style={{
          width: 40,
          height: 3,
          background: `${color}30`,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${energyPercent}%`,
            height: '100%',
            background: color,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Label */}
      <span style={{ color, fontWeight: 600, whiteSpace: 'nowrap' }}>
        {energyPercent}%
      </span>
    </div>
  );
});
