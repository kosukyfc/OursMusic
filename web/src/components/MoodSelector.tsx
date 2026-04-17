import { memo } from 'react';

interface MoodSelectorProps {
  onSelectMood: (mood: string, emoji: string) => void;
  onClose: () => void;
}

const MOODS = [
  { mood: 'happy', emoji: '😄', color: '#FFD700', label: 'Feliz' },
  { mood: 'energetic', emoji: '⚡', color: '#FF6B6B', label: 'Energizado' },
  { mood: 'chill', emoji: '😎', color: '#4ECDC4', label: 'Relax' },
  { mood: 'sad', emoji: '😢', color: '#9B59B6', label: 'Triste' },
  { mood: 'focused', emoji: '🎯', color: '#FF9F43', label: 'Focado' },
  { mood: 'romantic', emoji: '💕', color: '#FF1493', label: 'Romântico' },
  { mood: 'workout', emoji: '💪', color: '#FF4500', label: 'Treino' },
  { mood: 'sleepy', emoji: '😴', color: '#191970', label: 'Sonolento' },
];

export const MoodSelector = memo(function MoodSelector({ onSelectMood, onClose }: MoodSelectorProps) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: 20, padding: 32, maxWidth: 500, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <h2 style={{ color: '#fff', margin: 0, marginBottom: 24, textAlign: 'center', fontSize: 22 }}>Qual é seu humor? 🎵</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {MOODS.map(({ mood, emoji, color, label }) => (
            <button key={mood} onClick={() => { onSelectMood(mood, emoji); onClose(); }} style={{ background: color, border: 'none', borderRadius: 12, padding: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'transform 0.2s' }} onMouseEnter={e => (e.currentTarget as any).style.transform = 'scale(1.1)'} onMouseLeave={e => (e.currentTarget as any).style.transform = 'scale(1)'}>
              <div style={{ fontSize: 28 }}>{emoji}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#000', textAlign: 'center' }}>{label}</div>
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ width: '100%', background: 'rgba(255,255,255,0.2)', color: '#fff', border: '2px solid #fff', borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
      </div>
    </div>
  );
});
