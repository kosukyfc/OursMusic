import { memo } from 'react';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsPanelProps {
  onClose: () => void;
}

const DEFAULT_SHORTCUTS = [
  { keys: ['space'], description: 'Play/Pause', action: () => {} },
  { keys: ['ctrl', 'k'], description: 'Search', action: () => {} },
  { keys: ['>'], description: 'Next Song', action: () => {} },
  { keys: ['<'], description: 'Previous Song', action: () => {} },
  { keys: ['m'], description: 'Mute', action: () => {} },
  { keys: ['+'], description: 'Volume Up', action: () => {} },
  { keys: ['-'], description: 'Volume Down', action: () => {} },
  { keys: ['shift', 'l'], description: 'Like Song', action: () => {} },
  { keys: ['ctrl', 'shift', 'p'], description: 'Show Playlist', action: () => {} },
  { keys: ['?'], description: 'Show Shortcuts', action: () => {} },
];

export const KeyboardShortcutsPanel = memo(function KeyboardShortcutsPanel({ onClose }: KeyboardShortcutsPanelProps) {
  const { shortcuts } = useKeyboardShortcuts(DEFAULT_SHORTCUTS);

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', borderRadius: 16, padding: 24, maxWidth: 500, width: '90%', margin: '20px 0' }}>
        <h2 style={{ color: '#fff', margin: '0 0 20px 0', fontSize: 20 }}>⌨️ Atalhos do Teclado</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {shortcuts.map((shortcut, idx) => (
            <div key={idx} style={{ background: '#282828', borderRadius: 8, padding: 12 }}>
              <div style={{ color: '#b3b3b3', fontSize: 11 }}>{shortcut.description}</div>
              <div style={{ color: '#1db954', fontSize: 14, fontWeight: 700, fontFamily: 'monospace', marginTop: 4 }}>
                {shortcut.keys.map((k, i) => (
                  <span key={i}>
                    {i > 0 && ' + '}
                    <kbd style={{ background: '#404040', padding: '2px 6px', borderRadius: 4, border: '1px solid #666' }}>{k.toUpperCase()}</kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: '#282828', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <div style={{ color: '#b3b3b3', fontSize: 12 }}>💡 Dica: Pressione <kbd style={{ background: '#404040', padding: '2px 6px', borderRadius: 4, border: '1px solid #666', fontFamily: 'monospace' }}>?</kbd> anytime para ver atalhos</div>
        </div>

        <button onClick={onClose} style={{ width: '100%', background: '#404040', color: '#fff', border: 'none', borderRadius: 8, padding: 10, cursor: 'pointer' }}>Fechar</button>
      </div>
    </div>
  );
});
