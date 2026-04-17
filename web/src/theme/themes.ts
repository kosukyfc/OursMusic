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
  premium?: boolean; // requer plano premium ou family
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
    premium: true,
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
    premium: true,
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
    premium: true,
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
    premium: true,
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
    premium: true,
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
    premium: true,
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
    premium: true,
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

export function loadSavedTheme(isPremium = false) {
  const saved = localStorage.getItem('theme') ?? 'dark';
  const theme = THEMES.find(t => t.id === saved) ?? THEMES[0];
  // Se o tema salvo é premium mas o usuário não tem plano, usa o padrão
  const resolved = (theme.premium && !isPremium) ? THEMES[0] : theme;
  applyTheme(resolved);
  return resolved;
}

/**
 * 🌙 Auto-switch theme based on time of day
 * - 19:00 to 06:00 → Dark mode
 * - 06:00 to 19:00 → Light mode (if premium)
 */
export function getAutoTheme(isPremium = false): AppTheme {
  const hour = new Date().getHours();
  const isDarkHours = hour >= 19 || hour < 6;
  
  if (isDarkHours) {
    return THEMES.find(t => t.id === 'dark') ?? THEMES[0];
  } else {
    // Light mode only available for premium
    return isPremium
      ? (THEMES.find(t => t.id === 'light') ?? THEMES[0])
      : THEMES[0];
  }
}

/**
 * 🌙 Enable auto dark mode — theme switches automatically by time
 */
export function enableAutoDarkMode(callback?: (theme: AppTheme) => void) {
  const updateTheme = () => {
    const theme = getAutoTheme(false);
    applyTheme(theme);
    callback?.(theme);
  };

  // Check every minute
  const interval = setInterval(updateTheme, 60000);
  updateTheme(); // Apply immediately

  return () => clearInterval(interval); // Cleanup function
}
