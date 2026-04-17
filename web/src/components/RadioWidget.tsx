import { memo, useState } from 'react';

interface RadioStation {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
  bpmRange: string;
}

const RADIO_STATIONS: RadioStation[] = [
  {
    id: 'chill',
    name: 'Chill Radio',
    emoji: '😌',
    description: 'Relaxe e descomprima',
    color: '#06b6d4',
    bpmRange: '90-120 BPM',
  },
  {
    id: 'workout',
    name: 'Workout Radio',
    emoji: '💪',
    description: 'Energia máxima para malhar',
    color: '#ef4444',
    bpmRange: '130-160 BPM',
  },
  {
    id: 'sleep',
    name: 'Sleep Radio',
    emoji: '😴',
    description: 'Instrumental e ambient para dormir',
    color: '#8b5cf6',
    bpmRange: '60-80 BPM',
  },
  {
    id: 'party',
    name: 'Party Radio',
    emoji: '🎉',
    description: 'Hits atuais pra dançar',
    color: '#ec4899',
    bpmRange: '120-130 BPM',
  },
  {
    id: 'focus',
    name: 'Focus Radio',
    emoji: '🎯',
    description: 'Sem palavras, puro instrumental',
    color: '#f59e0b',
    bpmRange: '110-130 BPM',
  },
  {
    id: 'discovery',
    name: 'Descoberta Semanal',
    emoji: '✨',
    description: 'Artistas novos e emergentes',
    color: '#10b981',
    bpmRange: 'Variável',
  },
  {
    id: 'artist',
    name: 'Seu Artista Favorito',
    emoji: '⭐',
    description: 'Remixos e covers do seu favorito',
    color: '#6366f1',
    bpmRange: 'Variável',
  },
];

interface RadioWidgetProps {
  onSelectStation: (stationId: string) => void;
  currentStation?: string;
}

export const RadioWidget = memo(function RadioWidget({
  onSelectStation,
  currentStation,
}: RadioWidgetProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        padding: 20,
        background: 'linear-gradient(135deg, rgba(29,185,84,0.1), rgba(124,58,237,0.1))',
        borderRadius: 12,
        marginTop: 20,
        marginBottom: 20,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
        📻 Rádio 24/7
        <span style={{ fontSize: 12, opacity: 0.7 }}>AO VIVO</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 12,
          maxHeight: expanded ? '100%' : '150px',
          overflow: 'hidden',
          transition: 'max-height 0.3s',
        }}
      >
        {RADIO_STATIONS.map((station) => (
          <div
            key={station.id}
            onClick={() => onSelectStation(station.id)}
            style={{
              background: currentStation === station.id
                ? station.color
                : `linear-gradient(135deg, ${station.color}22, ${station.color}11)`,
              border: `2px solid ${currentStation === station.id ? station.color : station.color + '44'}`,
              borderRadius: 10,
              padding: 12,
              cursor: 'pointer',
              transition: 'all 0.2s',
              transform: currentStation === station.id ? 'scale(1.05)' : 'scale(1)',
            }}
            onMouseEnter={(e) => {
              if (currentStation !== station.id) {
                (e.currentTarget as HTMLElement).style.borderColor = station.color;
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)';
              }
            }}
            onMouseLeave={(e) => {
              if (currentStation !== station.id) {
                (e.currentTarget as HTMLElement).style.borderColor = station.color + '44';
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              }
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>{station.emoji}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
              {station.name}
            </div>
            <div style={{ fontSize: 10, opacity: 0.8, color: '#fff', marginBottom: 4 }}>
              {station.description}
            </div>
            <div style={{ fontSize: 9, opacity: 0.6, color: '#fff' }}>
              {station.bpmRange}
            </div>
            {currentStation === station.id && (
              <div style={{ marginTop: 8, fontSize: 12 }}>▶️ AO VIVO</div>
            )}
          </div>
        ))}
      </div>

      {!expanded && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: '100%',
            marginTop: 12,
            padding: 8,
            background: 'rgba(29,185,84,0.3)',
            border: 'none',
            borderRadius: 8,
            color: '#1db954',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          Ver mais estações ↓
        </button>
      )}
    </div>
  );
});
