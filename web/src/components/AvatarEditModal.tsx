import { useState, useRef } from 'react';

const API = 'http://localhost:3000';

interface Props {
  token: string;
  currentUrl?: string | null;
  onSaved: (url: string) => void;
  onClose: () => void;
}

export function AvatarEditModal({ token, currentUrl, onSaved, onClose }: Props) {
  const [tab, setTab] = useState<'url' | 'file'>('file');
  const [urlInput, setUrlInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError('');
  }

  async function save() {
    setLoading(true); setError('');
    try {
      if (tab === 'url') {
        if (!urlInput.trim()) { setError('Insira uma URL válida'); setLoading(false); return; }
        const res = await fetch(`${API}/social/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ avatarUrl: urlInput.trim() }),
        });
        if (!res.ok) throw new Error((await res.json()).message);
        const data = await res.json();
        onSaved(data.avatarUrl);
      } else {
        if (!file) { setError('Selecione um arquivo'); setLoading(false); return; }
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`${API}/social/profile/avatar`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (!res.ok) throw new Error((await res.json()).message);
        const data = await res.json();
        onSaved(data.avatarUrl);
      }
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#282828', borderRadius: 12, padding: 32, width: 400,
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Foto de perfil</h3>
          <button onClick={onClose} style={{ color: '#b3b3b3', fontSize: 20 }}>✕</button>
        </div>

        {/* Preview */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: 96, height: 96, borderRadius: '50%', overflow: 'hidden',
            background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, fontWeight: 800, color: '#fff',
            border: '3px solid #1db954',
          }}>
            {preview
              ? <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              : '?'
            }
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8 }}>
          {(['file', 'url'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 13, fontWeight: 700,
              background: tab === t ? '#1db954' : '#3a3a3a',
              color: tab === t ? '#000' : '#fff',
            }}>
              {t === 'file' ? '📁 Arquivo local' : '🔗 Link URL'}
            </button>
          ))}
        </div>

        {tab === 'file' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFileChange} />
            <button onClick={() => inputRef.current?.click()} style={{
              background: '#3a3a3a', color: '#fff', borderRadius: 6, padding: '12px 16px',
              fontSize: 14, textAlign: 'left',
            }}>
              {file ? `✅ ${file.name}` : '📂 Selecionar imagem (JPG, PNG, WebP)'}
            </button>
            <p style={{ fontSize: 11, color: '#6a6a6a' }}>Máx. 5 MB · JPG, PNG, WebP, GIF</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              style={{
                background: '#3a3a3a', border: '1px solid #535353', borderRadius: 6,
                padding: '12px 14px', color: '#fff', fontSize: 14, outline: 'none',
              }}
              placeholder="https://exemplo.com/foto.jpg"
              value={urlInput}
              onChange={e => { setUrlInput(e.target.value); setPreview(e.target.value || currentUrl || null); }}
            />
          </div>
        )}

        {error && <div style={{ color: '#f15e6c', fontSize: 13 }}>❌ {error}</div>}

        <button onClick={save} disabled={loading} style={{
          background: '#1db954', color: '#000', borderRadius: 500, padding: '12px 0',
          fontSize: 14, fontWeight: 800, opacity: loading ? 0.6 : 1,
        }}>
          {loading ? 'Salvando...' : 'Salvar foto'}
        </button>
      </div>
    </div>
  );
}
