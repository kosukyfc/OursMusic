import { memo } from 'react';

interface DarkModeSelectorProps {
  currentTheme: string | any;
  onThemeChange: (theme: string | any) => void;
  onClose: () => void;
}

const THEMES = [
  { id: 'dark', name: 'Dark', preview: '#1a1a1a', icon: '🌙' },
  { id: 'oled', name: 'OLED Black', preview: '#000000', icon: '◼️' },
  { id: 'sepia', name: 'Sepia', preview: '#3d2817', icon: '🟤' },
  { id: 'light', name: 'Light', preview: '#f5f5f5', icon: '☀️' },
  { id: 'high-contrast', name: 'High Contrast', preview: '#000000', icon: '⚫' },
];

export const DarkModeSelector = memo(function DarkModeSelector({ currentTheme, onThemeChange, onClose }: DarkModeSelectorProps) {
  const applyTheme = (theme: string) => {
    if (theme === 'oled') {
      document.documentElement.style.setProperty('--bg-primary', '#000000');
      document.documentElement.style.setProperty('--bg-secondary', '#0a0a0a');
      document.documentElement.style.setProperty('--text-primary', '#ffffff');
    } else if (theme === 'sepia') {
      document.documentElement.style.setProperty('--bg-primary', '#3d2817');
      document.documentElement.style.setProperty('--bg-secondary', '#54381a');
      document.documentElement.style.setProperty('--text-primary', '#e8d5c4');
    } else if (theme === 'light') {
      document.documentElement.style.setProperty('--bg-primary', '#ffffff');
      document.documentElement.style.setProperty('--bg-secondary', '#f5f5f5');
      document.documentElement.style.setProperty('--text-primary', '#000000');
    } else if (theme === 'high-contrast') {
      document.documentElement.style.setProperty('--bg-primary', '#000000');
      document.documentElement.style.setProperty('--bg-secondary', '#1a1a1a');
      document.documentElement.style.setProperty('--text-primary', '#ffff00');
    }
    onThemeChange(theme);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', borderRadius: 16, padding: 32, maxWidth: 500, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <h2 style={{ color: '#fff', margin: 0, marginBottom: 24, fontSize: 20 }}>🎨 Tema Visual</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
          {THEMES.map(theme => (
            <button key={theme.id} onClick={() => { applyTheme(theme.id); }} style={{ background: currentTheme === theme.id ? 'rgba(29, 185, 84, 0.3)' : '#282828', border: currentTheme === theme.id ? '2px solid #1db954' : '2px solid transparent', borderRadius: 12, padding: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s' }}>
              <div style={{ fontSize: 24 }}>{theme.icon}</div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ color: '#fff', fontWeight: 700, marginBottom: 4 }}>{theme.name}</div>
                <div style={{ width: 40, height: 24, background: theme.preview, borderRadius: 4, border: '1px solid #404040' }} />
              </div>
              {currentTheme === theme.id && <div style={{ fontSize: 20 }}>✓</div>}
            </button>
          ))}
        </div>

        <button onClick={onClose} style={{ width: '100%', background: '#1db954', color: '#fff', border: 'none', borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Pronto
        </button>
      </div>
    </div>
  );
});
