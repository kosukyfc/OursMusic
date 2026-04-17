import { memo } from 'react';
import { Achievement } from '../hooks/useAchievements';

interface AchievementsPanelProps {
  achievements: Achievement[];
  unlockedCount: number;
  onClose: () => void;
}

export const AchievementsPanel = memo(function AchievementsPanel({ achievements, unlockedCount, onClose }: AchievementsPanelProps) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(135deg, #1db954, #1aa34a)', borderRadius: 20, padding: 32, maxWidth: 600, width: '90%', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ color: '#fff', margin: 0, fontSize: 24 }}>🏆 Achievements</h2>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{unlockedCount}/{achievements.length}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {achievements.map((ach) => (
            <div key={ach.id} style={{ background: ach.unlocked ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 16, border: ach.unlocked ? '2px solid #fff' : '2px solid transparent' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{ach.icon}</div>
              <div style={{ color: '#fff', fontWeight: 700, marginBottom: 4 }}>{ach.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 8 }}>{ach.description}</div>
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 4, height: 6, overflow: 'hidden', marginBottom: 4 }}>
                <div style={{ background: ach.unlocked ? '#1db954' : 'rgba(255,255,255,0.5)', width: `${(ach.progress / ach.maxProgress) * 100}%`, height: '100%', transition: 'width 0.3s' }} />
              </div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>{ach.progress}/{ach.maxProgress}</div>
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{ width: '100%', marginTop: 20, background: 'rgba(255,255,255,0.2)', color: '#fff', border: '2px solid #fff', borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Fechar</button>
      </div>
    </div>
  );
});
