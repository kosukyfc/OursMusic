import { useState, useEffect, useRef } from 'react';

import { API_URL as API } from '../config';

async function api(path: string, token: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(opts.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? res.statusText);
  }
  return res.json();
}

type AdminView = 'dashboard' | 'songs' | 'upload' | 'import' | 'catalog' | 'users' | 'activity' | 'release' | 'playstats';

interface Stats {
  totalSongs: number; totalUsers: number; totalPlaylists: number;
  recentActivity: number;
  planBreakdown: { plan: string; _count: { plan: number } }[];
}
interface Song { id: string; title: string; storageType: string; storagePath: string; duration: number; mimeType: string; createdAt: string; }
interface User { id: string; email: string; name?: string; plan: string; isAdmin: boolean; offlineEnabled: boolean; createdAt: string; _count: { playlists: number; favorites: number; downloads: number }; }
interface ActivityLog { id: string; action: string; timestamp: string; user: { email: string }; song?: { title: string }; }

// â”€â”€ Stat card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className="admin-stat-card" style={{ borderTop: `3px solid ${color}` }}>
      <div className="admin-stat-card__icon">{icon}</div>
      <div className="admin-stat-card__value">{value.toLocaleString()}</div>
      <div className="admin-stat-card__label">{label}</div>
    </div>
  );
}

// â”€â”€ Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Dashboard({ token }: { token: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => { api('/admin/stats', token).then(setStats).catch(() => {}); }, [token]);
  if (!stats) return <div className="admin-loading">Carregando...</div>;
  return (
    <div>
      <h2 className="admin-section-title">Dashboard</h2>
      <div className="admin-stats-grid">
        <StatCard icon="ðŸŽµ" label="MÃºsicas" value={stats.totalSongs} color="#1db954" />
        <StatCard icon="ðŸ‘¥" label="UsuÃ¡rios" value={stats.totalUsers} color="#3b82f6" />
        <StatCard icon="ðŸ“‹" label="Playlists" value={stats.totalPlaylists} color="#8b5cf6" />
        <StatCard icon="ðŸ“Š" label="Atividades" value={stats.recentActivity} color="#f59e0b" />
      </div>
      <h3 className="admin-subsection-title">DistribuiÃ§Ã£o de planos</h3>
      <div className="admin-plan-bars">
        {stats.planBreakdown.map(p => (
          <div key={p.plan} className="admin-plan-bar">
            <span className="admin-plan-bar__label">{p.plan}</span>
            <div className="admin-plan-bar__track">
              <div className="admin-plan-bar__fill" style={{
                width: `${Math.min(100, (p._count.plan / stats.totalUsers) * 100)}%`,
                background: p.plan === 'premium' ? '#1db954' : p.plan === 'family' ? '#8b5cf6' : '#6b7280',
              }} />
            </div>
            <span className="admin-plan-bar__count">{p._count.plan}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// â”€â”€ Edit Song Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function EditSongModal({ song, token, onClose, onSaved }: {
  song: Song; token: string; onClose: () => void; onSaved: (s: Song) => void;
}) {
  const [form, setForm] = useState({
    title: song.title,
    artist: (song as any).artist ?? '',
    albumName: (song as any).albumName ?? '',
    coverUrl: (song as any).coverUrl ?? '',
    duration: song.duration,
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function saveMetadata() {
    setSaving(true); setMsg('');
    try {
      const updated = await api(`/admin/songs/${song.id}`, token, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      onSaved(updated);
      setMsg('âœ… Metadados salvos.');
    } catch (e: any) { setMsg(`âŒ ${e.message}`); }
    finally { setSaving(false); }
  }

  async function uploadAudio() {
    if (!audioFile) return;
    setUploading(true); setMsg('');
    const fd = new FormData();
    fd.append('file', audioFile);
    fd.append('storageType', 's3');
    try {
      const updated = await api(`/admin/songs/${song.id}/audio`, token, { method: 'POST', body: fd });
      onSaved(updated);
      setMsg('âœ… Arquivo de Ã¡udio vinculado no Supabase!');
      setAudioFile(null);
    } catch (e: any) { setMsg(`âŒ ${e.message}`); }
    finally { setUploading(false); }
  }

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: k === 'duration' ? Number(e.target.value) : e.target.value }));

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#1e1e1e', borderRadius: 12, padding: 32, width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Editar MÃºsica</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 20, cursor: 'pointer' }}>âœ•</button>
        </div>

        {/* Cover preview */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ width: 80, height: 80, borderRadius: 8, overflow: 'hidden', background: '#2a2a2a', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
            {form.coverUrl ? <img src={form.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'ðŸŽµ'}
          </div>
          <div style={{ flex: 1 }}>
            <div className="admin-label">URL da Capa</div>
            <input className="admin-input" value={form.coverUrl} onChange={f('coverUrl')} placeholder="https://..." />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="admin-form-group">
            <label className="admin-label">TÃ­tulo</label>
            <input className="admin-input" value={form.title} onChange={f('title')} />
          </div>
          <div className="admin-form-group">
            <label className="admin-label">Artista</label>
            <input className="admin-input" value={form.artist} onChange={f('artist')} />
          </div>
          <div className="admin-form-group">
            <label className="admin-label">Ãlbum</label>
            <input className="admin-input" value={form.albumName} onChange={f('albumName')} />
          </div>
          <div className="admin-form-group">
            <label className="admin-label">DuraÃ§Ã£o (segundos)</label>
            <input className="admin-input" type="number" value={form.duration} onChange={f('duration')} />
          </div>
        </div>

        <button className="admin-btn admin-btn--primary" onClick={saveMetadata} disabled={saving}>
          {saving ? 'â³ Salvando...' : 'ðŸ’¾ Salvar Metadados'}
        </button>

        <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#d1d5db' }}>
              {(song as any).available ? 'âœ… Arquivo de Ã¡udio vinculado' : 'âš ï¸ Sem arquivo de Ã¡udio â€” mÃºsica indisponÃ­vel'}
            </span>
          </div>

          <div className="admin-label" style={{ marginBottom: 8 }}>Vincular arquivo de Ã¡udio</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
            â˜ï¸ SerÃ¡ salvo no Supabase em <code>{form.artist || 'Artista'}/{form.albumName || 'Ãlbum'}</code>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input ref={fileRef} type="file" accept="audio/*" hidden
              onChange={e => setAudioFile(e.target.files?.[0] ?? null)} />
            <button className="admin-btn admin-btn--ghost" onClick={() => fileRef.current?.click()}>
              {audioFile ? `ðŸŽµ ${audioFile.name}` : 'ðŸ“‚ Selecionar arquivo'}
            </button>
            {audioFile && (
              <button className="admin-btn admin-btn--primary" onClick={uploadAudio} disabled={uploading}
                style={{ background: '#1db954' }}>
                {uploading ? 'â³ Enviando...' : 'â¬†ï¸ Enviar e Vincular'}
              </button>
            )}
          </div>
        </div>

        {msg && <div className={`admin-msg${msg.startsWith('âŒ') ? ' admin-msg--error' : ' admin-msg--success'}`}>{msg}</div>}
      </div>
    </div>
  );
}

// â”€â”€ Songs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Songs({ token }: { token: string }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [enriching, setEnriching] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  function load(query = '') {
    setLoading(true);
    api(`/admin/songs${query ? `?q=${encodeURIComponent(query)}` : ''}`, token)
      .then(setSongs).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [token]);

  async function del(id: string, title: string) {
    if (!confirm(`Deletar "${title}"?`)) return;
    setDeleting(id);
    try {
      await api(`/admin/songs/${id}`, token, { method: 'DELETE' });
      setSongs(s => s.filter(x => x.id !== id));
      setMsg('MÃºsica deletada.');
    } catch (e: any) { setMsg(e.message); }
    finally { setDeleting(null); }
  }

  async function enrich(all = false) {
    setEnriching(true); setMsg('');
    try {
      const data = await api(`/admin/spotify/enrich${all ? '?all=true' : ''}`, token, { method: 'POST' });
      setMsg(`âœ… Metadados: ${data.enriched} enriquecidas Â· ${data.notFound} nÃ£o encontradas`);
      load(q);
    } catch (e: any) { setMsg(`âŒ ${e.message}`); }
    finally { setEnriching(false); }
  }

  async function enrichLyrics() {
    setEnriching(true); setMsg('');
    try {
      const data = await api('/admin/spotify/enrich-lyrics', token, { method: 'POST' });
      setMsg(`ðŸŽ¤ Letras: ${data.enriched} encontradas Â· ${data.notFound} nÃ£o encontradas`);
    } catch (e: any) { setMsg(`âŒ ${e.message}`); }
    finally { setEnriching(false); }
  }

  async function enrichGenres() {
    setEnriching(true); setMsg('');
    try {
      const data = await api('/admin/spotify/enrich-genres', token, { method: 'POST' });
      setMsg(`Gêneros: ${data.enriched} encontrados / ${data.notFound} não encontrados`);
      load(q);
    } catch (e: any) { setMsg(e.message); }
    finally { setEnriching(false); }
  }

  return (
    <div>
      <h2 className="admin-section-title">MÃºsicas ({songs.length})</h2>
      {msg && <div className="admin-msg">{msg}</div>}
      <div className="admin-search-row">
        <input className="admin-input" placeholder="Buscar mÃºsicas..." value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load(q)} />
        <button className="admin-btn admin-btn--primary" onClick={() => load(q)}>Buscar</button>
        <button
          className="admin-btn admin-btn--primary"
          onClick={() => enrich(false)}
          disabled={enriching}
          title="Busca metadados no Deezer/MusicBrainz para mÃºsicas sem capa/artista"
          style={{ background: '#1db954', marginLeft: 'auto' }}
        >
          {enriching ? 'â³ Buscando...' : 'ðŸŽµ Enriquecer Metadados'}
        </button>
        <button
          className="admin-btn admin-btn--ghost"
          onClick={() => enrichLyrics()}
          disabled={enriching}
          title="Busca letras sincronizadas via LRCLIB"
        >
          ðŸŽ¤ Buscar Letras
        </button>
        <button
          className="admin-btn admin-btn--ghost"
          onClick={() => enrichGenres()}
          disabled={enriching}
          title="Busca genero musical no Deezer para cada musica"
        >
          Buscar Generos
        </button>
        <button
          className="admin-btn admin-btn--ghost"
          onClick={async () => {
            setEnriching(true); setMsg('');
            try {
              const data = await api('/admin/drive/make-public', token, { method: 'POST' });
              setMsg(`âœ… ${data.updated} arquivos tornados pÃºblicos Â· ${data.errors} erros`);
            } catch (e: any) { setMsg(`âŒ ${e.message}`); }
            finally { setEnriching(false); }
          }}
          disabled={enriching}
          title="Torna todos os arquivos do Drive acessÃ­veis para streaming"
        >
          ðŸ”“ Tornar PÃºblicos
        </button>
      </div>
      {loading ? <div className="admin-loading">Carregando...</div> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>#</th><th>TÃ­tulo</th><th>Artista</th><th>Ãlbum</th><th>Storage</th><th>Tipo</th><th>DuraÃ§Ã£o</th><th style={{ textAlign: 'right' }}>â–¶ Plays</th><th>Adicionada</th><th></th></tr></thead>
            <tbody>
              {songs.map((s, i) => (
                <tr key={s.id}>
                  <td className="admin-table__muted">{i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {(s as any).coverUrl
                        ? <img src={(s as any).coverUrl} alt="" width={36} height={36} style={{ borderRadius: 4, objectFit: 'cover' }} />
                        : <div style={{ width: 36, height: 36, background: '#2a2a2a', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>ðŸŽµ</div>
                      }
                      <strong>{s.title}</strong>
                    </div>
                  </td>
                  <td className="admin-table__muted">{(s as any).artist || 'â€”'}</td>
                  <td className="admin-table__muted">{(s as any).albumName || 'â€”'}</td>
                  <td><span className={`admin-badge admin-badge--${s.storageType}`}>{s.storageType}</span></td>
                  <td className="admin-table__muted">{s.mimeType.replace('audio/', '')}</td>
                  <td className="admin-table__muted">{Math.floor(s.duration / 60)}:{String(s.duration % 60).padStart(2, '0')}</td>
                  <td style={{ textAlign: 'right' }}>
                    {(s as any).playCount > 0
                      ? <span style={{ background: '#1db954', color: '#000', borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{(s as any).playCount}</span>
                      : <span style={{ color: '#535353', fontSize: 11 }}>0</span>
                    }
                  </td>
                  <td className="admin-table__muted">{new Date(s.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td>
                    <button className="admin-btn admin-btn--ghost admin-btn--sm"
                      onClick={() => setEditingSong(s)} title="Editar">âœï¸</button>
                    <button className="admin-btn admin-btn--danger admin-btn--sm"
                      onClick={() => del(s.id, s.title)} disabled={deleting === s.id}
                      style={{ marginLeft: 4 }}>
                      {deleting === s.id ? '...' : 'ðŸ—‘'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {songs.length === 0 && <div className="admin-empty">Nenhuma mÃºsica encontrada.</div>}
        </div>
      )}

      {editingSong && (
        <EditSongModal
          song={editingSong}
          token={token}
          onClose={() => setEditingSong(null)}
          onSaved={updated => {
            setSongs(ss => ss.map(s => s.id === updated.id ? updated : s));
            setEditingSong(updated);
          }}
        />
      )}
    </div>
  );
}

// â”€â”€ Upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Upload({ token }: { token: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{ name: string; status: 'ok' | 'err' | 'dup'; msg: string }[]>([]);
  const [_progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('audio/'));
    setFiles(prev => [...prev, ...dropped]);
  }

  async function uploadOne(file: File): Promise<{ name: string; status: 'ok' | 'err' | 'dup'; msg: string }> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('storageType', 's3');
    try {
      const data = await api('/admin/songs/upload', token, { method: 'POST', body: fd });
      if (data.duplicate) {
        return { name: file.name, status: 'dup', msg: `âš ï¸ ${data.message}` };
      }
      return { name: file.name, status: 'ok', msg: data.matched_from_csv ? `ðŸ”— Vinculado ao CSV: ${data.title}` : `âœ“ ${data.title}` };
    } catch (e: any) {
      return { name: file.name, status: 'err', msg: `âœ— ${e.message}` };
    }
  }

  async function upload() {
    if (!files.length) return;
    setUploading(true);
    setResults([]);
    setProgress({ done: 0, total: files.length });

    // Upload em paralelo com concorrÃªncia mÃ¡xima de 3
    const CONCURRENCY = 3;
    const queue = [...files];
    const allResults: { name: string; status: 'ok' | 'err' | 'dup'; msg: string }[] = [];

    while (queue.length > 0) {
      const batch = queue.splice(0, CONCURRENCY);
      const batchResults = await Promise.all(batch.map(uploadOne));
      allResults.push(...batchResults);
      setResults([...allResults]);
      setProgress(p => p ? { done: p.done + batch.length, total: p.total } : null);
    }

    setUploading(false);
    setProgress(null);
    setFiles([]);
  }

  return (
    <div>
      <h2 className="admin-section-title">Upload de MÃºsicas</h2>
      <div className="admin-info-box" style={{ marginBottom: 16 }}>
        â˜ï¸ Os arquivos serÃ£o salvos no <strong>Supabase Storage</strong> organizados por <strong>Artista â†’ Ãlbum</strong>.
      </div>

      <div
        className="admin-dropzone"
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
      >
        <div className="admin-dropzone__icon">ðŸŽµ</div>
        <div className="admin-dropzone__text">Arraste arquivos de Ã¡udio aqui ou clique para selecionar</div>
        <div className="admin-dropzone__sub">MP3, FLAC, AAC, OGG â€” mÃ¡x. 500 MB por arquivo</div>
        <input ref={inputRef} type="file" accept="audio/*" multiple hidden
          onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files ?? [])])} />
      </div>

      {files.length > 0 && (
        <div className="admin-file-list">
          <div className="admin-file-list__header">
            <span>{files.length} arquivo(s) selecionado(s)</span>
            <button className="admin-btn admin-btn--ghost admin-btn--sm" onClick={() => setFiles([])}>Limpar</button>
          </div>
          {files.map((f, i) => (
            <div key={i} className="admin-file-item">
              <span className="admin-file-item__name">ðŸŽµ {f.name}</span>
              <span className="admin-file-item__size">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
              <button className="admin-btn admin-btn--ghost admin-btn--sm" onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))}>âœ•</button>
            </div>
          ))}
          <button className="admin-btn admin-btn--primary admin-btn--lg" onClick={upload} disabled={uploading}>
            {uploading ? 'â³ Enviando...' : `â¬†ï¸ Enviar ${files.length} arquivo(s) para Supabase`}
          </button>
        </div>
      )}

      {results.length > 0 && (
        <div className="admin-results">
          <h3 className="admin-subsection-title">Resultado</h3>
          {results.map((r, i) => (
            <div key={i} className={`admin-result-item admin-result-item--${r.status}`}>
              <span className="admin-result-item__name">{r.name}</span>
              <span className="admin-result-item__msg">{r.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// â”€â”€ CSV Import Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CsvImportCard({ token }: { token: string }) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: number; songs: any[] } | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadCsv() {
    if (!csvFile) return;
    setLoading(true); setResult(null); setError('');
    const fd = new FormData();
    fd.append('file', csvFile);
    try {
      const data = await api('/admin/songs/import-csv', token, { method: 'POST', body: fd });
      setResult(data);
      setCsvFile(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="admin-import-card" style={{ borderColor: '#3b82f6', border: '1px solid #3b82f6', gridColumn: '1 / -1' }}>
      <div className="admin-import-card__icon">ðŸ“„</div>
      <h3>Importar via CSV</h3>
      <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 10 }}>
        FaÃ§a upload de um arquivo <code>.csv</code> com metadados das mÃºsicas. Colunas suportadas:
        <code style={{ display: 'block', marginTop: 6, background: '#111', padding: '4px 8px', borderRadius: 4, fontSize: 11 }}>
          title, artist, album, duration, cover_url, storage_path, storage_type
        </code>
        MÃºsicas sem <code>storage_path</code> ficam marcadas como <em>em breve</em> â€” ao fazer upload do Ã¡udio com o mesmo tÃ­tulo, o sistema vincula automaticamente.
      </p>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="admin-btn admin-btn--ghost" onClick={() => inputRef.current?.click()} style={{ borderColor: '#3b82f6' }}>
          ðŸ“‚ {csvFile ? csvFile.name : 'Selecionar arquivo .csv'}
        </button>
        <input ref={inputRef} type="file" accept=".csv,text/csv" hidden
          onChange={e => { setCsvFile(e.target.files?.[0] ?? null); setResult(null); setError(''); }} />
        {csvFile && (
          <button className="admin-btn admin-btn--primary" onClick={uploadCsv} disabled={loading}
            style={{ background: '#3b82f6' }}>
            {loading ? 'â³ Importando...' : 'â¬†ï¸ Importar CSV'}
          </button>
        )}
        {csvFile && (
          <button className="admin-btn admin-btn--ghost admin-btn--sm" onClick={() => setCsvFile(null)}>âœ•</button>
        )}
      </div>

      {error && <div className="admin-msg admin-msg--error" style={{ marginTop: 10 }}>âŒ {error}</div>}

      {result && (
        <div style={{ marginTop: 12 }}>
          <div className="admin-msg admin-msg--success">
            âœ… <strong>{result.imported}</strong> importadas Â· <strong>{result.skipped}</strong> jÃ¡ existiam Â· <strong>{result.errors}</strong> erros
          </div>
          {result.songs.length > 0 && (
            <div className="admin-table-wrap" style={{ marginTop: 10, maxHeight: 240, overflowY: 'auto' }}>
              <table className="admin-table">
                <thead><tr><th>TÃ­tulo</th><th>Artista</th><th>Status</th></tr></thead>
                <tbody>
                  {result.songs.map((s: any, i: number) => (
                    <tr key={i}>
                      <td><strong>{s.title}</strong></td>
                      <td className="admin-table__muted">{s.artist || 'â€”'}</td>
                      <td><span style={{ fontSize: 11, color: s.status.includes('error') ? '#ef4444' : s.status.includes('skipped') ? '#f59e0b' : '#1db954' }}>{s.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Magic Import Modal ────────────────────────────────────────────────────────
function MagicImportModal({ token, onClose }: { token: string; onClose: () => void }) {
  const [mode, setMode] = useState<'album' | 'url' | 'pending'>('album');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [maxTracks, setMaxTracks] = useState(20);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: number; tracks: any[]; importType?: string } | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<{ percent: number; track: string; status: string } | null>(null);

  async function run() {
    if (mode === 'album' && (!artist.trim() || !album.trim())) return;
    if (mode === 'url' && !spotifyUrl.trim()) return;
    const jobId = `job-${Date.now()}`;
    setLoading(true); setResult(null); setError(''); setProgress(null);
    const evtSource = new EventSource(`${API}/events/magic-import/${jobId}`);
    evtSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.done) { evtSource.close(); return; }
      setProgress({ percent: data.percent, track: data.track, status: data.status });
    };
    evtSource.onerror = () => evtSource.close();
    try {
      const endpoint = mode === 'url' ? '/admin/magic-import/url'
        : mode === 'pending' ? '/admin/magic-import/pending'
        : '/admin/magic-import';
      const body = mode === 'url' ? { url: spotifyUrl.trim(), maxTracks, jobId }
        : mode === 'pending' ? { jobId }
        : { artist: artist.trim(), album: album.trim(), maxTracks, jobId };
      const data = await api(endpoint, token, { method: 'POST', body: JSON.stringify(body) });
      setResult(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); setProgress(null); evtSource.close(); }
  }

  const canRun = mode === 'pending' ? true : mode === 'url' ? !!spotifyUrl.trim() : (!!artist.trim() && !!album.trim());

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400 }}
      onClick={e => !loading && e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 32, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', border: '1px solid #7c3aed', display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: 0 }}>Magic Import</h3>
            <p style={{ color: '#9ca3af', fontSize: 13, margin: '4px 0 0' }}>Busca metadados, baixa do YouTube e envia para o <strong>Supabase Storage</strong>.</p>
          </div>
          {!loading && <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 22, cursor: 'pointer' }}>x</button>}
        </div>

        <div style={{ display: 'flex', gap: 4, background: '#111', borderRadius: 8, padding: 4 }}>
          <button onClick={() => setMode('album')} style={{ flex: 1, padding: '8px 4px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: mode === 'album' ? '#7c3aed' : 'transparent', color: mode === 'album' ? '#fff' : '#9ca3af' }}>Artista + Album</button>
          <button onClick={() => setMode('url')} style={{ flex: 1, padding: '8px 4px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: mode === 'url' ? '#1db954' : 'transparent', color: mode === 'url' ? '#fff' : '#9ca3af' }}>Link do Spotify</button>
          <button onClick={() => setMode('pending')} style={{ flex: 1, padding: '8px 4px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: mode === 'pending' ? '#f59e0b' : 'transparent', color: mode === 'pending' ? '#000' : '#9ca3af' }}>Em Breve</button>
        </div>

        {!result && (
          <>
            {mode === 'album' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="admin-form-group">
                  <label className="admin-label">Artista</label>
                  <input className="admin-input" placeholder="Ex: Eminem" value={artist} onChange={e => setArtist(e.target.value)} disabled={loading} />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Album</label>
                  <input className="admin-input" placeholder="Ex: The Marshall Mathers LP" value={album} onChange={e => setAlbum(e.target.value)} disabled={loading} onKeyDown={e => e.key === 'Enter' && run()} />
                </div>
              </div>
            )}
            {mode === 'url' && (
              <div className="admin-form-group">
                <label className="admin-label">Link do Spotify</label>
                <input className="admin-input" placeholder="https://open.spotify.com/album/..." value={spotifyUrl} onChange={e => setSpotifyUrl(e.target.value)} disabled={loading} onKeyDown={e => e.key === 'Enter' && run()} />
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>Suporta: faixa, album, playlist, artista do Spotify e Deezer</div>
              </div>
            )}
            {mode === 'pending' && (
              <div style={{ background: '#111', borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 14, color: '#fff', fontWeight: 700, marginBottom: 8 }}>Importar faixas Em Breve</div>
                <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.5 }}>
                  Busca todas as musicas marcadas como <strong style={{ color: '#f59e0b' }}>Em Breve</strong> e tenta baixar o audio automaticamente.
                  Agrupa por album quando possivel para importar de uma vez.
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>Pode demorar bastante dependendo da quantidade de faixas pendentes.</div>
              </div>
            )}
            {mode !== 'pending' && (
              <div className="admin-form-group">
                <label className="admin-label">Limite de faixas</label>
                <select className="admin-select" value={maxTracks} onChange={e => setMaxTracks(Number(e.target.value))} disabled={loading} style={{ width: 120, padding: '10px 8px' }}>
                  {[5, 10, 15, 20, 30, 50].map(n => <option key={n} value={n}>{n} faixas</option>)}
                </select>
              </div>
            )}
            {loading && (
              <div style={{ background: '#111', borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 13, color: '#c4b5fd', marginBottom: 8 }}>
                  {progress ? `${progress.status === 'downloading' ? 'Baixando' : 'Enviando'}: ${progress.track}` : 'Buscando...'}
                </div>
                <div style={{ height: 10, background: '#2a2a2a', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 5, background: mode === 'pending' ? 'linear-gradient(90deg,#f59e0b,#fcd34d)' : 'linear-gradient(90deg,#7c3aed,#a78bfa)', width: progress ? `${progress.percent}%` : '100%', transition: 'width 0.4s ease', animation: progress ? 'none' : 'pulse 1.5s ease-in-out infinite' }} />
                </div>
                {progress && <div style={{ textAlign: 'right', fontSize: 12, color: '#a78bfa', marginTop: 4, fontWeight: 700 }}>{progress.percent}%</div>}
              </div>
            )}
            {mode !== 'pending' && (
              <div className="admin-info-box" style={{ fontSize: 12 }}>
                {mode === 'album' ? <>Salvo em: <code>{artist || 'Artista'} / {album || 'Album'}</code> no Supabase</> : <>Albums: audio completo. Playlists/artistas: catalogo.</>}
                <br />Requer yt-dlp e ffmpeg no servidor.
              </div>
            )}
            {error && <div className="admin-msg admin-msg--error">{error}</div>}
            <button className="admin-btn admin-btn--primary admin-btn--lg" onClick={run} disabled={loading || !canRun}
              style={{ background: loading ? '#374151' : mode === 'pending' ? '#f59e0b' : mode === 'url' ? '#1db954' : '#7c3aed', color: mode === 'pending' ? '#000' : '#fff', fontSize: 16, fontWeight: 700 }}>
              {loading ? 'Importando...' : mode === 'pending' ? 'Importar Faixas Em Breve' : mode === 'url' ? 'Importar do Spotify' : 'Iniciar Magic Import'}
            </button>
          </>
        )}

        {result && (
          <div>
            <div className="admin-msg admin-msg--success" style={{ fontSize: 15 }}>
              {result.imported} importadas / {result.skipped} nao encontradas / {result.errors} erros
              {result.importType === 'pending' && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Faixas importadas foram marcadas como disponiveis.</div>}
            </div>
            <div className="admin-table-wrap" style={{ marginTop: 16, maxHeight: 300, overflowY: 'auto' }}>
              <table className="admin-table">
                <thead><tr><th>#</th><th>Faixa</th><th>Status</th></tr></thead>
                <tbody>
                  {result.tracks.map((t: any, i: number) => (
                    <tr key={i}>
                      <td className="admin-table__muted">{i + 1}</td>
                      <td><strong>{t.title}</strong></td>
                      <td><span style={{ fontSize: 11, color: t.status.includes('error') ? '#ef4444' : t.status.includes('skipped') ? '#f59e0b' : '#1db954' }}>{t.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.importType === 'pending' && (
              <button className="admin-btn admin-btn--primary" onClick={() => setResult(null)} style={{ marginTop: 16, width: '100%', background: '#f59e0b', color: '#000' }}>Executar novamente</button>
            )}
            <button className="admin-btn admin-btn--ghost" onClick={onClose} style={{ marginTop: 8, width: '100%' }}>Fechar</button>
          </div>
        )}

      </div>
    </div>
  );
}

// â”€â”€ Import â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Import({ token }: { token: string }) {
  const [loading, setLoading] = useState<'drive' | 'drive-meta' | 's3' | null>(null);
  const [result, setResult] = useState<{ created: number; skipped: number; errors?: number; songs?: any[] } | null>(null);
  const [error, setError] = useState('');
  const [s3Prefix, setS3Prefix] = useState('');
  const [showMagic, setShowMagic] = useState(false);
  // Playlist import state
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [playlistResult, setPlaylistResult] = useState<{ imported: number; skipped: number; playlistName: string } | null>(null);
  const [playlistError, setPlaylistError] = useState('');
  // Spotdl state
  const [spotdlUrl, setSpotdlUrl] = useState('');
  const [spotdlRunning, setSpotdlRunning] = useState(false);
  const [spotdlLines, setSpotdlLines] = useState<{ type: 'info' | 'ok' | 'err'; text: string }[]>([]);
  const [spotdlResult, setSpotdlResult] = useState<{ imported: number; skipped: number; errors: number } | null>(null);
  const spotdlLogRef = useRef<HTMLDivElement>(null);
  // S3 metadata enrich state
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<{ enriched: number; notFound: number; total: number } | null>(null);
  const [enrichError, setEnrichError] = useState('');

  async function run(source: 'drive' | 'drive-meta' | 's3') {
    setLoading(source); setResult(null); setError('');
    try {
      const path = source === 'drive' ? '/admin/import/drive'
        : source === 'drive-meta' ? '/admin/import/drive/metadata'
        : '/admin/import/s3';
      const data = await api(path, token, {
        method: 'POST',
        body: JSON.stringify(source === 's3' ? { prefix: s3Prefix } : {}),
      });
      setResult(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(null); }
  }

  async function importPlaylist() {
    if (!playlistUrl.trim()) return;
    setPlaylistLoading(true); setPlaylistResult(null); setPlaylistError('');
    try {
      const data = await api('/admin/spotify/import-playlist', token, {
        method: 'POST',
        body: JSON.stringify({ url: playlistUrl.trim() }),
      });
      setPlaylistResult(data);
    } catch (e: any) { setPlaylistError(e.message); }
    finally { setPlaylistLoading(false); }
  }

  function addSpotdlLine(type: 'info' | 'ok' | 'err', text: string) {
    setSpotdlLines(l => [...l, { type, text }]);
    setTimeout(() => spotdlLogRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 50);
  }

  async function runSpotdl() {
    if (!spotdlUrl.trim() || spotdlRunning) return;
    setSpotdlRunning(true); setSpotdlLines([]); setSpotdlResult(null);
    addSpotdlLine('info', `ðŸ”— Iniciando download: ${spotdlUrl.trim()}`);
    try {
      const res = await fetch(`${API}/admin/spotdl/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: spotdlUrl.trim() }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ message: 'Erro desconhecido' }));
        addSpotdlLine('err', `âŒ ${err.message}`);
        setSpotdlRunning(false); return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';
        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim();
          if (!line) continue;
          try {
            const data = JSON.parse(line);
            if (data.status === 'downloading') addSpotdlLine('info', `â¬‡ï¸ [${data.current}/${data.total || '?'}] ${data.track ?? ''}`);
            else if (data.status === 'processing') addSpotdlLine('info', `ðŸ”„ Convertendo: ${data.track ?? ''}`);
            else if (data.status === 'uploading') addSpotdlLine('info', `â˜ï¸ Enviando [${data.current}/${data.total}]: ${data.track ?? ''}`);
            else if (data.status === 'done') { setSpotdlResult({ imported: data.imported ?? 0, skipped: data.skipped ?? 0, errors: data.errors ?? 0 }); addSpotdlLine('ok', `âœ… ConcluÃ­do â€” ${data.imported} importadas, ${data.skipped} jÃ¡ existiam, ${data.errors} erros`); }
            else if (data.status === 'error') addSpotdlLine('err', `âŒ ${data.error}`);
          } catch (_) {}
        }
      }
    } catch (e: any) { addSpotdlLine('err', `âŒ ${e.message}`); }
    finally { setSpotdlRunning(false); }
  }

  const needsReauth = error.includes('re-authenticate') || error.includes('not connected');

  async function enrichS3(all = false) {
    setEnriching(true); setEnrichResult(null); setEnrichError('');
    try {
      const data = await api(`/admin/import/s3/enrich${all ? '?all=true' : ''}`, token, { method: 'POST' });
      setEnrichResult(data);
    } catch (e: any) { setEnrichError(e.message); }
    finally { setEnriching(false); }
  }

  return (
    <div>
      <h2 className="admin-section-title">Importar MÃºsicas</h2>
      <p className="admin-text-muted">Importe mÃºsicas jÃ¡ armazenadas no S3/Supabase para o banco de dados.</p>

      {/* Magic Import CTA */}
      <div style={{
        background: 'linear-gradient(135deg, #1e0a3c 0%, #2d1b69 100%)',
        border: '1px solid #7c3aed', borderRadius: 12, padding: '20px 24px',
        marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>âœ¨ Magic Import</div>
          <div style={{ fontSize: 13, color: '#c4b5fd', marginTop: 4 }}>
            Digite artista + Ã¡lbum e o sistema busca metadados, baixa do YouTube e envia direto para o <strong>Supabase Storage</strong> automaticamente.
          </div>
        </div>
        <button
          className="admin-btn admin-btn--primary"
          onClick={() => setShowMagic(true)}
          style={{ background: '#7c3aed', whiteSpace: 'nowrap', fontWeight: 700, fontSize: 14, padding: '10px 20px' }}
        >
          âœ¨ Magic Import
        </button>
      </div>

      {showMagic && <MagicImportModal token={token} onClose={() => setShowMagic(false)} />}

      <div className="admin-import-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        <div className="admin-import-card">
          <div className="admin-import-card__icon">âš¡</div>
          <h3>Drive â€” RÃ¡pido</h3>
          <p>Importa os caminhos sem baixar os arquivos. TÃ­tulo extraÃ­do do nome do arquivo.</p>
          {needsReauth ? (
            <a className="admin-btn admin-btn--primary" href={`${API}/auth/google`}
              style={{ textDecoration: 'none', textAlign: 'center' }}>ðŸ”— Conectar Drive</a>
          ) : (
            <button className="admin-btn admin-btn--primary" onClick={() => run('drive')} disabled={!!loading}>
              {loading === 'drive' ? 'â³ Importando...' : 'âš¡ Importar (rÃ¡pido)'}
            </button>
          )}
        </div>

        <div className="admin-import-card" style={{ borderColor: '#1db954', border: '1px solid #1db954' }}>
          <div className="admin-import-card__icon">ðŸŽµ</div>
          <h3>Drive â€” Com Metadados</h3>
          <p>Baixa cada arquivo e extrai <strong>tÃ­tulo, artista, Ã¡lbum, duraÃ§Ã£o e bitrate</strong> dos tags ID3/Vorbis.</p>
          {needsReauth ? (
            <a className="admin-btn admin-btn--primary" href={`${API}/auth/google`}
              style={{ textDecoration: 'none', textAlign: 'center' }}>ðŸ”— Conectar Drive</a>
          ) : (
            <button className="admin-btn admin-btn--primary" onClick={() => run('drive-meta')} disabled={!!loading}>
              {loading === 'drive-meta' ? 'â³ Extraindo metadados...' : 'ðŸŽµ Importar com Metadados'}
            </button>
          )}
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
            âš ï¸ Mais lento â€” baixa cada arquivo para ler os tags
          </div>
        </div>

        <div className="admin-import-card">
          <div className="admin-import-card__icon">â˜ï¸</div>
          <h3>AWS S3</h3>
          <div className="admin-form-group">
            <label className="admin-label">Prefixo (opcional)</label>
            <input className="admin-input" placeholder="ex: songs/" value={s3Prefix} onChange={e => setS3Prefix(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="admin-btn admin-btn--primary" onClick={() => run('s3')} disabled={!!loading} style={{ flex: 1 }}>
              {loading === 's3' ? 'â³ Importando...' : 'ðŸ“‚ Importar com Prefixo'}
            </button>
            <button className="admin-btn admin-btn--ghost" onClick={async () => { setS3Prefix(''); setLoading('s3'); setResult(null); setError(''); try { const data = await api('/admin/import/s3', token, { method: 'POST', body: JSON.stringify({ prefix: '' }) }); setResult(data); } catch (e: any) { setError(e.message); } finally { setLoading(null); } }} disabled={!!loading} style={{ flex: 1 }} title="Importa todos os arquivos do bucket sem filtro de prefixo">
              {loading === 's3' ? 'â³...' : 'â˜ï¸ Importar Tudo'}
            </button>
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
            "Importar Tudo" varre o bucket inteiro sem filtro de prefixo
          </div>
        </div>

        {/* S3 Metadata Enrich card */}
        <div className="admin-import-card" style={{ border: '1px solid #f59e0b' }}>
          <div className="admin-import-card__icon">ðŸ”</div>
          <h3>Enriquecer Metadados S3</h3>
          <p>
            Busca <strong>artista, Ã¡lbum e capa</strong> para mÃºsicas do S3 que estÃ£o sem metadados.
            Usa o nome do arquivo e a estrutura de pastas para identificar a faixa correta.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="admin-btn admin-btn--primary"
              onClick={() => enrichS3(false)}
              disabled={enriching}
              style={{ flex: 1, background: '#f59e0b', color: '#000', fontWeight: 700 }}
              title="Enriquece apenas mÃºsicas sem artista ou sem capa"
            >
              {enriching ? 'â³ Buscando...' : 'ðŸ” Enriquecer Faltantes'}
            </button>
            <button
              className="admin-btn admin-btn--ghost"
              onClick={() => enrichS3(true)}
              disabled={enriching}
              style={{ flex: 1 }}
              title="Re-enriquece todas as mÃºsicas do S3, mesmo as que jÃ¡ tÃªm metadados"
            >
              {enriching ? 'â³...' : 'ðŸ”„ Re-enriquecer Todas'}
            </button>
          </div>
          {enrichError && <div className="admin-msg admin-msg--error" style={{ marginTop: 8, fontSize: 12 }}>âŒ {enrichError}</div>}
          {enrichResult && (
            <div className="admin-msg admin-msg--success" style={{ marginTop: 8, fontSize: 12 }}>
              âœ… <strong>{enrichResult.enriched}</strong> enriquecidas Â· <strong>{enrichResult.notFound}</strong> nÃ£o encontradas
              <span style={{ color: '#6b7280' }}> (de {enrichResult.total} mÃºsicas)</span>
            </div>
          )}
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
            Detecta padrÃµes: <code>Artista/Ãlbum/Faixa</code> e <code>Artista - TÃ­tulo</code>
          </div>
        </div>

        {/* Spotify / Magic Import card */}
        <div className="admin-import-card" style={{ border: '1px solid #1db954' }}>
          <div className="admin-import-card__icon">ðŸŽ§</div>
          <h3>Importar do Spotify</h3>
          <p>Cole um link do Spotify (faixa, Ã¡lbum, playlist ou artista) para importar com metadados completos.</p>
          <button
            className="admin-btn admin-btn--primary"
            onClick={() => setShowMagic(true)}
            style={{ background: '#1db954', fontWeight: 700 }}
          >
            ðŸ”— Importar por Link
          </button>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
            Ãlbuns: baixa Ã¡udio completo Â· Playlists/artistas: catÃ¡logo
          </div>
        </div>

        {/* Deezer Playlist card */}
        <div className="admin-import-card" style={{ border: '1px solid #a855f7' }}>
          <div className="admin-import-card__icon">ðŸ”—</div>
          <h3>Playlist por Link</h3>
          <p>Importa metadados de uma playlist ou Ã¡lbum do <strong>Deezer</strong> como catÃ¡logo.</p>
          <input
            className="admin-input"
            placeholder="https://www.deezer.com/playlist/..."
            value={playlistUrl}
            onChange={e => { setPlaylistUrl(e.target.value); setPlaylistResult(null); setPlaylistError(''); }}
            onKeyDown={e => e.key === 'Enter' && importPlaylist()}
            style={{ marginBottom: 8 }}
          />
          <button
            className="admin-btn admin-btn--primary"
            onClick={importPlaylist}
            disabled={playlistLoading || !playlistUrl.trim()}
            style={{ background: '#a855f7', fontWeight: 700 }}
          >
            {playlistLoading ? 'â³ Importando...' : 'â¬‡ï¸ Importar'}
          </button>
          {playlistError && <div className="admin-msg admin-msg--error" style={{ marginTop: 8, fontSize: 12 }}>âŒ {playlistError}</div>}
          {playlistResult && (
            <div className="admin-msg admin-msg--success" style={{ marginTop: 8, fontSize: 12 }}>
              âœ… <strong>{playlistResult.playlistName}</strong><br />
              {playlistResult.imported} adicionadas Â· {playlistResult.skipped} jÃ¡ existiam
            </div>
          )}
        </div>

        {/* Spotdl card */}
        <div className="admin-import-card" style={{ border: '1px solid #f59e0b', gridColumn: '1 / -1' }}>
          <div className="admin-import-card__icon">â¬‡ï¸</div>
          <h3>Download Direto do Spotify (320kbps)</h3>
          <p>Cole um link do Spotify. O servidor baixa o Ã¡udio em <strong>320kbps</strong> via spotdl e importa automaticamente.</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              className="admin-input"
              style={{ flex: 1 }}
              placeholder="https://open.spotify.com/album/..."
              value={spotdlUrl}
              onChange={e => setSpotdlUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runSpotdl()}
              disabled={spotdlRunning}
            />
            <button
              className="admin-btn admin-btn--primary"
              onClick={runSpotdl}
              disabled={spotdlRunning || !spotdlUrl.trim()}
              style={{ background: '#f59e0b', color: '#000', fontWeight: 700, minWidth: 120 }}
            >
              {spotdlRunning ? 'â³ Baixando...' : 'â¬‡ï¸ Baixar'}
            </button>
          </div>
          {spotdlLines.length > 0 && (
            <div ref={spotdlLogRef} style={{
              background: '#0a0a0a', borderRadius: 8, padding: 12, maxHeight: 200,
              overflowY: 'auto', fontFamily: 'monospace', fontSize: 11,
              display: 'flex', flexDirection: 'column', gap: 2, border: '1px solid #2a2a2a',
            }}>
              {spotdlLines.map((l, i) => (
                <div key={i} style={{ color: l.type === 'ok' ? '#1db954' : l.type === 'err' ? '#f15e6c' : '#b3b3b3' }}>{l.text}</div>
              ))}
              {spotdlRunning && <div style={{ color: '#535353' }}>â–Œ</div>}
            </div>
          )}
          {spotdlResult && (
            <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 900, color: '#1db954' }}>{spotdlResult.imported}</div><div style={{ fontSize: 11, color: '#b3b3b3' }}>importadas</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 900, color: '#b3b3b3' }}>{spotdlResult.skipped}</div><div style={{ fontSize: 11, color: '#b3b3b3' }}>jÃ¡ existiam</div></div>
              {spotdlResult.errors > 0 && <div style={{ textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 900, color: '#f15e6c' }}>{spotdlResult.errors}</div><div style={{ fontSize: 11, color: '#b3b3b3' }}>erros</div></div>}
            </div>
          )}
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>âš ï¸ Requer spotdl e ffmpeg instalados no servidor</div>
        </div>

        <CsvImportCard token={token} />
      </div>

      {error && <div className="admin-msg admin-msg--error">âŒ {error}</div>}

      {result && (
        <div>
          <div className="admin-msg admin-msg--success">
            âœ… <strong>{result.created}</strong> criadas Â· <strong>{result.skipped}</strong> jÃ¡ existiam
            {result.errors ? ` Â· ${result.errors} erros` : ''}
          </div>
          {result.songs && result.songs.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 className="admin-subsection-title">Metadados extraÃ­dos</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>#</th><th>TÃ­tulo</th><th>Artista</th><th>Ãlbum</th><th>DuraÃ§Ã£o</th></tr></thead>
                  <tbody>
                    {result.songs.map((s: any, i: number) => (
                      <tr key={i}>
                        <td className="admin-table__muted">{i + 1}</td>
                        <td><strong>{s.title}</strong></td>
                        <td className="admin-table__muted">{s.artist || 'â€”'}</td>
                        <td className="admin-table__muted">{s.album || 'â€”'}</td>
                        <td className="admin-table__muted">
                          {Math.floor(s.duration / 60)}:{String(s.duration % 60).padStart(2, '0')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// â”€â”€ Users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Users({ token }: { token: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  function load(query = '') {
    setLoading(true);
    api(`/admin/users${query ? `?q=${encodeURIComponent(query)}` : ''}`, token)
      .then(setUsers).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [token]);

  async function updatePlan(id: string, plan: string, durationDays?: number) {
    try {
      await api(`/admin/users/${id}/plan`, token, { method: 'PUT', body: JSON.stringify({ plan, durationDays }) });
      setUsers(us => us.map(u => u.id === id ? { ...u, plan, offlineEnabled: plan !== 'free' } : u));
      setMsg(`âœ… Plano ${plan}${durationDays === -1 ? ' ilimitado' : durationDays ? ` por ${durationDays} dias` : ''} concedido. UsuÃ¡rio foi notificado.`);
    } catch (e: any) { setMsg(e.message); }
  }

  async function toggleAdmin(id: string, current: boolean) {
    try {
      await api(`/admin/users/${id}/admin`, token, { method: 'PUT', body: JSON.stringify({ isAdmin: !current }) });
      setUsers(us => us.map(u => u.id === id ? { ...u, isAdmin: !current } : u));
    } catch (e: any) { setMsg(e.message); }
  }

  async function del(id: string, email: string) {
    if (!confirm(`Deletar usuÃ¡rio "${email}"? Esta aÃ§Ã£o Ã© irreversÃ­vel.`)) return;
    try {
      await api(`/admin/users/${id}`, token, { method: 'DELETE' });
      setUsers(us => us.filter(u => u.id !== id));
      setMsg('UsuÃ¡rio deletado.');
    } catch (e: any) { setMsg(e.message); }
  }

  return (
    <div>
      <h2 className="admin-section-title">UsuÃ¡rios ({users.length})</h2>
      {msg && <div className="admin-msg">{msg}</div>}
      <div className="admin-search-row">
        <input className="admin-input" placeholder="Buscar por email ou nome..." value={q}
          onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && load(q)} />
        <button className="admin-btn admin-btn--primary" onClick={() => load(q)}>Buscar</button>
      </div>
      {loading ? <div className="admin-loading">Carregando...</div> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Email</th><th>Nome</th><th>Plano</th><th>Admin</th><th>Playlists</th><th>Favoritos</th><th>Cadastro</th><th></th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.email}</strong></td>
                  <td className="admin-table__muted">{u.name ?? 'â€”'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <select className="admin-select" value={u.plan} onChange={e => {
                        const val = e.target.value;
                        if (val === 'free') updatePlan(u.id, 'free');
                      }}>
                        <option value="free">free</option>
                        <option value="premium">premium</option>
                        <option value="family">family</option>
                      </select>
                      <select className="admin-select" style={{ fontSize: 11 }}
                        defaultValue=""
                        onChange={e => {
                          const val = e.target.value;
                          if (!val) return;
                          const [plan, days] = val.split(':');
                          updatePlan(u.id, plan, Number(days));
                          e.target.value = '';
                        }}>
                        <option value="">âš¡ Conceder</option>
                        <option value="premium:30">Premium 30 dias</option>
                        <option value="premium:90">Premium 90 dias</option>
                        <option value="premium:-1">Premium Ilimitado â™¾ï¸</option>
                        <option value="family:30">Family 30 dias</option>
                        <option value="family:90">Family 90 dias</option>
                        <option value="family:-1">Family Ilimitado â™¾ï¸</option>
                        <option value="free:0">Revogar â†’ Free</option>
                      </select>
                    </div>
                  </td>
                  <td>
                    <button
                      className={`admin-toggle${u.isAdmin ? ' admin-toggle--on' : ''}`}
                      onClick={() => toggleAdmin(u.id, u.isAdmin)}
                      title={u.isAdmin ? 'Remover admin' : 'Tornar admin'}
                    >{u.isAdmin ? 'âœ“' : 'â—‹'}</button>
                  </td>
                  <td className="admin-table__muted">{u._count.playlists}</td>
                  <td className="admin-table__muted">{u._count.favorites}</td>
                  <td className="admin-table__muted">{new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td>
                    <button className="admin-btn admin-btn--danger admin-btn--sm" onClick={() => del(u.id, u.email)}>ðŸ—‘</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <div className="admin-empty">Nenhum usuÃ¡rio encontrado.</div>}
        </div>
      )}
    </div>
  );
}

// â”€â”€ Activity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Activity({ token }: { token: string }) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/admin/activity?limit=100', token).then(setLogs).finally(() => setLoading(false));
  }, [token]);

  const ACTION_ICONS: Record<string, string> = {
    play: 'â–¶ï¸', download: 'â¬‡ï¸', skip: 'â­', like: 'â¤ï¸', add_to_playlist: 'âž•',
  };

  return (
    <div>
      <h2 className="admin-section-title">Log de Atividades</h2>
      {loading ? <div className="admin-loading">Carregando...</div> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>AÃ§Ã£o</th><th>UsuÃ¡rio</th><th>MÃºsica</th><th>Quando</th></tr></thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td><span className="admin-action-badge">{ACTION_ICONS[l.action] ?? 'â€¢'} {l.action}</span></td>
                  <td>{l.user.email}</td>
                  <td className="admin-table__muted">{l.song?.title ?? 'â€”'}</td>
                  <td className="admin-table__muted">{new Date(l.timestamp).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && <div className="admin-empty">Nenhuma atividade registrada.</div>}
        </div>
      )}
    </div>
  );
}

// â”€â”€ Release App â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ReleaseApp({ token }: { token: string }) {
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [tvFile, setTvFile] = useState<File | null>(null);
  const [changelog, setChangelog] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [version, setVersion] = useState<any>(null);
  const mobileRef = useRef<HTMLInputElement>(null);
  const tvRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api('/app/version', token).then(setVersion).catch(() => {});
  }, [token]);

  async function release(file: File, type: 'mobile' | 'tv') {
    setLoading(true); setResult('');
    const fd = new FormData();
    fd.append('apk', file);
    if (changelog.trim()) fd.append('notes', changelog.trim());
    try {
      const data = await api(`/app/release/${type}`, token, { method: 'POST', body: fd });
      setResult(`âœ… ${type === 'mobile' ? 'Mobile' : 'TV'} publicado! VersÃ£o: ${data.version}`);
      setVersion(data);
      if (type === 'mobile') setMobileFile(null);
      else setTvFile(null);
    } catch (e: any) { setResult(`âŒ ${e.message}`); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <h2 className="admin-section-title">ðŸ“± Publicar AtualizaÃ§Ã£o do App</h2>

      {/* App info card */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#1e1e1e', borderRadius: 10, padding: 16, marginBottom: 20, border: '1px solid #2a2a2a' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1db954', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="black"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <div>
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>OursMusic</div>
          <div style={{ color: '#9ca3af', fontSize: 12 }}>VersÃ£o atual no servidor: <strong style={{ color: '#1db954' }}>{version?.version ?? 'â€”'}</strong></div>
          {version?.releasedAt && <div style={{ color: '#6a6a6a', fontSize: 11 }}>Publicado em: {new Date(version.releasedAt).toLocaleString('pt-BR')}</div>}
          {version?.notes && <div style={{ color: '#b3b3b3', fontSize: 12, marginTop: 4 }}>ðŸ“ {version.notes}</div>}
        </div>
      </div>

      {/* Changelog */}
      <div style={{ marginBottom: 20 }}>
        <label className="admin-label">ðŸ“ O que hÃ¡ de novo nesta versÃ£o (changelog)</label>
        <textarea
          className="admin-input"
          rows={4}
          placeholder="â€¢ Novo recurso X&#10;â€¢ CorreÃ§Ã£o de bug Y&#10;â€¢ Melhoria de performance Z"
          value={changelog}
          onChange={e => setChangelog(e.target.value)}
          style={{ width: '100%', resize: 'vertical', marginTop: 6 }}
        />
        <div style={{ fontSize: 11, color: '#6a6a6a', marginTop: 4 }}>
          AparecerÃ¡ para o usuÃ¡rio na primeira abertura apÃ³s instalar a atualizaÃ§Ã£o.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Mobile */}
        <div style={{ background: '#1e1e1e', borderRadius: 10, padding: 20, border: '1px solid #2a2a2a' }}>
          <h3 style={{ color: '#fff', marginBottom: 12 }}>ðŸ“± APK Mobile</h3>
          <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
            Build: <code>--dart-define=DEVICE_TYPE=mobile</code>
          </p>
          <input ref={mobileRef} type="file" accept=".apk" hidden onChange={e => setMobileFile(e.target.files?.[0] ?? null)} />
          <button className="admin-btn admin-btn--ghost" onClick={() => mobileRef.current?.click()} style={{ marginBottom: 10, width: '100%' }}>
            {mobileFile ? `âœ… ${mobileFile.name}` : 'ðŸ“‚ Selecionar app-mobile.apk'}
          </button>
          {mobileFile && (
            <button className="admin-btn admin-btn--primary" onClick={() => release(mobileFile, 'mobile')} disabled={loading} style={{ width: '100%', background: '#1db954' }}>
              {loading ? 'â³ Publicando...' : 'ðŸš€ Publicar Mobile'}
            </button>
          )}
        </div>

        {/* TV */}
        <div style={{ background: '#1e1e1e', borderRadius: 10, padding: 20, border: '1px solid #2a2a2a' }}>
          <h3 style={{ color: '#fff', marginBottom: 12 }}>ðŸ“º APK TV / TV Box</h3>
          <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
            Build: <code>--dart-define=DEVICE_TYPE=tv</code>
          </p>
          <input ref={tvRef} type="file" accept=".apk" hidden onChange={e => setTvFile(e.target.files?.[0] ?? null)} />
          <button className="admin-btn admin-btn--ghost" onClick={() => tvRef.current?.click()} style={{ marginBottom: 10, width: '100%' }}>
            {tvFile ? `âœ… ${tvFile.name}` : 'ðŸ“‚ Selecionar app-tv.apk'}
          </button>
          {tvFile && (
            <button className="admin-btn admin-btn--primary" onClick={() => release(tvFile, 'tv')} disabled={loading} style={{ width: '100%', background: '#7c3aed' }}>
              {loading ? 'â³ Publicando...' : 'ðŸš€ Publicar TV'}
            </button>
          )}
        </div>
      </div>

      {result && <div className={`admin-msg${result.startsWith('âŒ') ? ' admin-msg--error' : ' admin-msg--success'}`} style={{ marginTop: 16 }}>{result}</div>}

      <div className="admin-info-box" style={{ marginTop: 20, fontSize: 12 }}>
        <strong>Comando de build:</strong><br />
        <code>flutter build apk --release --dart-define=APP_VERSION=1.x.x --dart-define=API_URL=http://192.168.15.3:3000 --dart-define=DEVICE_TYPE=mobile</code>
      </div>
    </div>
  );
}

// â”€â”€ Play Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PlayStats({ token }: { token: string }) {
  const [data, setData] = useState<{ total: number; songs: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/admin/songs/play-stats', token).then(setData).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="admin-loading">Carregando...</div>;
  if (!data) return <div className="admin-empty">Sem dados</div>;

  return (
    <div>
      <h2 className="admin-section-title">ðŸ“Š Contadores de Play</h2>
      <div className="admin-stats-grid" style={{ marginBottom: 24 }}>
        <div className="admin-stat-card" style={{ borderTop: '3px solid #1db954' }}>
          <div className="admin-stat-card__icon">â–¶ï¸</div>
          <div className="admin-stat-card__value">{data.total.toLocaleString()}</div>
          <div className="admin-stat-card__label">Total de plays</div>
        </div>
        <div className="admin-stat-card" style={{ borderTop: '3px solid #3b82f6' }}>
          <div className="admin-stat-card__icon">ðŸŽµ</div>
          <div className="admin-stat-card__value">{data.songs.length}</div>
          <div className="admin-stat-card__label">MÃºsicas tocadas</div>
        </div>
      </div>

      <h3 className="admin-subsection-title">Top mÃºsicas por plays</h3>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>#</th><th>MÃºsica</th><th>Artista</th><th>Ãlbum</th><th style={{ textAlign: 'right' }}>Plays</th></tr></thead>
          <tbody>
            {data.songs.map((s, i) => (
              <tr key={s.id}>
                <td className="admin-table__muted">{i + 1}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {s.coverUrl
                      ? <img src={s.coverUrl} alt="" width={32} height={32} style={{ borderRadius: 4, objectFit: 'cover' }} />
                      : <div style={{ width: 32, height: 32, background: '#2a2a2a', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>ðŸŽµ</div>
                    }
                    <strong>{s.title}</strong>
                  </div>
                </td>
                <td className="admin-table__muted">{s.artist || 'â€”'}</td>
                <td className="admin-table__muted">{s.albumName || 'â€”'}</td>
                <td style={{ textAlign: 'right' }}>
                  <span style={{ background: '#1db954', color: '#000', borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
                    {s.playCount.toLocaleString()} â–¶
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.songs.length === 0 && <div className="admin-empty">Nenhuma mÃºsica tocada ainda.</div>}
      </div>
    </div>
  );
}

// â”€â”€ Spotify Catalog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SpotifyCatalog({ token }: { token: string }) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(20);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState('');

  const PRESETS = [
    { label: 'Eminem', query: 'artist:Eminem' },
    { label: 'Michael Jackson', query: 'artist:Michael Jackson' },
    { label: 'Beatles', query: 'artist:The Beatles' },
    { label: 'Coldplay', query: 'artist:Coldplay' },
    { label: 'BeyoncÃ©', query: 'artist:BeyoncÃ©' },
    { label: 'Thriller', query: 'album:Thriller' },
    { label: 'Bohemian Rhapsody', query: 'Bohemian Rhapsody' },
    { label: 'Funk BR', query: 'artist:Anitta' },
  ];

  async function doPreview() {
    if (!query.trim()) return;
    setPreviewing(true); setPreview(null); setResult(null); setError(''); setSelected(new Set());
    try {
      const data = await api('/admin/spotify/preview', token, {
        method: 'POST',
        body: JSON.stringify({ query, limit }),
      });
      setPreview(data.tracks ?? []);
      // Select all by default
      setSelected(new Set((data.tracks ?? []).map((_: any, i: number) => i)));
    } catch (e: any) { setError(e.message); }
    finally { setPreviewing(false); }
  }

  async function doImport() {
    if (!preview || selected.size === 0) return;
    setImporting(true); setError('');
    // Import only selected tracks by sending them directly
    const tracks = preview.filter((_, i) => selected.has(i));
    try {
      const data = await api('/admin/spotify/catalog', token, {
        method: 'POST',
        body: JSON.stringify({ query, limit: tracks.length, tracks }),
      });
      setResult(data);
      setPreview(null);
    } catch (e: any) { setError(e.message); }
    finally { setImporting(false); }
  }

  function toggleAll() {
    if (selected.size === preview?.length) setSelected(new Set());
    else setSelected(new Set(preview?.map((_, i) => i) ?? []));
  }

  return (
    <div>
      <h2 className="admin-section-title">CatÃ¡logo de MÃºsicas</h2>
      <p className="admin-text-muted">
        Busca metadados via <strong>MusicBrainz</strong> (gratuito). PrÃ©-visualize os resultados, selecione o que quiser e importe. As mÃºsicas ficam marcadas como <strong style={{ color: '#f59e0b' }}>em breve</strong> atÃ© vocÃª adicionar o arquivo de Ã¡udio.
      </p>

      <div className="admin-info-box" style={{ marginBottom: 20 }}>
        ðŸ’¡ Exemplos: <code>artist:Eminem</code> Â· <code>album:Thriller</code> Â· <code>Bohemian Rhapsody</code>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {PRESETS.map(p => (
          <button key={p.query} className="admin-btn admin-btn--ghost admin-btn--sm"
            onClick={() => { setQuery(p.query); setPreview(null); setResult(null); }}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="admin-search-row" style={{ alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label className="admin-label">Busca</label>
          <input className="admin-input" placeholder='Ex: artist:Coldplay, album:Thriller, Bohemian Rhapsody'
            value={query} onChange={e => { setQuery(e.target.value); setPreview(null); }}
            onKeyDown={e => e.key === 'Enter' && doPreview()} />
        </div>
        <div style={{ width: 90 }}>
          <label className="admin-label">Qtd</label>
          <select className="admin-select" style={{ width: '100%', padding: '10px 8px' }}
            value={limit} onChange={e => setLimit(Number(e.target.value))}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
          </select>
        </div>
        <button className="admin-btn admin-btn--primary" onClick={doPreview}
          disabled={previewing || !query.trim()} style={{ height: 42 }}>
          {previewing ? 'â³ Buscando...' : 'ðŸ” Buscar'}
        </button>
      </div>

      {error && <div className="admin-msg admin-msg--error">âŒ {error}</div>}
      {result && <div className="admin-msg admin-msg--success">âœ… <strong>{result.imported}</strong> importadas Â· <strong>{result.skipped}</strong> jÃ¡ existiam</div>}

      {preview && preview.length === 0 && (
        <div className="admin-empty">Nenhum resultado encontrado. Tente outra busca.</div>
      )}

      {preview && preview.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 className="admin-subsection-title" style={{ margin: 0 }}>
              {preview.length} resultado(s) â€” selecione o que importar
            </h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="admin-btn admin-btn--ghost admin-btn--sm" onClick={toggleAll}>
                {selected.size === preview.length ? 'Desmarcar todos' : 'Selecionar todos'}
              </button>
              <button className="admin-btn admin-btn--primary" onClick={doImport}
                disabled={importing || selected.size === 0}
                style={{ background: '#1db954' }}>
                {importing ? 'â³ Importando...' : `â¬‡ï¸ Importar ${selected.size} mÃºsica(s)`}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {preview.map((t: any, i: number) => {
              const sel = selected.has(i);
              return (
                <div key={i}
                  onClick={() => {
                    const s = new Set(selected);
                    sel ? s.delete(i) : s.add(i);
                    setSelected(s);
                  }}
                  style={{
                    background: sel ? '#0d2a1a' : '#1a1a1a',
                    border: `2px solid ${sel ? '#1db954' : 'transparent'}`,
                    borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}>
                  {t.coverUrl
                    ? <img src={t.coverUrl} alt={t.title} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', aspectRatio: '1', background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>ðŸŽµ</div>
                  }
                  <div style={{ padding: '8px 10px' }}>
                    {sel && <div style={{ fontSize: 10, color: '#1db954', fontWeight: 700, marginBottom: 2 }}>âœ“ SELECIONADO</div>}
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.artist}</div>
                    <div style={{ fontSize: 10, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.album}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€ Admin Panel root â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function AdminPanel({ token, userEmail, onExit }: { token: string; userEmail: string; onExit: () => void }) {
  const [view, setView] = useState<AdminView>('dashboard');

  const NAV: { id: AdminView; icon: string; label: string }[] = [
    { id: 'dashboard', icon: 'ðŸ“Š', label: 'Dashboard' },
    { id: 'songs', icon: 'ðŸŽµ', label: 'MÃºsicas' },
    { id: 'upload', icon: 'â¬†ï¸', label: 'Upload' },
    { id: 'import', icon: 'ðŸ“¥', label: 'Importar' },
    { id: 'catalog', icon: 'ðŸŽ§', label: 'CatÃ¡logo' },
    { id: 'users', icon: 'ðŸ‘¥', label: 'UsuÃ¡rios' },
    { id: 'activity', icon: 'ðŸ“‹', label: 'Atividades' },
    { id: 'release', icon: 'ðŸ“±', label: 'Publicar App' },
    { id: 'playstats', icon: 'ðŸ“Š', label: 'Plays' },
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <span>âš™ï¸</span>
          <div>
            <div className="admin-sidebar__title">Painel Admin</div>
            <div className="admin-sidebar__sub">{userEmail}</div>
          </div>
        </div>
        <nav className="admin-sidebar__nav">
          {NAV.map(n => (
            <button
              key={n.id}
              className={`admin-nav-item${view === n.id ? ' admin-nav-item--active' : ''}`}
              onClick={() => setView(n.id)}
            >
              <span>{n.icon}</span> {n.label}
            </button>
          ))}
        </nav>
        <button className="admin-nav-item admin-nav-item--exit" onClick={onExit}>
          <span>ðŸŽµ</span> Voltar ao Player
        </button>
      </aside>

      <main className="admin-main">
        {view === 'dashboard' && <Dashboard token={token} />}
        {view === 'songs' && <Songs token={token} />}
        {view === 'upload' && <Upload token={token} />}
        {view === 'import' && <Import token={token} />}
        {view === 'catalog' && <SpotifyCatalog token={token} />}
        {view === 'users' && <Users token={token} />}
        {view === 'activity' && <Activity token={token} />}
        {view === 'release' && <ReleaseApp token={token} />}
        {view === 'playstats' && <PlayStats token={token} />}
      </main>
    </div>
  );
}
