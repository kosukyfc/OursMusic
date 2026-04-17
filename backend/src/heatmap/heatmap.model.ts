export class HeatmapEntry {
  id: string;
  userId: string;
  dayOfWeek: number; // 0-6
  hour: number; // 0-23
  count: number;
  createdAt: Date;
  updatedAt: Date;
}

export class HeatmapStats {
  userId: string;
  totalListenings: number;
  peakDay: number;
  peakHour: number;
  averagePerHour: number;
  heatmapGrid: number[][]; // 7x24 grid
}
