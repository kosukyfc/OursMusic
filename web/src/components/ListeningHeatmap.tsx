import { memo } from 'react';
import { useListeningHeatmap } from '../hooks/useListeningHeatmap';

interface ListeningHeatmapProps {
  onClose: () => void;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const ListeningHeatmap = memo(function ListeningHeatmap({ onClose }: ListeningHeatmapProps) {
  const { heatmapData, displayMode, setDisplayMode, getPeakListeningHour, getIntensity, getAverageTimePerDay } = useListeningHeatmap();
  const peak = getPeakListeningHour();

  const getColor = (intensity: number) => {
    if (intensity === 0) return '#282828';
    if (intensity < 0.25) return '#1db954';
    if (intensity < 0.5) return '#1ed760';
    if (intensity < 0.75) return '#82e91d';
    return '#ffff00';
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', borderRadius: 16, padding: 24, maxWidth: 900, width: '95%', margin: '24px 0' }}>
        <h2 style={{ color: '#fff', margin: '0 0 16px 0', fontSize: 20 }}>🔥 Mapa de Audição</h2>

        {peak && (
          <div style={{ background: '#282828', borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <div style={{ color: '#b3b3b3', fontSize: 12 }}>Pico de Audição</div>
            <div style={{ color: '#1db954', fontSize: 16, fontWeight: 700 }}>{peak.day} - {String(peak.hour).padStart(2, '0')}:00 ({peak.count} sessões)</div>
          </div>
        )}

        {/* Heatmap Grid */}
        <div style={{ overflowX: 'auto', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto ' + Array(24).fill('1fr').join(' '), gap: 2, minWidth: 'max-content' }}>
            {/* Hour labels */}
            <div style={{ color: 'transparent', fontSize: 10 }}>—</div>
            {HOURS.map(h => (
              <div key={h} style={{ color: '#b3b3b3', fontSize: 10, textAlign: 'center', minWidth: 30 }}>
                {String(h).padStart(2, '0')}
              </div>
            ))}

            {/* Heatmap rows */}
            {DAYS.map(day => (
              <div key={day} style={{ display: 'contents' }}>
                <div style={{ color: '#b3b3b3', fontSize: 12, fontWeight: 600, minWidth: 40, paddingRight: 8, display: 'flex', alignItems: 'center' }}>
                  {day}
                </div>
                {HOURS.map(hour => (
                  <div
                    key={`${day}-${hour}`}
                    title={`${day} ${hour}:00 - ${heatmapData[`${day}-${hour}`] || 0} plays`}
                    onClick={() => {}}
                    style={{
                      background: getColor(getIntensity(day as any, hour)),
                      borderRadius: 4,
                      minWidth: 30,
                      minHeight: 30,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 16 }}>
          {DAYS.map(day => (
            <div key={day} style={{ background: '#282828', borderRadius: 8, padding: 12 }}>
              <div style={{ color: '#b3b3b3', fontSize: 11 }}>{day}</div>
              <div style={{ color: '#1db954', fontSize: 18, fontWeight: 700 }}>{getAverageTimePerDay(day as any)}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setDisplayMode('week')} style={{ flex: 1, background: displayMode === 'week' ? '#1db954' : '#404040', color: '#fff', border: 'none', borderRadius: 8, padding: 10, cursor: 'pointer' }}>Semana</button>
          <button onClick={() => setDisplayMode('month')} style={{ flex: 1, background: displayMode === 'month' ? '#1db954' : '#404040', color: '#fff', border: 'none', borderRadius: 8, padding: 10, cursor: 'pointer' }}>Mês</button>
          <button onClick={onClose} style={{ flex: 1, background: '#404040', color: '#fff', border: 'none', borderRadius: 8, padding: 10, cursor: 'pointer' }}>Fechar</button>
        </div>
      </div>
    </div>
  );
});
