import { useState, useCallback } from 'react';

type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
type HourIndex = number; // 0-23

interface HeatmapData {
  [key: string]: number; // 'Mon-0' -> listeningCount
}

export const useListeningHeatmap = () => {
  const [heatmapData, setHeatmapData] = useState<HeatmapData>({});
  const [displayMode, setDisplayMode] = useState<'week' | 'month'>('week');

  const recordListening = useCallback((timestamp = Date.now()) => {
    const date = new Date(timestamp);
    const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][(date.getDay() + 6) % 7] as DayOfWeek;
    const hour = date.getHours();
    const key = `${day}-${hour}`;

    setHeatmapData(prev => ({
      ...prev,
      [key]: (prev[key] || 0) + 1,
    }));
  }, []);

  const getPeakListeningHour = useCallback(() => {
    if (Object.keys(heatmapData).length === 0) return null;
    const maxEntry = Object.entries(heatmapData).reduce((max, curr) =>
      curr[1] > max[1] ? curr : max
    );
    const [day, hour] = maxEntry[0].split('-');
    return { day, hour: parseInt(hour), count: maxEntry[1] };
  }, [heatmapData]);

  const getIntensity = useCallback((day: DayOfWeek, hour: HourIndex) => {
    const key = `${day}-${hour}`;
    const count = heatmapData[key] || 0;
    const maxCount = Math.max(...Object.values(heatmapData), 1);
    return Math.min(count / maxCount, 1); // 0-1 intensity
  }, [heatmapData]);

  const getAverageTimePerDay = useCallback((day: DayOfWeek) => {
    const dayKeys = Object.entries(heatmapData).filter(([k]) => k.startsWith(day));
    const total = dayKeys.reduce((sum, [, v]) => sum + v, 0);
    return total;
  }, [heatmapData]);

  return {
    heatmapData,
    recordListening,
    displayMode,
    setDisplayMode,
    getPeakListeningHour,
    getIntensity,
    getAverageTimePerDay,
  };
};
