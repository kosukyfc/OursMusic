import { memo } from 'react';
import { YearlyStats } from '../hooks/useYearlyStats';

interface YearlyStatsModalProps {
  stats: YearlyStats;
  onClose: () => void;
}

export const YearlyStatsModal = memo(function YearlyStatsModal({ stats, onClose }: YearlyStatsModalProps) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: 20, padding: 40, maxWidth: 700, width: '90%', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
        <h1 style={{ color: '#fff', textAlign: 'center', margin: 0, marginBottom: 8, fontSize: 36 }}>📊 Seu Wrapped 2026</h1>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.9)', marginBottom: 32, fontSize: 14 }}>Resumo de seu ano na música</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 8 }}>⏱️ Total de Tempo</div>
            <div style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>{stats.totalMinutes.toLocaleString()}min</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 4 }}>{Math.round(stats.totalMinutes / 60)}h média diária</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 8 }}>🎵 Músicas Tocadas</div>
            <div style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>{stats.totalSongs}</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 4 }}>{stats.totalArtists} artistas</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 8 }}>🔥 Streak de Dias</div>
            <div style={{ color: '#FFD700', fontSize: 28, fontWeight: 700 }}>{stats.streakDays} dias 🔥</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 8 }}>⏰ Horário Preferido</div>
            <div style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>{String(stats.mostActiveHour).padStart(2, '0')}:00</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 4 }}>{stats.mostActiveDay}</div>
          </div>
        </div>

        {/* TOP GENRES */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: '#fff', marginBottom: 12, fontSize: 16 }}>🎸 Seus Gêneros Favoritos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.topGenres.map((g) => (
              <div key={g.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#fff' }}>{g.name}</span>
                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>{g.percentage}%</span>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <div style={{ background: '#1db954', width: `${g.percentage}%`, height: '100%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TOP ARTISTS */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: '#fff', marginBottom: 12, fontSize: 16 }}>🌟 Seus Artistas Top</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.topArtists.map((a, i) => (
              <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 8 }}>
                <div style={{ background: '#1db954', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#000' }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 700 }}>{a.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{a.minutes}h de escuta</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={onClose} style={{ width: '100%', background: 'rgba(255,255,255,0.25)', color: '#fff', border: '2px solid #fff', borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Fechar</button>
      </div>
    </div>
  );
});
