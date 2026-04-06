export interface AppTheme {
  id: string;
  name: string;
  bgBase: string;
  bgElevated: string;
  bgHighlight: string;
  accent: string;
  accentHover: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
}

export const THEMES: AppTheme[] = [
  {
    id: 'dark',
    name: 'Escuro',
    bgBase: '#121212',
    bgElevated: '#1a1a1a',
    bgHighlight: '#2a2a2a',
    accent: '#1db954',
    accentHover: '#1ed760',
    textPrimary: '#ffffff',
    textSecondary: '#b3b3b3',
    textMuted: '#6a6a6a',
  },
  {
    id: 'light',
    name: 'Claro',
    bgBase: '#f0f0f0',
    bgElevated: '#ffffff',
    bgHighlight: '#e0e0e0',
    accent: '#1db954',
    accentHover: '#1ed760',
    textPrimary: '#121212',
    textSecondary: '#535353',
    textMuted: '#9a9a9a',
  },
  {
    id: 'red',
    name: 'Vermelho',
    bgBase: '#0d0000',
    bgElevated: '#1a0000',
    bgHighlight: '#2a0808',
    accent: '#e8115b',
    accentHover: '#ff1f6b',
    textPrimary: '#ffffff',
    textSecondary: '#ffb3b3',
    textMuted: '#884444',
  },
  {
    id: 'purple',
    name: 'Roxo',
    bgBase: '#0a0010',
    bgElevated: '#130020',
    bgHighlight: '#200035',
    accent: '#7c3aed',
    accentHover: '#8b5cf6',
    textPrimary: '#ffffff',
    textSecondary: '#c4b5fd',
    textMuted: '#6d4a9a',
  },
  {
    id: 'pink',
    name: 'Rosa',
    bgBase: '#0d0008',
    bgElevated: '#1a0012',
    bgHighlight: '#2a0020',
    accent: '#ec4899',
    accentHover: '#f472b6',
    textPrimary: '#ffffff',
    textSecondary: '#fbcfe8',
    textMuted: '#9d4a6a',
  },
  {
    id: 'neon',
    name: 'Neon',
    bgBase: '#000000',
    bgElevated: '#0a0a0a',
    bgHighlight: '#111111',
    accent: '#00ff88',
    accentHover: '#00ffaa',
    textPrimary: '#00ff88',
    textSecondary: '#00cc66',
    textMuted: '#006633',
  },
  {
    id: 'green',
    name: 'Verde',
    bgBase: '#001a0a',
    bgElevated: '#002a10',
    bgHighlight: '#003a18',
    accent: '#1db954',
    accentHover: '#1ed760',
    textPrimary: '#ffffff',
    textSecondary: '#a7f3d0',
    textMuted: '#4a8a5a',
  },
  {
    id: 'blue',
    name: 'Azul',
    bgBase: '#00080d',
    bgElevated: '#00101a',
    bgHighlight: '#001a2a',
    accent: '#3b82f6',
    accentHover: '#60a5fa',
    textPrimary: '#ffffff',
    textSecondary: '#bfdbfe',
    textMuted: '#3a5a8a',
  },
];

export function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  root.style.setProperty('--bg-base', theme.bgBase);
  root.style.setProperty('--bg-elevated', theme.bgElevated);
  root.style.setProperty('--bg-highlight', theme.bgHighlight);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--accent-hover', theme.accentHover);
  root.style.setProperty('--text-primary', theme.textPrimary);
  root.style.setProperty('--text-secondary', theme.textSecondary);
  root.style.setProperty('--text-muted', theme.textMuted);
  // Also update body background
  document.body.style.background = theme.bgBase;
  localStorage.setItem('theme', theme.id);
}

export function loadSavedTheme() {
  const saved = localStorage.getItem('theme') ?? 'dark';
  const theme = THEMES.find(t => t.id === saved) ?? THEMES[0];
  applyTheme(theme);
  return theme;
}
