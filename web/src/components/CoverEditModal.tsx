import { useState, useRef } from 'react';
import { API_URL as API, EXTRA_HEADERS } from '../config';
import { ImagePositioner } from './ImagePositioner';

interface Props {
  token: string;
  currentUrl?: string | null;
  onSaved: (url: string) => void;
  onClose: () => void;
}

export function CoverEditModal({ token, currentUrl, onSaved, onClose }: Props) {
  const [tab, setTab] = useState<'file' | 'url'>('file');
  const [urlInput, setUrlInput] = useState('');
  const [rawSrc, setRawSrc] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setRawSrc(URL.createObjectURL(f));
    setCroppedBlob(null);
    setError('');
  }

  function onCropConfirm(blob: Blob) {
    setCroppedBlob(blob);
    setPreview(URL.createObjectURL(blob));
    setRawSrc(null);
  }

  async function save() {
    setLoading(true); setError('');
    try {
      if (tab === 'url') {
        if (!urlInput.trim()) { setError('Insira uma URL válida'); setLoading(false); return; }
        const res = await fetch(`${API}/social/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...EXTRA_HEADERS },
          body: JSON.stringify({ coverUrl: urlInput.trim() }),
        });
        if (!res.ok) throw new Error((await res.json()).message);
        onSaved(urlInput.trim());
      } else {
        const blob = croppedBlob;
        if (!blob) { setError('Selecione e ajuste uma imagem'); setLoading(false); return; }

        // Tenta upload multipart no S3 primeiro; se falhar (S3 não configurado em dev),
        // converte para base64 e salva direto no perfil
        let coverUrl: string | null = null;
        try {
          const fd = new FormData();
          fd.append('file', blob, 'cover.jpg');
          const res = await fetch(`${API}/social/profile/avatar`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
            body: fd,
          });
          if (res.ok) {
            const data = await res.json();
            coverUrl = data.avatarUrl;
          }
        } catch { /* S3 indisponível — usa fallback base64 */ }

        if (!coverUrl) {
          // Fallback: converte para base64 e salva como data URL no perfil
          const reader = new FileReader();
          coverUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }

        const res = await fetch(`${API}/social/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...EXTRA_HEADERS },
          credentials: 'include',
          body: JSON.stringify({ coverUrl }),
        });
        if (!res.ok) throw new Error((await res.json()).message ?? 'Erro ao salvar capa');
        onSaved(coverUrl);
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
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 700,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#282828', borderRadius: 12, padding: 28, width: 440,
        display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Foto de capa</h3>
          <button onClick={onClose} style={{ color: '#b3b3b3', fontSize: 20 }}>✕</button>
        </div>

        {rawSrc ? (
          <ImagePositioner
            src={rawSrc}
            aspectRatio={3}
            onConfirm={onCropConfirm}
            onCancel={() => setRawSrc(null)}
          />
        ) : (
          <>
            {/* Preview */}
            {preview && (
              <div style={{ width: '100%', height: 120, borderRadius: 8, overflow: 'hidden', background: '#333' }}>
                <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}

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
                  background: '#3a3a3a', color: '#fff', borderRadius: 6,
                  padding: '12px 16px', fontSize: 14, textAlign: 'left',
                }}>
                  {croppedBlob ? '✅ Imagem ajustada — clique para trocar' : '📂 Selecionar imagem (JPG, PNG, WebP)'}
                </button>
                {croppedBlob && (
                  <button onClick={() => { setCroppedBlob(null); setRawSrc(preview ?? ''); }} style={{
                    background: 'none', color: '#1db954', fontSize: 12, textAlign: 'left',
                  }}>
                    ✏️ Reajustar posição
                  </button>
                )}
                <p style={{ fontSize: 11, color: '#6a6a6a' }}>Máx. 5 MB · JPG, PNG, WebP</p>
              </div>
            ) : (
              <input
                style={{
                  background: '#3a3a3a', border: '1px solid #535353', borderRadius: 6,
                  padding: '12px 14px', color: '#fff', fontSize: 14, outline: 'none',
                }}
                placeholder="https://exemplo.com/capa.jpg"
                value={urlInput}
                onChange={e => { setUrlInput(e.target.value); setPreview(e.target.value || currentUrl || null); }}
              />
            )}

            {error && <div style={{ color: '#f15e6c', fontSize: 13 }}>❌ {error}</div>}

            <button onClick={save} disabled={loading} style={{
              background: '#1db954', color: '#000', borderRadius: 500,
              padding: '12px 0', fontSize: 14, fontWeight: 800, opacity: loading ? 0.6 : 1,
            }}>
              {loading ? 'Salvando...' : 'Salvar capa'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
