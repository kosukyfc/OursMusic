import { memo } from 'react';

interface DanceabilityScoreProps {
  songId: string;
  title: string;
  danceability?: number; // 0-1 scale
}

export const DanceabilityScore = memo(function DanceabilityScore({
  songId: _,
  title: __,
  danceability,
}: DanceabilityScoreProps) {
  // Simple heuristic danceability calculation if not provided
  const danceScore = danceability ?? 0.5;
  const dancePercent = Math.round(danceScore * 100);

  const getDanceLabel = (score: number) => {
    if (score < 0.2) return 'Não dançável';
    if (score < 0.4) return 'Pouco dançável';
    if (score < 0.6) return 'Moderadamente dançável';
    if (score < 0.8) return 'Muito dançável';
    return 'Altamente dançável 🔥';
  };

  return (
    <div
      title={`Danceability: ${getDanceLabel(danceScore)} (${dancePercent}%)`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        background: 'rgba(250,188,5,0.1)',
        border: '1px solid rgba(250,188,5,0.3)',
        borderRadius: 6,
        fontSize: 11,
      }}
    >
      {/* Danceability dots (1-5) */}
      <div style={{ display: 'flex', gap: 3 }}>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: i < Math.ceil(danceScore * 5) ? '#fbbf24' : '#3a3a3a',
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Label */}
      <span style={{ color: '#fbbf24', fontWeight: 600, fontSize: 10 }}>
        {dancePercent > 70 ? '💃' : dancePercent > 40 ? '🎵' : '🎧'}
      </span>
    </div>
  );
});
