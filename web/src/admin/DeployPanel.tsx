import { useState, useRef, useEffect, useCallback } from 'react';
import { API_URL, EXTRA_HEADERS } from '../config';

interface DeployEvent {
  type: 'info' | 'success' | 'error' | 'warning' | 'progress' | 'file' | 'done';
  message: string;
  progress?: number;
  file?: string;
  dest?: string;
}

interface BackupEntry {
  name: string;
  size: number;
  date: string;
}

interface Props {
  token: string;
}

export function DeployPanel({ token }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [versionTag, setVersionTag] = useState('');
  const [keepUploads, setKeepUploads] = useState(true);
  const [keepDb, setKeepDb] = useState(true);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<DeployEvent[]>([]);
  const [done, setDone] = useState(false);
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [fileChanges, setFileChanges] = useState<{ file: string; dest: string }[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const adminHeaders = {
    Authorization: `Bearer ${token}`,
    'X-Admin-Token': import.meta.env.VITE_ADMIN_SECRET ?? '',
    ...EXTRA_HEADERS,
  };

  const loadBackups = useCallback(() => {
    fetch(`${API_URL}/deploy/backups`, { headers: adminHeaders, credentials: 'include' })
      .then(r => r.json())
      .then(setBackups)
      .catch(() => {});
  }, [token]);

  useEffect(() => { loadBackups(); }, [loadBackups]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  async function startDeploy() {
    if (!file) return;
    setRunning(true);
    setDone(false);
    setProgress(0);
    setLogs([]);
    setFileChanges([]);

    const form = new FormData();
    form.append('package', file);
    form.append('version_tag', versionTag);
    form.append('keep_uploads', String(keepUploads));
    form.append('keep_db', String(keepDb));

    try {
      const res = await fetch(`${API_URL}/deploy/run`, {
        method: 'POST',
        headers: adminHeaders,
        credentials: 'include',
        body: form,
      });

      if (!res.ok || !res.body) {
        setLogs(l => [...l, { type: 'error', message: `❌ Erro HTTP ${res.status}` }]);
        setRunning(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event: DeployEvent = JSON.parse(line.slice(6));
            setLogs(l => [...l, event]);
            if (event.progress !== undefined) setProgress(event.progress);
            if (event.type === 'file' && event.file && event.dest) {
              setFileChanges(fc => [...fc, { file: event.file!, dest: event.dest! }]);
            }
            if (event.type === 'done') {
              setDone(true);
              setRunning(false);
              loadBackups();
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err: any) {
      setLogs(l => [...l, { type: 'error', message: `❌ ${err.message}` }]);
      setRunning(false);
    }
  }

  function reset() {
    setFile(null);
    setVersionTag('');
    setLogs([]);
    setProgress(0);
    setDone(false);
    setFileChanges([]);
  }

  const logColor: Record<string, string> = {
    success: '#4ade80',
    error:   '#f87171',
    warning: '#fbbf24',
    info:    '#94a3b8',
    file:    '#60a5fa',
    progress:'#a78bfa',
    done:    '#4ade80',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Form ── */}
      {!running && !done && (
        <div className="adm-card" style={{ borderLeft: '3px solid #4ade80' }}>
          <div className="adm-card__title">🛠️ Configurar Deploy</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="adm-form-row">
              <label>Pacote ZIP</label>
              <input type="file" accept=".zip"
                onChange={e => setFile(e.target.files?.[0] ?? null)} />
              {file && <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                📎 {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
              </span>}
            </div>
            <div className="adm-form-row">
              <label>Version Tag (opcional)</label>
              <input value={versionTag} onChange={e => setVersionTag(e.target.value)}
                placeholder="ex: v2.1.0" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#cbd5e1', cursor: 'pointer' }}>
              <input type="checkbox" checked={keepUploads} onChange={e => setKeepUploads(e.target.checked)}
                style={{ accentColor: '#4ade80' }} />
              Manter uploads/
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#cbd5e1', cursor: 'pointer' }}>
              <input type="checkbox" checked={keepDb} onChange={e => setKeepDb(e.target.checked)}
                style={{ accentColor: '#4ade80' }} />
              Manter db/
            </label>
          </div>

          <button className="adm-btn adm-btn--primary" onClick={startDeploy} disabled={!file}
            style={{ background: '#4ade80', color: '#0f172a' }}>
            🚀 Iniciar Deploy
          </button>
        </div>
      )}

      {/* ── Terminal ── */}
      {(running || logs.length > 0) && (
        <div className="adm-card" style={{ borderLeft: '3px solid #7c3aed' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="adm-card__title" style={{ margin: 0 }}>
              {running ? '⚡ Deploy em andamento...' : done ? '✅ Deploy concluído' : '📋 Log'}
            </div>
            {done && (
              <button className="adm-btn" onClick={reset}
                style={{ padding: '4px 14px', fontSize: 12, background: '#1e293b', color: '#94a3b8' }}>
                Novo Deploy
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div style={{ height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: done ? '#4ade80' : 'linear-gradient(90deg,#7c3aed,#4ade80)',
              transition: 'width 0.3s ease',
              borderRadius: 3,
            }} />
          </div>
          <div style={{ fontSize: 11, color: '#475569', marginBottom: 12, textAlign: 'right' }}>{progress}%</div>

          {/* Terminal output */}
          <div ref={terminalRef} style={{
            background: '#020617',
            border: '1px solid #1e293b',
            borderRadius: 8,
            padding: '12px 16px',
            fontFamily: '"Courier New", monospace',
            fontSize: 12,
            maxHeight: 380,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}>
            {logs.map((log, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, lineHeight: 1.6 }}>
                <span style={{ color: '#334155', minWidth: 50, flexShrink: 0 }}>
                  {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span style={{ color: logColor[log.type] ?? '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {log.message}
                </span>
              </div>
            ))}
            {running && (
              <div style={{ color: '#475569', animation: 'pulse 1s infinite' }}>▋</div>
            )}
          </div>
        </div>
      )}

      {/* ── File changes report ── */}
      {fileChanges.length > 0 && (
        <div className="adm-card" style={{ borderLeft: '3px solid #60a5fa' }}>
          <div className="adm-card__title">📂 Arquivos Modificados ({fileChanges.length})</div>
          <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {fileChanges.map((fc, i) => (
              <div key={i} style={{
                background: '#0f172a',
                borderRadius: 6,
                padding: '6px 12px',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                fontSize: 12,
              }}>
                <span style={{ color: '#4ade80', flexShrink: 0 }}>✅</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ color: '#60a5fa', fontFamily: 'monospace', wordBreak: 'break-all' }}>{fc.file}</span>
                  <span style={{ color: '#475569', fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>→ {fc.dest}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Backups ── */}
      {backups.length > 0 && (
        <div className="adm-card">
          <div className="adm-card__title">🔄 Backups Disponíveis</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {backups.map((b, i) => (
              <div key={i} style={{
                background: '#0f172a',
                borderRadius: 8,
                padding: '8px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 12,
                gap: 12,
                flexWrap: 'wrap',
              }}>
                <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{b.name}</span>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ color: '#475569' }}>{(b.size / 1024 / 1024).toFixed(1)} MB</span>
                  <span style={{ color: '#475569' }}>{new Date(b.date).toLocaleString('pt-BR')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
