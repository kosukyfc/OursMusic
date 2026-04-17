import React, { useState, useRef } from 'react';

interface CreatePlaylistModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, coverUrl?: string) => void;
}

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({ open, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'file' | 'url'>('file');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setPreview(result);
      setCoverUrl(result);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = () => {
    if (!name.trim()) {
      setError('Digite um nome para a playlist.');
      return;
    }
    onCreate(name.trim(), coverUrl || undefined);
    setName('');
    setCoverUrl(null);
    setPreview(null);
    setError('');
    onClose();
  };

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: '#181818', borderRadius: 16, padding: 32, minWidth: 380, maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}>
        <h2 style={{ color: '#fff', margin: 0, marginBottom: 20, fontSize: 22, fontWeight: 900 }}>Criar nova playlist</h2>
        
        {/* Preview da capa */}
        {preview && (
          <div style={{
            width: '100%', height: 140, borderRadius: 8, overflow: 'hidden', background: '#282828',
            marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <img src={preview} alt="Capa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        {/* Nome da playlist */}
        <input
          autoFocus
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          placeholder="Nome da playlist"
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 8, border: 'none', background: '#282828', color: '#fff',
            fontSize: 16, marginBottom: 16, outline: 'none', fontWeight: 600, boxSizing: 'border-box'
          }}
          onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
        />

        {/* Abas para foto */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => setTab('file')}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 13, fontWeight: 700,
              background: tab === 'file' ? '#1db954' : '#3a3a3a',
              color: tab === 'file' ? '#000' : '#fff', border: 'none', cursor: 'pointer'
            }}
          >
            📁 Arquivo
          </button>
          <button
            onClick={() => setTab('url')}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 13, fontWeight: 700,
              background: tab === 'url' ? '#1db954' : '#3a3a3a',
              color: tab === 'url' ? '#000' : '#fff', border: 'none', cursor: 'pointer'
            }}
          >
            🔗 URL
          </button>
        </div>

        {/* Seleção de arquivo ou URL */}
        {tab === 'file' ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileSelect}
            />
            <button
              onClick={() => inputRef.current?.click()}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 8, border: '2px dashed #535353',
                background: 'none', color: '#b3b3b3', cursor: 'pointer', fontSize: 14, marginBottom: 12,
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = '#1db954'; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = '#535353'; }}
            >
              {preview ? '✅ Clique para trocar a imagem' : '📂 Clique para selecionar uma imagem'}
            </button>
            <p style={{ fontSize: 11, color: '#6a6a6a', marginTop: -8, marginBottom: 12 }}>Máx. 5 MB · JPG, PNG, WebP</p>
          </>
        ) : (
          <input
            type="text"
            placeholder="https://exemplo.com/capa.jpg"
            value={coverUrl || ''}
            onChange={e => { setCoverUrl(e.target.value || null); setPreview(e.target.value || null); }}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 8, border: 'none', background: '#282828', color: '#fff',
              fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box'
            }}
          />
        )}

        {error && <div style={{ color: '#f55', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, background: 'none', border: '1px solid #535353', color: '#b3b3b3', borderRadius: 8, padding: '10px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
          >Cancelar</button>
          <button
            onClick={handleCreate}
            style={{ flex: 1, background: 'linear-gradient(90deg,#1db954,#1aa34a)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}
          >Criar</button>
        </div>
      </div>
    </div>
  );
};
