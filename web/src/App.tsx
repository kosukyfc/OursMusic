import { useState, useEffect, useRef } from 'react';
import { PremiumAvatar } from './components/PremiumAvatar';
import { AvatarEditModal } from './components/AvatarEditModal';
import { DownloadButton } from './components/DownloadButton';
import { useDownloads } from './hooks/useDownloads';
import { THEMES, applyTheme, loadSavedTheme, type AppTheme } from './theme/themes';
import { LANGUAGES, TRANSLATIONS, loadSavedLang, saveLang, t, type Lang } from './theme/i18n';
import { ConnectButton } from './devices/ConnectButton';
import { useDevices } from './devices/useDevices';
import './index.css';
import { AdminPanel } from './admin/AdminPanel';
import './admin/admin.css';
import { AuthCallback } from './AuthCallback';

const API = 'http://localhost:3000';

interface Song { id: string; title: string; artist?: string; albumName?: string; duration: number; coverUrl?: string; available?: boolean; }
interface User { id: string; email: string; name?: string; isAdmin?: boolean; }
type RepeatMode = 'off' | 'one' | 'all';

async function apiFetch(path: string, token: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
  return res.json();
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function fmt(s: number) { const m = Math.floor(s / 60), sec = Math.floor(s % 60); return `${m}:${sec.toString().padStart(2, '0')}`; }

// ── Custom Slider ─────────────────────────────────────────────────────────────
function Slider({
  value, max, onChange, color = '#1db954', className = '',
}: {
  value: number; max: number; onChange: (v: number) => void; color?: string; className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const active = dragging || hovering;

  function getValueFromEvent(e: MouseEvent | React.MouseEvent | TouchEvent | React.TouchEvent) {
    const track = trackRef.current;
    if (!track) return value;
    const rect = track.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * max;
  }

  function onMouseDown(e: React.MouseEvent) {
    setDragging(true);
    onChange(getValueFromEvent(e));
    const onMove = (ev: MouseEvent) => onChange(getValueFromEvent(ev));
    const onUp = () => { setDragging(false); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function onTouchStart(e: React.TouchEvent) {
    setDragging(true);
    onChange(getValueFromEvent(e));
    const onMove = (ev: TouchEvent) => onChange(getValueFromEvent(ev));
    const onEnd = () => { setDragging(false); window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd); };
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  }

  return (
    <div
      ref={trackRef}
      className={`sp-slider ${className}`}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{ '--slider-pct': `${pct}%`, '--slider-color': color } as any}
      data-active={active}
    >
      <div className="sp-slider__track">
        <div className="sp-slider__fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div
        className="sp-slider__thumb"
        style={{
          left: `${pct}%`,
          background: '#fff',
          opacity: active ? 1 : 0,
          transform: `translate(-50%, -50%) scale(${dragging ? 1.3 : 1})`,
          boxShadow: dragging ? `0 0 12px ${color}88` : '0 2px 6px rgba(0,0,0,.4)',
        }}
      />
    </div>
  );
}

// ── Auth Modal ───────────────────────────────────────────────────────────────
function AuthModal({ onAuth }: { onAuth: (token: string, user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const data = await fetch(`${API}/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
        .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; });
      onAuth(data.access_token, data.user);
    } catch (err: any) { setError(err.message ?? 'Erro ao autenticar'); }
    finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal__title">🎵 Music App</div>
        <div className="modal__sub">{mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta grátis'}</div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group"><label>E-mail</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required /></div>
          <div className="form-group"><label>Senha</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} /></div>
          {error && <div className="error-msg">{error}</div>}
          <button className="btn btn--primary" type="submit" disabled={loading}>{loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}</button>
        </form>
        <div className="modal__divider">ou</div>
        <a className="btn btn--outline" href="http://localhost:3000/auth/google" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, textDecoration: 'none' }}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Entrar com Google
        </a>
        <div className="modal__switch">{mode === 'login' ? <>Não tem conta? <a onClick={() => { setMode('register'); setError(''); }}>Cadastre-se</a></> : <>Já tem conta? <a onClick={() => { setMode('login'); setError(''); }}>Entrar</a></>}</div>
      </div>
    </div>
  );
}

// ── Profile Page ─────────────────────────────────────────────────────────────
function ProfilePage({ user, songs, token, onClose, onPlaySong }: {
  user: User; songs: any[]; token: string; onClose: () => void; onPlaySong: (s: any) => void;
}) {
  const [profile, setProfile] = useState<any>(null);
  const [tab, setTab] = useState<'musicas' | 'seguidores' | 'seguindo'>('musicas');
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', username: '', bio: '', avatarUrl: '', coverUrl: '', isPrivate: false });
  const [saving, setSaving] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    apiFetch(`/social/profile/${user.id}`, token).then(p => {
      setProfile(p);
      setEditForm({ name: p.name ?? '', username: p.username ?? '', bio: p.bio ?? '', avatarUrl: p.avatarUrl ?? '', coverUrl: p.coverUrl ?? '', isPrivate: p.isPrivate ?? false });
    }).catch(() => {});
  }, [user.id, token]);

  async function loadFollowers() {
    const data = await apiFetch(`/social/profile/${user.id}/followers`, token);
    setFollowers(data);
  }
  async function loadFollowing() {
    const data = await apiFetch(`/social/profile/${user.id}/following`, token);
    setFollowing(data);
  }
  async function saveProfile() {
    setSaving(true);
    try {
      const updated = await apiFetch('/social/profile', token, { method: 'POST', body: JSON.stringify(editForm) });
      setProfile((p: any) => ({ ...p, ...updated }));
      setEditing(false);
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  }
  async function doSearch(q: string) {
    setSearchQ(q);
    if (!q.trim()) { setSearchResults([]); return; }
    try {
      const data = await apiFetch(`/social/search?q=${encodeURIComponent(q)}`, token);
      setSearchResults(data);
    } catch { setSearchResults([]); }
  }
  async function toggleFollow(targetId: string, isFollowing: boolean) {
    if (isFollowing) await apiFetch(`/social/follow/${targetId}`, token, { method: 'DELETE' });
    else await apiFetch(`/social/follow/${targetId}`, token, { method: 'POST' });
    setSearchResults(r => r.map(u => u.id === targetId ? { ...u, isFollowing: !isFollowing } : u));
  }

  const coverBg = (editing ? editForm.coverUrl : profile?.coverUrl)
    ? `url(${editing ? editForm.coverUrl : profile?.coverUrl}) center/cover no-repeat`
    : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';

  return (
    <div className="sp-profile-page-overlay">
      <div className="sp-profile-page">
        <div className="sp-profile-page__cover" style={{ background: coverBg }}>
          <button className="sp-profile-page__back" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          </button>
          {editing && (
            <button className="sp-profile-page__edit-cover" onClick={() => { const url = prompt('URL da capa:'); if (url) setEditForm(f => ({ ...f, coverUrl: url })); }}>
              📷 Mudar capa
            </button>
          )}
        </div>

        <div className="sp-profile-page__info-row">
          <div className="sp-profile-page__avatar-wrap">
            <div className="sp-profile-page__avatar" style={(editing ? editForm.avatarUrl : profile?.avatarUrl) ? { backgroundImage: `url(${editing ? editForm.avatarUrl : profile?.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
              {!(editing ? editForm.avatarUrl : profile?.avatarUrl) && user.email[0].toUpperCase()}
            </div>
            {editing && (
              <button className="sp-profile-page__edit-avatar" onClick={() => { const url = prompt('URL do avatar:'); if (url) setEditForm(f => ({ ...f, avatarUrl: url })); }}>📷</button>
            )}
          </div>
          <div className="sp-profile-page__actions">
            <button className="sp-profile-page__edit-btn" onClick={() => setEditing(e => !e)}>
              {editing ? 'Cancelar' : 'Editar perfil'}
            </button>
          </div>
        </div>

        {editing ? (
          <div className="sp-profile-page__edit-form">
            <div className="sp-profile-edit-row"><label>Nome</label><input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Seu nome" /></div>
            <div className="sp-profile-edit-row"><label>@username</label><input value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} placeholder="@username" /></div>
            <div className="sp-profile-edit-row"><label>Bio</label><textarea value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} placeholder="Fale sobre você..." rows={3} /></div>
            <div className="sp-profile-edit-row sp-profile-edit-row--toggle">
              <label>Perfil privado</label>
              <button className={`sp-toggle${editForm.isPrivate ? ' sp-toggle--on' : ''}`} onClick={() => setEditForm(f => ({ ...f, isPrivate: !f.isPrivate }))}>
                <span className="sp-toggle__thumb" />
              </button>
            </div>
            <button className="sp-profile-page__save-btn" onClick={saveProfile} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        ) : (
          <div className="sp-profile-page__meta">
            <div className="sp-profile-page__name">{profile?.name ?? user.email.split('@')[0]}</div>
            {profile?.username && <div className="sp-profile-page__username">@{profile.username}</div>}
            {profile?.bio && <div className="sp-profile-page__bio">{profile.bio}</div>}
            {profile?.isPrivate && <div className="sp-profile-page__private-badge">🔒 Perfil privado</div>}
            <div className="sp-profile-page__stats">
              <button className="sp-profile-stat" onClick={() => { setTab('seguidores'); loadFollowers(); }}>
                <span className="sp-profile-stat__num">{profile?.followersCount ?? 0}</span>
                <span className="sp-profile-stat__label">seguidores</span>
              </button>
              <button className="sp-profile-stat" onClick={() => { setTab('seguindo'); loadFollowing(); }}>
                <span className="sp-profile-stat__num">{profile?.followingCount ?? 0}</span>
                <span className="sp-profile-stat__label">seguindo</span>
              </button>
            </div>
          </div>
        )}

        <div className="sp-profile-page__search-wrap">
          <div className="sp-profile-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#b3b3b3' }}><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <input placeholder="Buscar usuários..." value={searchQ} onChange={e => doSearch(e.target.value)} />
          </div>
          {searchResults.length > 0 && (
            <div className="sp-user-results">
              {searchResults.map(u => (
                <div key={u.id} className="sp-user-card">
                  <div className="sp-user-card__avatar" style={u.avatarUrl ? { backgroundImage: `url(${u.avatarUrl})`, backgroundSize: 'cover' } : {}}>{!u.avatarUrl && (u.name ?? u.email)[0].toUpperCase()}</div>
                  <div className="sp-user-card__info">
                    <div className="sp-user-card__name">{u.name ?? u.email.split('@')[0]}</div>
                    {u.username && <div className="sp-user-card__username">@{u.username}</div>}
                    <div className="sp-user-card__stats">{u.followersCount} seguidores</div>
                  </div>
                  <button className={`sp-user-card__follow${u.isFollowing ? ' sp-user-card__follow--following' : ''}`} onClick={() => toggleFollow(u.id, u.isFollowing)}>
                    {u.isFollowing ? 'Seguindo' : 'Seguir'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sp-profile-page__tabs">
          {(['musicas', 'seguidores', 'seguindo'] as const).map(t => (
            <button key={t} className={`sp-profile-page__tab${tab === t ? ' sp-profile-page__tab--active' : ''}`} onClick={() => { setTab(t); if (t === 'seguidores') loadFollowers(); if (t === 'seguindo') loadFollowing(); }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="sp-profile-page__content">
          {tab === 'musicas' && (
            <div className="sp-song-list">
              {songs.slice(0, 15).map((song, i) => (
                <div key={song.id} className="sp-song-row" onClick={() => song.available !== false && onPlaySong(song)}>
                  <div className="sp-song-row__num">{i + 1}</div>
                  <div className="sp-song-row__play"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
                  <div className="sp-song-row__info"><div className="sp-song-row__title">{song.title}</div><div className="sp-song-row__artist">{song.artist ?? 'Artista desconhecido'}</div></div>
                  <div className="sp-song-row__dur">{Math.floor(song.duration/60)}:{String(song.duration%60).padStart(2,'0')}</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'seguidores' && (
            <div className="sp-user-list">
              {followers.length === 0 ? <div style={{ color: '#b3b3b3', padding: 24 }}>Nenhum seguidor ainda.</div> : followers.map(u => (
                <div key={u.id} className="sp-user-card"><div className="sp-user-card__avatar" style={u.avatarUrl ? { backgroundImage: `url(${u.avatarUrl})`, backgroundSize: 'cover' } : {}}>{!u.avatarUrl && (u.name ?? '?')[0]}</div><div className="sp-user-card__info"><div className="sp-user-card__name">{u.name}</div>{u.username && <div className="sp-user-card__username">@{u.username}</div>}</div></div>
              ))}
            </div>
          )}
          {tab === 'seguindo' && (
            <div className="sp-user-list">
              {following.length === 0 ? <div style={{ color: '#b3b3b3', padding: 24 }}>Não está seguindo ninguém ainda.</div> : following.map(u => (
                <div key={u.id} className="sp-user-card"><div className="sp-user-card__avatar" style={u.avatarUrl ? { backgroundImage: `url(${u.avatarUrl})`, backgroundSize: 'cover' } : {}}>{!u.avatarUrl && (u.name ?? '?')[0]}</div><div className="sp-user-card__info"><div className="sp-user-card__name">{u.name}</div>{u.username && <div className="sp-user-card__username">@{u.username}</div>}</div></div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ── Profile Menu ─────────────────────────────────────────────────────────────
function ProfileMenu({ user, onLogout, onAdmin, onProfile, onClose, currentTheme, currentLang, onThemeChange, onLangChange }: {
  user: User; onLogout: () => void; onAdmin: () => void; onProfile: () => void; onClose: () => void;
  currentTheme: AppTheme; currentLang: Lang;
  onThemeChange: (t: AppTheme) => void; onLangChange: (l: Lang) => void;
}) {
  const [modal, setModal] = useState<'plan' | 'settings' | 'support' | 'about' | null>(null);
  const isPremium = (user as any).plan === 'premium' || (user as any).plan === 'family';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.sp-profile-menu-wrap') && !(e.target as Element).closest('.sp-modal-overlay')) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <>
      <div className="sp-profile-menu">
        {/* Header */}
        <div className="sp-profile-menu__header">
          <div className="sp-profile-menu__avatar" style={(user as any).avatarUrl ? { backgroundImage: `url(${(user as any).avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
            {!(user as any).avatarUrl && user.email[0].toUpperCase()}
          </div>
          <div>
            <div className="sp-profile-menu__name">{user.name ?? user.email.split('@')[0]}</div>
            <div className="sp-profile-menu__email">{user.email}</div>
            {isPremium && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#1db954', borderRadius: 8, padding: '1px 7px', marginTop: 3 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#000' }}>★ {(user as any).plan === 'family' ? 'Family' : 'Premium'}</span>
              </div>
            )}
          </div>
        </div>
        <div className="sp-profile-menu__divider" />

        <button className="sp-profile-menu__item" onClick={() => { onProfile(); onClose(); }}>Perfil</button>
        {user.isAdmin && <button className="sp-profile-menu__item" onClick={() => { onAdmin(); onClose(); }}>Painel Admin</button>}

        {!isPremium && (
          <button className="sp-profile-menu__item" style={{ color: '#1db954', fontWeight: 700 }}
            onClick={() => setModal('plan')}>
            ★ Atualizar plano
          </button>
        )}

        <div className="sp-profile-menu__divider" />
        <button className="sp-profile-menu__item" onClick={() => setModal('settings')}>Configurações</button>
        <button className="sp-profile-menu__item" onClick={() => setModal('support')}>Suporte</button>
        <button className="sp-profile-menu__item" onClick={() => setModal('about')}>Sobre o OursMusic</button>
        <div className="sp-profile-menu__divider" />
        <button className="sp-profile-menu__item" onClick={() => { onLogout(); onClose(); }} style={{ color: '#f15e6c' }}>Sair</button>
      </div>

      {/* Modals */}
      {modal === 'plan' && <PlanModal onClose={() => setModal(null)} />}
      {modal === 'settings' && <SettingsModal user={user} onClose={() => setModal(null)} currentTheme={currentTheme} currentLang={currentLang} onThemeChange={onThemeChange} onLangChange={onLangChange} />}
      {modal === 'support' && <SupportModal onClose={() => setModal(null)} />}
      {modal === 'about' && <AboutModal onClose={() => setModal(null)} />}
    </>
  );
}

// ── Plan Modal ────────────────────────────────────────────────────────────────
function PlanModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="sp-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 32, maxWidth: 440, width: '90%', border: '1px solid #1db954' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>★</div>
          <div style={{ color: '#1db954', fontSize: 22, fontWeight: 900 }}>OursMusic Premium</div>
          <div style={{ color: '#b3b3b3', fontSize: 14, marginTop: 4 }}>Aproveite ao máximo sua música</div>
        </div>
        {[
          ['⬇️', 'Downloads offline', 'Ouça sem internet'],
          ['🎵', 'Qualidade muito alta', 'Audio cristalino'],
          ['🚫', 'Sem anúncios', 'Música sem interrupções'],
          ['📱', 'Todos os dispositivos', 'Web, mobile e TV'],
          ['✈️', 'Modo offline', 'Funciona sem conexão'],
        ].map(([icon, title, sub]) => (
          <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <span style={{ fontSize: 22 }}>{icon}</span>
            <div>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{title}</div>
              <div style={{ color: '#b3b3b3', fontSize: 12 }}>{sub}</div>
            </div>
          </div>
        ))}
        <div style={{ background: '#2a2a2a', borderRadius: 8, padding: 12, marginTop: 8, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
          O Premium é concedido pelo administrador da plataforma.
        </div>
        <button onClick={onClose} style={{ width: '100%', marginTop: 16, background: '#1db954', color: '#000', border: 'none', borderRadius: 500, padding: '12px 0', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
          Entendido
        </button>
      </div>
    </div>
  );
}

// ── Settings Modal ────────────────────────────────────────────────────────────
function SettingsModal({ user, onClose, currentTheme, currentLang, onThemeChange, onLangChange }: {
  user: User; onClose: () => void;
  currentTheme: AppTheme; currentLang: Lang;
  onThemeChange: (t: AppTheme) => void; onLangChange: (l: Lang) => void;
}) {
  const [audioQuality, setAudioQuality] = useState('Alta');
  const [notifs, setNotifs] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(currentTheme.id);
  const [selectedLang, setSelectedLang] = useState(currentLang);
  const [saved, setSaved] = useState(false);

  function save() {
    const theme = THEMES.find(t => t.id === selectedTheme)!;
    onThemeChange(theme);
    onLangChange(selectedLang);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="sp-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1a1a1a', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px', borderBottom: '1px solid #2a2a2a', flexShrink: 0 }}>
          <span style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>Configurações</span>
          <button onClick={onClose} style={{ color: '#b3b3b3', fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 24px' }}>
          <_SettingSection title="Conta">
            <_SettingRow label="Email" value={user.email} />
            <_SettingRow label="Plano" value={(user as any).plan ?? 'free'} />
          </_SettingSection>

          <_SettingSection title="Áudio">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid #2a2a2a' }}>
              <span style={{ color: '#fff', fontSize: 14 }}>Qualidade de streaming</span>
              <select value={audioQuality} onChange={e => setAudioQuality(e.target.value)}
                style={{ background: '#3a3a3a', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 13, cursor: 'pointer' }}>
                {['Automática', 'Baixa', 'Normal', 'Alta', 'Muito alta'].map(q => <option key={q}>{q}</option>)}
              </select>
            </div>
          </_SettingSection>

          <_SettingSection title="Privacidade">
            <_SettingToggle label="Perfil privado" value={privateProfile} onChange={setPrivateProfile} />
            <_SettingToggle label="Notificações" value={notifs} onChange={setNotifs} />
          </_SettingSection>

          {/* Theme picker */}
          <_SettingSection title="Aparência — Tema">
            <div style={{ padding: '12px 14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {THEMES.map(theme => (
                  <button key={theme.id} onClick={() => setSelectedTheme(theme.id)} style={{
                    background: theme.bgBase,
                    border: selectedTheme === theme.id ? `2px solid ${theme.accent}` : '2px solid #3a3a3a',
                    borderRadius: 8, padding: '8px 4px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    transition: 'border-color 0.15s',
                  }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: theme.accent, boxShadow: selectedTheme === theme.id ? `0 0 8px ${theme.accent}` : 'none' }} />
                    <span style={{ color: theme.textPrimary, fontSize: 10, fontWeight: 600 }}>{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </_SettingSection>

          {/* Language picker */}
          <_SettingSection title="Idioma">
            <div style={{ padding: '4px 0' }}>
              {LANGUAGES.map(lang => (
                <button key={lang.id} onClick={() => setSelectedLang(lang.id)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: '1px solid #2a2a2a',
                  color: selectedLang === lang.id ? '#1db954' : '#fff',
                }}>
                  <span style={{ fontSize: 20 }}>{lang.flag}</span>
                  <span style={{ fontSize: 14, fontWeight: selectedLang === lang.id ? 700 : 400 }}>{lang.name}</span>
                  {selectedLang === lang.id && <span style={{ marginLeft: 'auto', color: '#1db954' }}>✓</span>}
                </button>
              ))}
            </div>
          </_SettingSection>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #2a2a2a', flexShrink: 0, display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, background: '#2a2a2a', color: '#fff', border: 'none',
            borderRadius: 500, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>
            Cancelar
          </button>
          <button onClick={save} style={{
            flex: 2, background: saved ? '#0d7a3a' : '#1db954', color: '#000', border: 'none',
            borderRadius: 500, padding: '12px 0', fontSize: 14, fontWeight: 800, cursor: 'pointer',
            transition: 'background 0.2s',
          }}>
            {saved ? '✓ Salvo!' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}

function _SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ color: '#6a6a6a', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{title}</div>
      <div style={{ background: '#242424', borderRadius: 8, overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

function _SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #2a2a2a' }}>
      <span style={{ color: '#b3b3b3', fontSize: 14 }}>{label}</span>
      <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function _SettingToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #2a2a2a' }}>
      <span style={{ color: '#fff', fontSize: 14 }}>{label}</span>
      <div onClick={() => onChange(!value)} style={{
        width: 40, height: 22, borderRadius: 11, background: value ? '#1db954' : '#535353',
        cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: 3, left: value ? 20 : 3, width: 16, height: 16,
          borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
        }} />
      </div>
    </div>
  );
}

// ── Support Modal ─────────────────────────────────────────────────────────────
function SupportModal({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState<number | null>(null);
  const [reportText, setReportText] = useState('');
  const [reportSent, setReportSent] = useState(false);

  const faqs = [
    ['Como baixar músicas?', 'Usuários Premium podem baixar tocando no ícone de download em qualquer música ou playlist.'],
    ['Como funciona o Premium?', 'O Premium é concedido pelo administrador. Inclui downloads offline, qualidade alta e modo offline.'],
    ['Não consigo ouvir uma música', 'Verifique sua conexão. Se o problema persistir, use o formulário de reporte abaixo.'],
    ['Como mudar minha foto de perfil?', 'Clique no seu avatar no canto superior direito e selecione "Perfil" para editar.'],
    ['Como funciona o modo offline?', 'Com Premium, baixe músicas e ouça sem internet. Os downloads expiram em 30 dias.'],
  ];

  return (
    <div className="sp-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 32, maxWidth: 520, width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <span style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>Suporte</span>
          <button onClick={onClose} style={{ color: '#b3b3b3', fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ color: '#6a6a6a', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Perguntas frequentes</div>
        {faqs.map(([q, a], i) => (
          <div key={i} style={{ background: '#242424', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
            <button onClick={() => setOpen(open === i ? null : i)} style={{
              width: '100%', textAlign: 'left', padding: '14px 16px', background: 'none', border: 'none',
              color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
            }}>
              {q} <span style={{ color: '#1db954' }}>{open === i ? '▲' : '▼'}</span>
            </button>
            {open === i && <div style={{ padding: '0 16px 14px', color: '#b3b3b3', fontSize: 13, lineHeight: 1.6 }}>{a}</div>}
          </div>
        ))}

        <div style={{ color: '#6a6a6a', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', margin: '20px 0 12px' }}>Reportar problema</div>
        {reportSent ? (
          <div style={{ background: '#0d3b1e', border: '1px solid #1db954', borderRadius: 8, padding: 16, textAlign: 'center', color: '#1db954', fontWeight: 700 }}>
            ✅ Relatório enviado! Obrigado pelo feedback.
          </div>
        ) : (
          <>
            <textarea value={reportText} onChange={e => setReportText(e.target.value)}
              placeholder="Descreva o problema..."
              style={{ width: '100%', background: '#2a2a2a', border: 'none', borderRadius: 8, padding: 12, color: '#fff', fontSize: 13, resize: 'vertical', minHeight: 80, outline: 'none', boxSizing: 'border-box' }} />
            <button onClick={() => { if (reportText.trim()) setReportSent(true); }}
              style={{ marginTop: 10, background: '#1db954', color: '#000', border: 'none', borderRadius: 500, padding: '10px 24px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
              Enviar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── About Modal ───────────────────────────────────────────────────────────────
function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="sp-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 32, maxWidth: 380, width: '90%', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#1db954', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="black"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <div style={{ color: '#fff', fontSize: 24, fontWeight: 900, marginBottom: 4 }}>OursMusic</div>
        <div style={{ color: '#1db954', fontSize: 13, marginBottom: 16 }}>Versão 1.0.1</div>
        <div style={{ color: '#b3b3b3', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          Sua música, do seu jeito.<br />Streaming de alta qualidade para todos os seus dispositivos.
        </div>
        <div style={{ background: '#242424', borderRadius: 8, padding: 12, fontSize: 12, color: '#6a6a6a', marginBottom: 20 }}>
          Desenvolvido com React, Flutter & NestJS
        </div>
        <button onClick={onClose} style={{ background: '#2a2a2a', color: '#fff', border: 'none', borderRadius: 500, padding: '10px 32px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Fechar
        </button>
      </div>
    </div>
  );
}

// ── Lyrics Panel ─────────────────────────────────────────────────────────────
function LyricsOverlay({ song, onClose }: { song: { title: string; artist?: string } | null; onClose: () => void }) {
  if (!song) return null;
  return (
    <div className="sp-lyrics-overlay">
      <div className="sp-lyrics-overlay__header">
        <span style={{ fontWeight: 700, fontSize: 16 }}>Letra</span>
        <button onClick={onClose} style={{ color: '#b3b3b3', fontSize: 20 }}>✕</button>
      </div>
      <div className="sp-lyrics-overlay__content">
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{song.title}</div>
        <div style={{ fontSize: 14, color: '#b3b3b3', marginBottom: 32 }}>{song.artist}</div>
        <div style={{ color: '#b3b3b3', fontSize: 15, lineHeight: 2 }}>Letra não disponível para esta faixa.</div>
      </div>
    </div>
  );
}

// ── Mini Player ───────────────────────────────────────────────────────────────
function MiniPlayer({ song, playing, onPlay, onClose }: { song: { title: string; artist?: string; coverUrl?: string } | null; playing: boolean; onPlay: () => void; onClose: () => void; }) {
  const [pos, setPos] = useState({ x: window.innerWidth - 340, y: window.innerHeight - 180 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  function onMouseDown(e: React.MouseEvent) {
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 320, e.clientX - offset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 80, e.clientY - offset.current.y)),
      });
    }
    function onMouseUp() { dragging.current = false; }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, []);

  if (!song) return null;
  return (
    <div
      className="sp-floating-player"
      style={{ left: pos.x, top: pos.y, cursor: dragging.current ? 'grabbing' : 'grab' }}
      onMouseDown={onMouseDown}
    >
      <div className="sp-floating-player__cover">
        {song.coverUrl ? <img src={song.coverUrl} alt={song.title} /> : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#b3b3b3' }}><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>}
      </div>
      <div className="sp-floating-player__info">
        <div className="sp-floating-player__title">{song.title}</div>
        <div className="sp-floating-player__artist">{song.artist}</div>
      </div>
      <button className="sp-floating-player__play" onClick={e => { e.stopPropagation(); onPlay(); }} onMouseDown={e => e.stopPropagation()}>
        {playing ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
      </button>
      <button onClick={e => { e.stopPropagation(); onClose(); }} onMouseDown={e => e.stopPropagation()} style={{ color: '#b3b3b3', padding: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>✕</button>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') ?? '');
  const [user, setUser] = useState<User | null>(() => { const u = localStorage.getItem('user'); return u ? JSON.parse(u) : null; });
  const [adminMode, setAdminMode] = useState(() => sessionStorage.getItem('adminMode') === 'true');
  const [songs, setSongs] = useState<Song[]>([]);
  const [favorites, setFavorites] = useState<Song[]>([]);
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [streamUrl, setStreamUrl] = useState('');
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [shuffled, setShuffled] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Song[] | null>(null);
  const [tab, setTab] = useState<'tudo' | 'musicas'>('tudo');
  // New UI states
  const [showProfile, setShowProfile] = useState(false);
  const [showProfilePage, setShowProfilePage] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showMini, setShowMini] = useState(false);
  const [showAvatarEdit, setShowAvatarEdit] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(() => loadSavedTheme());
  const [currentLang, setCurrentLang] = useState<Lang>(() => loadSavedLang());
  const isPremium = (user as any)?.plan === 'premium' || (user as any)?.plan === 'family';
  const { downloadSong, getStatus } = useDownloads(token, isPremium);
  const [premiumPopup, setPremiumPopup] = useState<{ message: string; durationLabel: string; expiresAt: string | null } | null>(null);
  // Translation helper — re-evaluates when lang changes
  const tr = (key: string) => {
    const map = TRANSLATIONS[currentLang] ?? TRANSLATIONS['pt'];
    return map[key] ?? TRANSLATIONS['pt'][key] ?? key;
  };
  const { devices, connected, sendCommand, transferTo } = useDevices({
    token: token,
    onPlaybackSync: (event) => {
      if (event.action === 'pause') setPlaying(false);
    },
    onPremiumGranted: (data: any) => {
      setPremiumPopup(data);
      setUser(u => u ? { ...u, plan: data.plan } as any : u);
      localStorage.setItem('user', JSON.stringify({ ...user, plan: data.plan }));
    },
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [showNotif, setShowNotif] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const nextAudioRef = useRef<HTMLAudioElement>(null);
  const current = queue[currentIdx] ?? null;

  // PWA install prompt
  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setPwaPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function installApp() {
    if (pwaPrompt) { pwaPrompt.prompt(); pwaPrompt.userChoice.then(() => setPwaPrompt(null)); }
    else { addNotification('Para instalar: use o menu do navegador → "Instalar aplicativo"'); }
  }

  function addNotification(msg: string) {
    setNotifications(n => [msg, ...n.slice(0, 9)]);
    setShowNotif(true);
  }

  function onAuth(t: string, u: User) { setToken(t); setUser(u); localStorage.setItem('token', t); localStorage.setItem('user', JSON.stringify(u)); }
  function logout() { setToken(''); setUser(null); localStorage.clear(); sessionStorage.removeItem('adminMode'); setPlaying(false); setStreamUrl(''); setAdminMode(false); }
  function enterAdmin() { sessionStorage.setItem('adminMode', 'true'); setAdminMode(true); }
  function exitAdmin() { sessionStorage.removeItem('adminMode'); setAdminMode(false); }

  useEffect(() => {
    if (!token) return;
    apiFetch('/songs', token).then(setSongs).catch(() => {});
    apiFetch('/favorites', token).then((data: any[]) => setFavorites(data.map(f => f.song))).catch(() => {});
  }, [token]);

  async function playSong(song: Song, list?: Song[]) {
    if (!token) return;
    try {
      const data = await apiFetch(`/songs/stream/${song.id}`, token);
      const newQueue = list ?? songs;
      const idx = newQueue.findIndex(s => s.id === song.id);
      setQueue(newQueue); setCurrentIdx(idx >= 0 ? idx : 0);
      setStreamUrl(data.url); setPlaying(true);
    } catch (e: any) { console.warn('Stream error:', e.message); }
  }

  useEffect(() => { const a = audioRef.current; if (!a || !streamUrl) return; a.src = streamUrl; a.play().catch(() => {}); }, [streamUrl]);
  useEffect(() => { const a = audioRef.current; if (!a) return; playing ? a.play().catch(() => {}) : a.pause(); }, [playing]);
  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  function handleTimeUpdate() {
    const a = audioRef.current; if (!a) return;
    setCurrentTime(a.currentTime);
    const next = queue[currentIdx + 1];
    if (next && a.duration && a.currentTime >= a.duration - 30) {
      const na = nextAudioRef.current;
      if (na && !na.src) apiFetch(`/songs/stream/${next.id}`, token).then(d => { if (na && d?.url) na.src = d.url; }).catch(() => {});
    }
  }

  function handleEnded() {
    if (repeatMode === 'one') { audioRef.current?.play(); return; }
    if (currentIdx < queue.length - 1) {
      const next = queue[currentIdx + 1]; const na = nextAudioRef.current;
      if (na?.src && audioRef.current) { audioRef.current.src = na.src; na.src = ''; setStreamUrl(audioRef.current.src); audioRef.current.play().catch(() => {}); setCurrentIdx(i => i + 1); }
      else playSong(next, queue).then(() => setCurrentIdx(i => i + 1));
    } else if (repeatMode === 'all' && queue.length > 0) { playSong(queue[0], queue).then(() => setCurrentIdx(0)); }
    else setPlaying(false);
  }

  function toggleShuffle() { if (!shuffled) { const cur = queue[currentIdx]; const rest = shuffle(queue.filter((_, i) => i !== currentIdx)); setQueue([cur, ...rest]); setCurrentIdx(0); } setShuffled(s => !s); }
  function cycleRepeat() { setRepeatMode(m => m === 'off' ? 'one' : m === 'one' ? 'all' : 'off'); }
  async function doSearch(q: string) { if (!q.trim()) { setSearchResults(null); return; } try { const d = await apiFetch(`/search?q=${encodeURIComponent(q)}`, token); setSearchResults(d.songs ?? []); } catch { setSearchResults([]); } }

  function toggleFullscreen() {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {}); }
    else { document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {}); }
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const [accentColor, setAccentColor] = useState('18,18,18');
  const displaySongs = searchResults ?? songs;

  // Extract dominant color from album art
  useEffect(() => {
    if (!current?.coverUrl) { setAccentColor('18,18,18'); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = current.coverUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 50; canvas.height = 50;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, 50, 50);
      const data = ctx.getImageData(0, 0, 50, 50).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 16) {
        r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
      }
      r = Math.floor(r / count); g = Math.floor(g / count); b = Math.floor(b / count);
      // Darken to keep it subtle like Spotify
      r = Math.floor(r * 0.6); g = Math.floor(g * 0.6); b = Math.floor(b * 0.6);
      setAccentColor(`${r},${g},${b}`);
    };
    img.onerror = () => setAccentColor('18,18,18');
  }, [current?.id]);

  if (!token || !user) {
    if (window.location.pathname === '/auth/callback') return <AuthCallback onAuth={onAuth} />;
    return <AuthModal onAuth={onAuth} />;
  }
  if (adminMode && user.isAdmin) return <AdminPanel token={token} userEmail={user.email} onExit={exitAdmin} />;

  return (
    <div className="sp-root">
      {/* HEADER */}
      <header className="sp-header">
        <div className="sp-header__logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#1db954"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
          Music App
        </div>

        {/* CENTER: nav + search */}
        <div className="sp-header__center">
          <div className="sp-header__nav">
            <button className="sp-header__nav-btn" title="Voltar" onClick={() => window.history.back()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
            <button className="sp-header__nav-btn" title="Avançar" onClick={() => window.history.forward()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
            </button>
          </div>
          <div className="sp-header__search-wrap">
            <button className="sp-header__home-btn" title="Início" onClick={() => { setSearch(''); setSearchResults(null); setTab('tudo'); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            </button>
            <div className="sp-header__search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#b3b3b3', flexShrink: 0 }}><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
              <input placeholder="O que você quer ouvir?" value={search} onChange={e => { setSearch(e.target.value); doSearch(e.target.value); }} />
              {search && <button onClick={() => { setSearch(''); setSearchResults(null); }} style={{ color: '#b3b3b3' }}>✕</button>}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="sp-header__right">
          <button className="sp-header__icon-btn" onClick={installApp} title="Instalar aplicativo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
          </button>
          <div style={{ position: 'relative' }}>
            <button className="sp-header__icon-btn" onClick={() => setShowNotif(n => !n)} title="Notificações">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
              {notifications.length > 0 && <span className="sp-notif-badge">{notifications.length}</span>}
            </button>
            {showNotif && (
              <div className="sp-notif-panel">
                <div className="sp-notif-panel__header">
                  <span>Notificações</span>
                  <button onClick={() => { setNotifications([]); setShowNotif(false); }} style={{ color: '#b3b3b3', fontSize: 12 }}>Limpar</button>
                </div>
                {notifications.length === 0
                  ? <div style={{ padding: '20px 16px', color: '#b3b3b3', fontSize: 13 }}>Nenhuma notificação</div>
                  : notifications.map((n, i) => <div key={i} className="sp-notif-item">{n}</div>)}
              </div>
            )}
          </div>
          <button className="sp-header__icon-btn" title="Atividade de amigos">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
          </button>
          <div className="sp-profile-menu-wrap" style={{ position: 'relative' }}>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
              onClick={() => setShowProfile(p => !p)}
            >
              <PremiumAvatar
                avatarUrl={(user as any).avatarUrl}
                name={user.name ?? user.email}
                plan={(user as any).plan ?? 'free'}
                playing={playing}
                size={28}
                onClick={() => setShowAvatarEdit(true)}
              />
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#b3b3b3' }}><path d="M7 10l5 5 5-5z"/></svg>
            </button>
            {showProfile && <ProfileMenu user={user} onLogout={logout} onAdmin={enterAdmin} onProfile={() => setShowProfilePage(true)} onClose={() => setShowProfile(false)}
              currentTheme={currentTheme} currentLang={currentLang}
              onThemeChange={theme => { setCurrentTheme(theme); applyTheme(theme); }}
              onLangChange={lang => { setCurrentLang(lang); saveLang(lang); }}
            />}
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="sp-body">
        <aside className="sp-sidebar">
          <div className="sp-sidebar__header">
            <div className="sp-sidebar__title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 5h-3v5.5a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1 2.5-2.5c.57 0 1.08.19 1.5.5V5h4v2zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z"/></svg>
              {tr('library')}
            </div>
            <button className="sp-sidebar__create"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg> Criar</button>
          </div>
          <div className="sp-sidebar__list">
            {favorites.length === 0 ? (
              <>
                <div className="sp-sidebar__promo"><div className="sp-sidebar__promo-title">Crie sua primeira playlist</div><div className="sp-sidebar__promo-sub">É fácil, vamos te ajudar.</div><button className="sp-sidebar__promo-btn">Criar playlist</button></div>
                <div className="sp-sidebar__promo" style={{ marginTop: 8 }}><div className="sp-sidebar__promo-title">Músicas curtidas</div><div className="sp-sidebar__promo-sub">Salve músicas que você gosta.</div><button className="sp-sidebar__promo-btn">Explorar músicas</button></div>
              </>
            ) : (
              <>
                <div className="sp-sidebar__item sp-sidebar__item--active">
                  <div className="sp-sidebar__item-art" style={{ background: 'linear-gradient(135deg,#450af5,#c4efd9)' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></div>
                  <div className="sp-sidebar__item-info"><div className="sp-sidebar__item-name sp-sidebar__item-name--active">{tr('likedSongs')}</div><div className="sp-sidebar__item-sub">Playlist · {favorites.length} músicas</div></div>
                </div>
                {favorites.slice(0, 20).map(song => (
                  <div key={song.id} className={`sp-sidebar__item${current?.id === song.id ? ' sp-sidebar__item--active' : ''}`} onClick={() => song.available !== false && playSong(song, favorites)}>
                    <div className="sp-sidebar__item-art">{song.coverUrl ? <img src={song.coverUrl} alt={song.title} /> : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#b3b3b3' }}><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>}</div>
                    <div className="sp-sidebar__item-info"><div className={`sp-sidebar__item-name${current?.id === song.id ? ' sp-sidebar__item-name--active' : ''}`}>{song.title}</div><div className="sp-sidebar__item-sub">{song.artist ?? 'Artista desconhecido'}</div></div>
                  </div>
                ))}
              </>
            )}
          </div>
        </aside>

        <main className="sp-main" style={{ background: `linear-gradient(180deg, rgb(${accentColor}) 0%, #121212 340px)` }}>
          <div className="sp-main__tabs">
            <button className={`sp-main__tab${tab === 'tudo' && !search ? ' sp-main__tab--active' : ''}`} onClick={() => { setTab('tudo'); setSearch(''); setSearchResults(null); }}>{tr('home')}</button>
            <button className={`sp-main__tab${tab === 'musicas' && !search ? ' sp-main__tab--active' : ''}`} onClick={() => { setTab('musicas'); setSearch(''); setSearchResults(null); }}>{tr('search')}</button>
          </div>
          <div className="sp-main__content">
            {search || searchResults ? (
              <div className="sp-section">
                <div className="sp-section__header"><div className="sp-section__title">{search ? `Resultados para "${search}"` : 'Todas as músicas'}</div></div>
                {displaySongs.length === 0 ? <div className="sp-empty"><div className="sp-empty__icon">🔍</div><div className="sp-empty__title">Nenhum resultado</div></div> : (
                  <div className="sp-song-list">
                    {displaySongs.map((song, i) => (
                      <div key={song.id} className="sp-song-row" onClick={() => song.available !== false && playSong(song, displaySongs)} style={{ opacity: song.available === false ? 0.5 : 1, cursor: song.available === false ? 'default' : 'pointer' }}>
                        <div className="sp-song-row__num">{current?.id === song.id ? <span style={{ color: 'var(--accent)' }}>♪</span> : i + 1}</div>
                        <div className="sp-song-row__play"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
                        <div className="sp-song-row__info"><div className={`sp-song-row__title${current?.id === song.id ? ' sp-song-row__title--active' : ''}`}>{song.title}</div><div className="sp-song-row__artist">{song.artist ?? 'Artista desconhecido'}{song.albumName ? ` · ${song.albumName}` : ''}</div></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <DownloadButton status={getStatus(song.id)} onClick={e => { e.stopPropagation(); downloadSong(song.id); }} />
                          <span className="sp-song-row__dur">{fmt(song.duration)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : songs.length === 0 ? (
              <div className="sp-empty"><div className="sp-empty__icon">🎵</div><div className="sp-empty__title">{tr('noSongs')}</div><div style={{ color: '#b3b3b3' }}>{user.isAdmin ? <a style={{ color: '#1db954', cursor: 'pointer' }} onClick={enterAdmin}>Faça upload pelo painel admin →</a> : 'Aguarde o admin adicionar músicas'}</div></div>
            ) : (
              <>
                <div className="sp-main__greeting">{new Date().getHours() < 12 ? tr('goodMorning') : new Date().getHours() < 18 ? tr('goodAfternoon') : tr('goodEvening')}</div>
                <div className="sp-quick-grid">
                  {songs.slice(0, 6).map(song => (
                    <div key={song.id} className="sp-quick-item" onClick={() => song.available !== false && playSong(song, songs)}>
                      <div className="sp-quick-item__art">{song.coverUrl ? <img src={song.coverUrl} alt={song.title} /> : <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#b3b3b3' }}><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>}</div>
                      <div className="sp-quick-item__title">{song.title}</div>
                      {song.available !== false && <button className="sp-quick-item__play" onClick={e => { e.stopPropagation(); playSong(song, songs); }}><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>}
                    </div>
                  ))}
                </div>
                <div className="sp-section">
                  <div className="sp-section__header"><div className="sp-section__title">{tr('allSongs')}</div><a className="sp-section__see-all">{tr('browseAll')}</a></div>
                  <div className="sp-cards">
                    {songs.map(song => (
                      <div key={song.id} className="sp-card" onClick={() => song.available !== false && playSong(song, songs)} style={{ opacity: song.available === false ? 0.7 : 1 }}>
                        <div className="sp-card__art">
                          {song.coverUrl ? <img src={song.coverUrl} alt={song.title} /> : <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#535353' }}><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>}
                          {song.available !== false ? <button className="sp-card__play" onClick={e => { e.stopPropagation(); playSong(song, songs); }}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button> : <div style={{ position: 'absolute', bottom: 8, right: 8, background: '#f59e0b', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontWeight: 700, color: '#000' }}>EM BREVE</div>}
                          {song.available !== false && (
                            <div style={{ position: 'absolute', bottom: 8, left: 8 }} onClick={e => e.stopPropagation()}>
                              <DownloadButton status={getStatus(song.id)} onClick={e => { e.stopPropagation(); downloadSong(song.id); }} size={18} />
                            </div>
                          )}
                        </div>
                        <div className="sp-card__title">{song.title}</div>
                        <div className="sp-card__sub">{song.artist ?? 'Artista desconhecido'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* QUEUE */}
      <div className={`sp-queue${showQueue ? ' sp-queue--open' : ''}`}>
        <div className="sp-queue__header">Fila de reprodução</div>
        <div className="sp-queue__list">
          {queue.map((song, i) => (
            <div key={`${song.id}-${i}`} className={`sp-queue-item${i === currentIdx ? ' sp-queue-item--active' : ''}`} onClick={() => playSong(song, queue).then(() => setCurrentIdx(i))}>
              <div className="sp-queue-item__art">{song.coverUrl ? <img src={song.coverUrl} alt={song.title} /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#b3b3b3' }}><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>}</div>
              <div className="sp-queue-item__info"><div className="sp-queue-item__title">{song.title}</div><div className="sp-queue-item__artist">{song.artist ?? '—'}</div></div>
              <button className="sp-queue-item__remove" onClick={e => { e.stopPropagation(); setQueue(q => q.filter((_, j) => j !== i)); }} disabled={i === currentIdx}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* LYRICS OVERLAY */}
      {showLyrics && <LyricsOverlay song={current} onClose={() => setShowLyrics(false)} />}

      {/* PROFILE PAGE */}
      {showProfilePage && (
        <div className="sp-profile-page-overlay">
          <ProfilePage user={user} songs={songs} token={token} onClose={() => setShowProfilePage(false)} onPlaySong={s => playSong(s, songs)} />
        </div>
      )}

      {/* PREMIUM POPUP */}
      {premiumPopup && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setPremiumPopup(null)}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e, #0d3b1e)',
            border: '1px solid #1db954',
            borderRadius: 16, padding: 40, maxWidth: 420, width: '90%',
            textAlign: 'center', boxShadow: '0 0 60px rgba(29,185,84,.3)',
            animation: 'fadeIn 0.3s ease',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1db954', marginBottom: 8 }}>
              Você é Premium!
            </div>
            <div style={{ fontSize: 15, color: '#fff', marginBottom: 8 }}>
              {premiumPopup.message}
            </div>
            {premiumPopup.expiresAt && (
              <div style={{ fontSize: 13, color: '#b3b3b3', marginBottom: 4 }}>
                Válido até: {new Date(premiumPopup.expiresAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
            )}
            {!premiumPopup.expiresAt && (
              <div style={{ fontSize: 13, color: '#1db954', fontWeight: 700, marginBottom: 4 }}>
                ♾️ Acesso ilimitado
              </div>
            )}
            <div style={{ fontSize: 12, color: '#6a6a6a', marginBottom: 24 }}>
              Downloads offline, qualidade alta e muito mais
            </div>
            <button onClick={() => setPremiumPopup(null)} style={{
              background: '#1db954', color: '#000', border: 'none',
              borderRadius: 500, padding: '12px 32px', fontSize: 14,
              fontWeight: 800, cursor: 'pointer',
            }}>
              Aproveitar agora ✨
            </button>
          </div>
        </div>
      )}

      {/* AVATAR EDIT MODAL */}
      {showAvatarEdit && (
        <AvatarEditModal
          token={token}
          currentUrl={(user as any).avatarUrl}
          onSaved={url => {
            setUser(u => u ? { ...u, avatarUrl: url } as any : u);
            localStorage.setItem('user', JSON.stringify({ ...user, avatarUrl: url }));
          }}
          onClose={() => setShowAvatarEdit(false)}
        />
      )}

      {/* MINI PLAYER — flutuante e arrastável, só aparece quando o usuário ativa */}
      {showMini && current && <MiniPlayer song={current} playing={playing} onPlay={() => setPlaying(p => !p)} onClose={() => setShowMini(false)} />}

      {/* PLAYER */}
      <footer className="sp-player">
        {/* LEFT: track info */}
        <div className="sp-player__track">
          <div className="sp-player__cover">
            {current?.coverUrl ? <img src={current.coverUrl} alt={current.title} /> : current ? <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#b3b3b3' }}><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg> : null}
          </div>
          {current && (
            <>
              <div className="sp-player__info">
                <div className={`sp-player__title${playing ? ' sp-player__title--active' : ''}`}>{current.title}</div>
                <div className="sp-player__artist">{current.artist ?? 'Artista desconhecido'}{current.albumName ? ` · ${current.albumName}` : ''}</div>
              </div>
              <button className="sp-player__like" title="Curtir"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>
            </>
          )}
        </div>

        {/* CENTER: controls + progress */}
        <div className="sp-player__center">
          <div className="sp-player__controls">
            <button className={`sp-player__btn${shuffled ? ' sp-player__btn--active' : ''}`} onClick={toggleShuffle} title="Aleatório"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg></button>
            <button className="sp-player__btn" onClick={() => { if (currentIdx > 0) playSong(queue[currentIdx - 1], queue).then(() => setCurrentIdx(i => i - 1)); }}><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg></button>
            <button className="sp-player__play" onClick={() => setPlaying(p => !p)}>
              {playing ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
            </button>
            <button className="sp-player__btn" onClick={() => { if (currentIdx < queue.length - 1) playSong(queue[currentIdx + 1], queue).then(() => setCurrentIdx(i => i + 1)); }}><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg></button>
            <button className={`sp-player__btn${repeatMode !== 'off' ? ' sp-player__btn--active' : ''}`} onClick={cycleRepeat}>
              {repeatMode === 'one' ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>}
            </button>
          </div>
          <div className="sp-player__progress">
            <span className="sp-player__time">{fmt(currentTime)}</span>
            <Slider value={currentTime} max={duration || 0} onChange={v => { if (audioRef.current) audioRef.current.currentTime = v; setCurrentTime(v); }} color="#1db954" className="sp-slider--seek" />
            <span className="sp-player__time">{fmt(duration)}</span>
          </div>
        </div>

        {/* RIGHT: extra controls */}
        <div className="sp-player__right">
          <button className="sp-player__btn" title="Letra" onClick={() => setShowLyrics(l => !l)} style={{ color: showLyrics ? '#1db954' : undefined }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
          </button>
          <button className="sp-player__btn" title="Microfone / Karaokê">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
          </button>
          <ConnectButton devices={devices} connected={connected} onTransfer={transferTo} />
          <button className="sp-player__btn" title="Volume"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg></button>
          <Slider value={volume} max={1} onChange={v => setVolume(v)} color="#1db954" className="sp-slider--vol" />
          <button className={`sp-player__btn${showQueue ? ' sp-player__btn--active' : ''}`} onClick={() => setShowQueue(q => !q)} title="Fila">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>
          </button>
          <button className="sp-player__btn" title="Mini player" onClick={() => setShowMini(m => !m)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.99 2 1.99h18c1.1 0 2-.89 2-1.99V5c0-1.1-.9-2-2-2zm0 16.01H3V4.99h18v14.02z"/></svg>
          </button>
          <button className="sp-player__btn" title={isFullscreen ? 'Sair do fullscreen' : 'Fullscreen'} onClick={toggleFullscreen}>
            {isFullscreen
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>}
          </button>
        </div>
      </footer>

      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)} onEnded={handleEnded} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
      <audio ref={nextAudioRef} preload="auto" aria-hidden="true" />
    </div>
  );
}
