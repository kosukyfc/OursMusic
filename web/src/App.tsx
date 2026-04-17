import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
// LyricsOverlay: garante efeito premium só no overlay de letras
function LyricsOverlay({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.classList.add('lyrics-premium-active');
    return () => { document.body.classList.remove('lyrics-premium-active'); };
  }, []);
  return <>{children}</>;
}
import { PremiumAvatar } from './components/PremiumAvatar';
import { UserFlairDisplay } from './components/UserFlairDisplay';
import { OursMusicLogo } from './components/OursMusicLogo';
import { AvatarEditModal } from './components/AvatarEditModal';
import { DownloadButton } from './components/DownloadButton';
import { useDownloads } from './hooks/useDownloads';
import { usePlaylists } from './hooks/usePlaylists';
import { useFavorites } from './hooks/useFavorites';
import { usePlayHistory } from './hooks/usePlayHistory';
import { useBadges } from './hooks/useBadges';
import { useRecommendationsEngine } from './hooks/useRecommendationsEngine';
import { useRadioStreams } from './hooks/useRadioStreams';
import { useOfflineSync } from './hooks/useOfflineSync';
import { useListeningParty } from './hooks/useListeningParty';
import { useSongGifting } from './hooks/useSongGifting';
import { THEMES, applyTheme, loadSavedTheme, enableAutoDarkMode, type AppTheme } from './theme/themes';
import { LANGUAGES, TRANSLATIONS, loadSavedLang, saveLang, type Lang } from './theme/i18n';
import { ConnectButton } from './devices/ConnectButton';
import { useDevices } from './devices/useDevices';
// import { LyricsPanel } from './player/LyricsPanel'; // Deprecado
import { LyricsPanelPremium } from './player/LyricsPanel_Premium';
import { FriendActivity } from './social/FriendActivity';
import { StatsModal } from './components/StatsModal';
import { RecentlyPlayedModal } from './components/RecentlyPlayedModal';
import { QueueModal } from './components/QueueModal';
import { EqualizerModal } from './components/EqualizerModal';
import { SocialShareButton } from './components/SocialShareButton';
import { TrendingWidget } from './components/TrendingWidget';
import { WrappedModal } from './components/WrappedModal';
import { RecommendationsWidget } from './components/RecommendationsWidget';
import { SongGiftingModal } from './components/SongGiftingModal';
import { RadioWidget } from './components/RadioWidget';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ListeningPartyModal } from './components/ListeningPartyModal';
import { usePrivateMode } from './hooks/usePrivateMode';
import { useAchievements } from './hooks/useAchievements';
import { useYearlyStats } from './hooks/useYearlyStats';
import { MoodSelector } from './components/MoodSelector';
import { AchievementsPanel } from './components/AchievementsPanel';
import { YearlyStatsModal } from './components/YearlyStatsModal';
import { LyricsSearch } from './components/LyricsSearch';
import { CreatePlaylistModal } from './components/CreatePlaylistModal';
import { GenreExplorer } from './components/GenreExplorer';
import { QRCodeShare } from './components/QRCodeShare';
import { DarkModeSelector } from './components/DarkModeSelector';

// PHASE 6 Features Imports (TOP 15)
import { useTempoControl } from './hooks/useTempoControl';
import { useCrossfade } from './hooks/useCrossfade';
import { useKaraokeMode } from './hooks/useKaraokeMode';
import { useAudioDucking } from './hooks/useAudioDucking';
import { useSmartQueue } from './hooks/useSmartQueue';
import { useMusicTheory } from './hooks/useMusicTheory';
import { useGaplessPlayback } from './hooks/useGaplessPlayback';
import { useListeningHeatmap } from './hooks/useListeningHeatmap';
import { useFontSizeAdjuster } from './hooks/useFontSizeAdjuster';
import { useVoiceCommands } from './hooks/useVoiceCommands';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useDyslexiaFont } from './hooks/useDyslexiaFont';
import { useSetlistBuilder } from './hooks/useSetlistBuilder';

// PHASE 6 Components Imports
import { TempoControlPanel } from './components/TempoControlPanel';
import { AudioVisualizer3D } from './components/AudioVisualizer3D';
import { SimilarArtistsChain } from './components/SimilarArtistsChain';
import { MusicTheoryDisplay } from './components/MusicTheoryDisplay';
import { ListeningHeatmap } from './components/ListeningHeatmap';
import { FontSizePanel } from './components/FontSizePanel';
import { KeyboardShortcutsPanel } from './components/KeyboardShortcutsPanel';
import { DyslexiaFontPanel } from './components/DyslexiaFontPanel';
import { SetlistBuilder } from './components/SetlistBuilder';

import './index.css';
import { AdminPanel } from './admin/AdminPanel';
import { AuthCallback } from './AuthCallback';
import { CoverEditModal } from './components/CoverEditModal';
import { AuthBackground } from './components/AuthBackground';
import { ArtistSearchResults } from './components/ArtistSearchResults';

import { API_URL, EXTRA_HEADERS } from './config';

const API = API_URL;

interface Song { id: string; title: string; artist?: string; albumName?: string; genre?: string; duration: number; coverUrl?: string; available?: boolean; }
interface User { id: string; email: string; name?: string; isAdmin?: boolean; }
type RepeatMode = 'off' | 'one' | 'all';

// Tokens ficam APENAS em memória — nunca em localStorage/sessionStorage
// Para web: o cookie HttpOnly é enviado automaticamente com credentials:'include'
// eslint-disable-next-line prefer-const
let _token = ''; // mantido para compatibilidade com fluxo de refresh mobile

async function apiFetch(path: string, _tokenArg: string, opts: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // ngrok headers (comentado - usando apenas localhost):
    // 'bypass-tunnel-reminder': 'true',
    // 'ngrok-skip-browser-warning': 'true',
    ...(opts.headers as any ?? {}),
  };
  // Use in-memory token if available (cross-origin), otherwise rely on cookie
  const tok = _token || _tokenArg;
  if (tok && tok !== 'authenticated') headers['Authorization'] = `Bearer ${tok}`;

  const res = await fetch(`${API}${path}`, { ...opts, headers, credentials: 'include' });

  if (res.status === 401) {
    try {
      const rt = sessionStorage.getItem('_rt') ?? '';
      const r = await fetch(`${API}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...EXTRA_HEADERS },
        credentials: 'include',
        body: JSON.stringify(rt ? { refresh_token: rt } : {}),
      });
      if (r.ok) {
        const d = await r.json().catch(() => ({}));
        if (d.access_token) {
          _token = d.access_token;
          sessionStorage.setItem('_om_access', d.access_token);
          if (d.refresh_token) sessionStorage.setItem('_rt', d.refresh_token);
        }
        const retryHeaders = { ...headers, ...(_token ? { Authorization: `Bearer ${_token}` } : {}) };
        const retry = await fetch(`${API}${path}`, { ...opts, headers: retryHeaders, credentials: 'include' });
        if (!retry.ok) throw new Error((await retry.json().catch(() => ({}))).message ?? retry.statusText);
        return retry.json();
      }
    } catch (_) {}
  }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
  if (res.status === 204) return null;
  return res.json().catch(() => null);
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
function AuthModal({ onAuth }: { onAuth: (user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t && window.location.pathname === '/reset-password') {
      setResetToken(t); setMode('reset');
      window.history.replaceState({}, '', '/');
    }
  }, []);

  function resetState() { setError(''); setSuccess(''); }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); resetState(); setLoading(true);
    try {
      if (mode === 'forgot') {
        await fetch(`${API}/auth/forgot-password`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...EXTRA_HEADERS }, body: JSON.stringify({ email }) })
          .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; });
        setSuccess('Se este e-mail estiver cadastrado, você receberá as instruções em breve.');
        return;
      }
      if (mode === 'reset') {
        await fetch(`${API}/auth/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...EXTRA_HEADERS }, body: JSON.stringify({ token: resetToken, password }) })
          .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; });
        setSuccess('Senha redefinida com sucesso!'); setMode('login'); setPassword(''); return;
      }
      const body: any = { email, password };
      if (mode === 'register' && name.trim()) body.name = name.trim();
      if (mode === 'register') body.username = username.trim().toLowerCase();
      const res = await fetch(`${API}/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...EXTRA_HEADERS }, credentials: 'include', body: JSON.stringify(body) });
      const d = await res.json();
      if (!res.ok) {
        // Handle username conflict with suggestions
        if (res.status === 409 && d.message?.includes('username') && d.suggestions?.length) {
          setUsernameSuggestions(d.suggestions);
        }
        throw new Error(typeof d.message === 'string' ? d.message : JSON.stringify(d.message));
      }
      // Store tokens in memory for cross-origin (Vercel → ngrok) — cookies won't work
      if (d.access_token) {
        _token = d.access_token;
        sessionStorage.setItem('_om_access', d.access_token);
        sessionStorage.setItem('_rt', d.refresh_token ?? '');
      }
      onAuth(d.user);
    } catch (err: any) { setError(err.message ?? 'Erro ao autenticar'); }
    finally { setLoading(false); }
  }

  const titles: Record<string, string> = { login: 'Entre na sua conta', register: 'Crie sua conta grátis', forgot: 'Recuperar senha', reset: 'Nova senha' };

  return (
    <div className="modal-overlay">
      <AuthBackground />
      <div className="modal" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 0 }}>
          <svg width="44" height="44" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="7" fill="url(#modal-g)"/>
            <defs><linearGradient id="modal-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#7c3aed"/><stop offset="100%" stopColor="#4f46e5"/></linearGradient></defs>
            {[{x:5,baseH:8,baseY:12,delay:'0s'},{x:10,baseH:16,baseY:8,delay:'0.15s'},{x:15,baseH:22,baseY:5,delay:'0.3s'},{x:20,baseH:14,baseY:9,delay:'0.45s'},{x:25,baseH:6,baseY:13,delay:'0.6s'}].map((b,i) => (
              <rect key={i} x={b.x} y={b.baseY} width="3" height={b.baseH} rx="1.5" fill="white" opacity="0.95"
                style={{ transformOrigin: `${b.x+1.5}px ${b.baseY+b.baseH/2}px`, animation: 'auth-bar 0.9s ease-in-out infinite alternate', animationDelay: b.delay }} />
            ))}
          </svg>
          <style>{`@keyframes auth-bar { 0% { transform: scaleY(0.35); opacity: 0.5; } 100% { transform: scaleY(1); opacity: 1; } }`}</style>
          <div className="modal__title" style={{ marginBottom: 0 }}>OursMusic</div>
        </div>
        <div className="modal__sub">{titles[mode]}</div>
        {success && <div style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#c4b5fd', textAlign: 'center' }}>{success}</div>}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'register' && <div className="form-group"><label htmlFor="auth-name">Nome</label><input id="auth-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder=" " autoComplete="name" /></div>}
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="auth-username">Username <span style={{ color: '#f87171', fontSize: 11 }}>*obrigatório</span></label>
              <input id="auth-username" type="text" value={username}
                onChange={e => { setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, '').slice(0, 30)); setUsernameSuggestions([]); }}
                placeholder="ex: kosukytalo" required minLength={3} maxLength={30} autoComplete="username"
                style={{ fontFamily: 'monospace' }} />
              {usernameSuggestions.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Sugestões:</span>
                  {usernameSuggestions.map(s => (
                    <button key={s} type="button" onClick={() => { setUsername(s); setUsernameSuggestions([]); }}
                      style={{ fontSize: 11, padding: '2px 10px', borderRadius: 6, background: 'rgba(124,58,237,0.15)', border: '1px solid #7c3aed', color: '#a78bfa', cursor: 'pointer' }}>
                      @{s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {(mode === 'login' || mode === 'register' || mode === 'forgot') && <div className="form-group"><label htmlFor="auth-email">E-mail</label><input id="auth-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder=" " required autoComplete="email" /></div>}
          {(mode === 'login' || mode === 'register' || mode === 'reset') && (
            <div className="form-group">
              <label htmlFor="auth-pwd">{mode === 'reset' ? 'Nova senha' : 'Senha'}</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input id="auth-pwd" type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder=" " required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} style={{ width: '100%', paddingRight: 48 }} />
                <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, display: 'flex', alignItems: 'center' }} aria-label={showPwd ? 'Ocultar senha' : 'Ver senha'}>
                  {showPwd ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                </button>
              </div>
            </div>
          )}
          {mode === 'login' && <div style={{ textAlign: 'right', marginTop: -4 }}><a onClick={() => { setMode('forgot'); resetState(); }} style={{ fontSize: 12, color: '#a78bfa', cursor: 'pointer' }}>Esqueci minha senha</a></div>}
          {error && <div className="error-msg">{error}</div>}
          <button className="btn btn--primary" type="submit" disabled={loading}>{loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta' : mode === 'forgot' ? 'Enviar instruções' : 'Redefinir senha'}</button>
        </form>
        {(mode === 'login' || mode === 'register') && (
          <>
            <div className="modal__divider">ou</div>
            <a className="btn btn--outline" href={`${API}/auth/google`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, textDecoration: 'none' }}>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              Entrar com Google
            </a>
          </>
        )}
        <div className="modal__switch">
          <span className="modal__switch-text">{mode === 'forgot' || mode === 'reset' ? 'Lembrou a senha?' : mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}</span>
          <a onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); resetState(); }}>{mode === 'login' ? 'Cadastre-se' : mode === 'register' ? 'Entrar' : 'Fazer login'}</a>
        </div>
      </div>
    </div>
  );
}

// ── Flair Customizer (Premium) ────────────────────────────────────────────────
const FLAIR_COLORS = [
  { label: 'Verde',   value: '#00FF88' },
  { label: 'Roxo',    value: '#a78bfa' },
  { label: 'Ciano',   value: '#00D4FF' },
  { label: 'Âmbar',   value: '#f59e0b' },
  { label: 'Laranja', value: '#f97316' },
  { label: 'Rosa',    value: '#f43f5e' },
  { label: 'Branco',  value: '#ffffff' },
  { label: 'Dourado', value: '#fbbf24' },
];
const FLAIR_STYLES = ['normal', 'long', 'short', 'wide', 'plasma', 'storm'];
const FLAIR_BADGES = [
  { id: 'premium',  label: 'Premium',    emoji: '💎',  color: '#fbbf24' },
  { id: 'admin',    label: 'Admin',      emoji: '🛡️',  color: '#f59e0b' },
  { id: 'founder',  label: 'Fundador',   emoji: '👑',  color: '#a78bfa' },
  { id: 'dj',       label: 'DJ',         emoji: '🎧',  color: '#00D4FF' },
  { id: 'curator',  label: 'Curador',    emoji: '🎵',  color: '#00FF88' },
  { id: 'beta',     label: 'Beta',       emoji: '⚡',  color: '#f97316' },
  { id: 'verified', label: 'Verificado', emoji: '✅',  color: '#34d399' },
];

function FlairCustomizer({ profile, isPremium, isAdmin, onSaveFlair, currentTheme, onThemeChange }: {
  profile: any; isPremium: boolean; isAdmin?: boolean;
  onSaveFlair: (patch: any) => void;
  currentTheme?: AppTheme; onThemeChange?: (t: AppTheme) => void;
}) {
  const [open, setOpen] = useState(false);
  const flair = profile?.flair ?? {};
  const badges: string[] = flair.badges ?? [];

  // Badges visíveis conforme cargo
  const visibleBadges = FLAIR_BADGES.filter(b => {
    if (b.id === 'admin' || b.id === 'founder') return isAdmin;
    if (b.id === 'premium') return isPremium;
    return true; // dj, curator, beta, verified — visíveis para todos (admin atribui)
  });

  function toggleBadge(id: string) {
    const next = badges.includes(id) ? badges.filter(b => b !== id) : [...badges, id];
    onSaveFlair({ badges: next });
  }

  if (!isPremium) return (
    <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button className={`sp-toggle-pill${flair.enabled !== false ? ' sp-toggle-pill--on' : ''}`}
        onClick={() => onSaveFlair({ enabled: flair.enabled === false })}>
        ⚡ Efeitos {flair.enabled !== false ? 'on' : 'off'}
      </button>
      <div style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', fontSize: 12, color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: 4 }}>
        🔒 Customização completa disponível no <strong style={{ color: '#a78bfa' }}>Premium</strong>
      </div>
    </div>
  );

  return (
    <div style={{ marginTop: 8 }}>
      {/* Toggles rápidos */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: open ? 12 : 0 }}>
        <button className={`sp-toggle-pill${flair.enabled !== false ? ' sp-toggle-pill--on' : ''}`}
          onClick={() => onSaveFlair({ enabled: flair.enabled === false })}>
          ⚡ Efeitos {flair.enabled !== false ? 'on' : 'off'}
        </button>
        {flair.enabled !== false && (
          <button className={`sp-toggle-pill${flair.beatSync ? ' sp-toggle-pill--on' : ''}`}
            onClick={() => onSaveFlair({ beatSync: !flair.beatSync })}>
            🎵 Beat sync {flair.beatSync ? 'on' : 'off'}
          </button>
        )}
        <button className={`sp-toggle-pill${open ? ' sp-toggle-pill--on' : ''}`} onClick={() => setOpen(o => !o)}>
          🎨 Personalizar
        </button>
      </div>

      {open && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Badges */}
          <div>
            <div style={{ color: '#b3b3b3', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Badges</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {visibleBadges.map(b => {
                const active = badges.includes(b.id);
                return (
                  <button key={b.id} onClick={() => toggleBadge(b.id)} title={b.label}
                    style={{ background: active ? `${b.color}22` : 'rgba(255,255,255,0.05)', border: `1.5px solid ${active ? b.color : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}>
                    <span style={{ fontSize: 16, filter: active ? `drop-shadow(0 0 5px ${b.color})` : 'none' }}>{b.emoji}</span>
                    <span style={{ color: active ? b.color : '#b3b3b3', fontSize: 12, fontWeight: 600 }}>{b.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cor dos raios */}
          <div>
            <div style={{ color: '#b3b3b3', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Cor dos raios</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {FLAIR_COLORS.map(c => {
                const active = (flair.rayColor ?? '#00FF88') === c.value;
                return (
                  <button key={c.value} onClick={() => onSaveFlair({ rayColor: c.value })} title={c.label}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: c.value, border: active ? `3px solid #fff` : '3px solid transparent', cursor: 'pointer', boxShadow: active ? `0 0 8px ${c.value}` : 'none', transition: 'all 0.15s' }} />
                );
              })}
            </div>
          </div>

          {/* Estilo dos raios */}
          <div>
            <div style={{ color: '#b3b3b3', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Estilo dos raios</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {FLAIR_STYLES.map(s => {
                const active = (flair.rayStyle ?? 'normal') === s;
                return (
                  <button key={s} onClick={() => onSaveFlair({ rayStyle: s })}
                    style={{ padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${active ? 'var(--accent, #1db954)' : 'rgba(255,255,255,0.1)'}`, background: active ? 'rgba(29,185,84,0.15)' : 'rgba(255,255,255,0.04)', color: active ? 'var(--accent, #1db954)' : '#b3b3b3', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s' }}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cor do nome */}
          <div>
            <div style={{ color: '#b3b3b3', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Cor do nome</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {FLAIR_COLORS.map(c => {
                const active = (flair.nameColor ?? '') === c.value;
                return (
                  <button key={c.value} onClick={() => onSaveFlair({ nameColor: c.value })} title={c.label}
                    style={{ width: 24, height: 24, borderRadius: '50%', background: c.value, border: active ? '3px solid #fff' : '3px solid transparent', cursor: 'pointer', boxShadow: active ? `0 0 8px ${c.value}` : 'none', transition: 'all 0.15s' }} />
                );
              })}
              <button onClick={() => onSaveFlair({ nameColor: '' })}
                style={{ padding: '3px 10px', borderRadius: 20, border: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#b3b3b3', fontSize: 11, cursor: 'pointer' }}>
                Padrão
              </button>
            </div>
          </div>

          {/* Tema — só premium */}
          {onThemeChange && currentTheme && (
            <div>
              <div style={{ color: '#b3b3b3', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Tema da interface</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {THEMES.map(t => {
                  const active = currentTheme.id === t.id;
                  return (
                    <button key={t.id} onClick={() => onThemeChange(t)} title={t.name}
                      style={{ background: t.bgBase, border: active ? `2px solid ${t.accent}` : '2px solid #3a3a3a', borderRadius: 8, padding: '8px 4px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transition: 'border-color 0.15s' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: t.accent, boxShadow: active ? `0 0 8px ${t.accent}` : 'none' }} />
                      <span style={{ color: t.textPrimary, fontSize: 10, fontWeight: 600 }}>{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Family Manager ────────────────────────────────────────────────────────────
function FamilyManager({ token, onViewProfile }: { token: string; onViewProfile: (id: string) => void }) {
  const [group, setGroup] = useState<any>(null);
  const [inviteQ, setInviteQ] = useState('');
  const [inviteResults, setInviteResults] = useState<any[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    apiFetch('/family/group', token).then(setGroup).catch(() => {});
  }, [token]);

  async function searchInvite(q: string) {
    setInviteQ(q);
    if (!q.trim()) { setInviteResults([]); return; }
    try {
      const d = await apiFetch(`/social/search?q=${encodeURIComponent(q)}`, token);
      setInviteResults(Array.isArray(d) ? d.slice(0, 5) : []);
    } catch { setInviteResults([]); }
  }

  async function invite(userId: string) {
    try {
      await apiFetch(`/family/invite/${userId}`, token, { method: 'POST' });
      setMsg('✅ Membro adicionado!');
      setInviteQ(''); setInviteResults([]);
      const g = await apiFetch('/family/group', token);
      setGroup(g);
    } catch (e: any) { setMsg(`❌ ${e.message}`); }
    setTimeout(() => setMsg(''), 3000);
  }

  async function remove(userId: string) {
    if (!confirm('Remover este membro do grupo Family?')) return;
    try {
      await apiFetch(`/family/member/${userId}`, token, { method: 'DELETE' });
      const g = await apiFetch('/family/group', token);
      setGroup(g);
    } catch (e: any) { setMsg(`❌ ${e.message}`); }
  }

  const members = group?.members ?? [];
  const isOwner = group?.role === 'owner';
  const slots = 6 - 1 - members.length; // 6 total - 1 dono - membros atuais

  return (
    <div style={{ marginTop: 16, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>👑</span>
        <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: 14 }}>Grupo Family</span>
        <span style={{ color: '#6a6a6a', fontSize: 12 }}>· {members.length + 1}/6 membros</span>
        {!isOwner && <span style={{ color: '#6a6a6a', fontSize: 11, marginLeft: 'auto' }}>membro</span>}
      </div>

      {/* Membros */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: isOwner ? 12 : 0 }}>
        {members.map((m: any) => (
          <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2a2a2a', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              onClick={() => onViewProfile(m.userId)}>
              {m.user?.avatarUrl ? <img src={m.user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (m.user?.name ?? '?')[0]}
            </div>
            <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => onViewProfile(m.userId)}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{m.user?.name ?? m.user?.username ?? '?'}</div>
              {m.user?.username && <div style={{ color: '#6a6a6a', fontSize: 11 }}>@{m.user.username}</div>}
            </div>
            {isOwner && (
              <button onClick={() => remove(m.userId)} style={{ color: '#f15e6c', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>Remover</button>
            )}
          </div>
        ))}
        {members.length === 0 && <div style={{ color: '#6a6a6a', fontSize: 13 }}>Nenhum membro ainda. Convide até {slots} pessoas.</div>}
      </div>

      {/* Convidar — só para o dono */}
      {isOwner && slots > 0 && (
        <div style={{ position: 'relative' }}>
          <input value={inviteQ} onChange={e => searchInvite(e.target.value)}
            placeholder="Buscar usuário para convidar..."
            style={{ width: '100%', background: '#1a1a1a', border: '1px solid #3a3a3a', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, boxSizing: 'border-box' }} />
          {inviteResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a1a', border: '1px solid #3a3a3a', borderRadius: 8, zIndex: 10, marginTop: 4 }}>
              {inviteResults.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #2a2a2a' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#2a2a2a')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontSize: 13 }}>{u.name ?? u.username}</div>
                    {u.username && <div style={{ color: '#6a6a6a', fontSize: 11 }}>@{u.username}</div>}
                  </div>
                  <button onClick={() => invite(u.id)} style={{ background: '#fbbf24', color: '#000', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Convidar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {msg && <div style={{ marginTop: 8, fontSize: 12, color: msg.startsWith('✅') ? '#1db954' : '#f15e6c' }}>{msg}</div>}
    </div>
  );
}

// ── Other User Profile Page ───────────────────────────────────────────────────
function OtherProfilePage({ userId, token, onClose, onPlaySong, playing, audioRef }: {
  userId: string; token: string; onClose: () => void; onPlaySong: (s: any) => void;
  playing?: boolean; audioRef?: React.RefObject<HTMLAudioElement | null>;
}) {
  const [profile, setProfile] = useState<any>(null);
  const [tab, setTab] = useState<'musicas' | 'seguidores' | 'seguindo'>('musicas');
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>([]);
  const [viewingId, setViewingId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`/social/profile/${userId}`, token).then(p => setProfile(p)).catch(() => {});
    apiFetch(`/songs`, token).then(d => {
      if (Array.isArray(d)) setSongs(d);
      else if (d?.songs && Array.isArray(d.songs)) setSongs(d.songs);
      else setSongs([]);
    }).catch(() => setSongs([]));
  }, [userId, token]);

  async function loadFollowers() {
    const data = await apiFetch(`/social/profile/${userId}/followers`, token);
    setFollowers(data);
  }
  async function loadFollowing() {
    const data = await apiFetch(`/social/profile/${userId}/following`, token);
    setFollowing(data);
  }
  async function toggleFollow() {
    if (!profile) return;
    if (profile.isFollowing) {
      await apiFetch(`/social/follow/${userId}`, token, { method: 'DELETE' });
    } else {
      await apiFetch(`/social/follow/${userId}`, token, { method: 'POST' });
    }
    setProfile((p: any) => ({ ...p, isFollowing: !p.isFollowing, followersCount: p.followersCount + (p.isFollowing ? -1 : 1) }));
  }

  const coverBg = profile?.coverUrl
    ? `url(${profile.coverUrl}) center/cover no-repeat`
    : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';

  if (viewingId) return <OtherProfilePage userId={viewingId} token={token} onClose={() => setViewingId(null)} onPlaySong={onPlaySong} playing={playing} audioRef={audioRef} />;

  return (
    <div className="sp-profile-page">
      <div className="sp-profile-page__cover" style={{ background: coverBg }}>
        <button className="sp-profile-page__back" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
      </div>
      <div className="sp-profile-page__info-row">
        <div className="sp-profile-page__avatar-wrap">
          <UserFlairDisplay
            flair={profile?.flair}
            name={profile?.name ?? '?'}
            avatarUrl={profile?.avatarUrl}
            size={90}
            playing={playing}
            audioRef={audioRef}
            showName={false}
            userPlan={profile?.plan}
            isAdmin={profile?.isAdmin === true}
            showBadges={false}
          />
        </div>
        <div className="sp-profile-page__actions">
          {profile && !profile.isOwn && (
            <button className="sp-profile-page__edit-btn" onClick={toggleFollow}
              style={{ background: profile.isFollowing ? 'transparent' : 'var(--accent, #1db954)', border: profile.isFollowing ? '1px solid #b3b3b3' : 'none', color: profile.isFollowing ? '#b3b3b3' : '#000' }}>
              {profile.isFollowing ? 'Seguindo' : 'Seguir'}
            </button>
          )}
        </div>
      </div>
      <div className="sp-profile-page__meta">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-start', flexWrap: 'wrap' }}>
          <div className="sp-profile-page__name" style={profile?.flair?.nameColor && profile?.flair?.enabled !== false ? { color: profile?.flair?.nameColor, textShadow: `0 0 8px ${profile?.flair?.nameColor}` } : {}}>
            {profile?.name ?? '...'}
          </div>
          {profile?.flair?.enabled !== false && ((profile?.flair?.badges ?? []).length > 0 || profile?.isAdmin) && (
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              {profile?.isAdmin && (
                <span title="Administrador" style={{ fontSize: 16, filter: 'drop-shadow(0 0 4px #FFD700)', lineHeight: 1 }}>👑</span>
              )}
              {(profile?.flair?.badges as string[])?.map((bid: string) => {
                const b = [
                  { id: 'premium',  label: 'Premium',    emoji: '💎',  color: '#fbbf24' },
                  { id: 'founder',  label: 'Fundador',   emoji: '⭐',  color: '#a78bfa' },
                  { id: 'dj',       label: 'DJ',         emoji: '🎧',  color: '#00D4FF' },
                  { id: 'curator',  label: 'Curador',    emoji: '🎵',  color: '#00FF88' },
                  { id: 'beta',     label: 'Beta',       emoji: '⚡',  color: '#f97316' },
                  { id: 'verified', label: 'Verificado', emoji: '✅',  color: '#34d399' },
                ].find(x => x.id === bid);
                return b ? (
                  <span key={bid} title={b.label} style={{ fontSize: 16, filter: `drop-shadow(0 0 5px ${b.color})`, lineHeight: 1, display: 'flex', alignItems: 'center' }}>
                    {b.emoji}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>
        {profile?.username && <div className="sp-profile-page__username">@{profile.username}</div>}
        {profile?.bio && <div className="sp-profile-page__bio">{profile.bio}</div>}
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
      <div className="sp-profile-page__tabs">
        {(['musicas', 'seguidores', 'seguindo'] as const).map(t => (
          <button key={t} className={`sp-profile-page__tab${tab === t ? ' sp-profile-page__tab--active' : ''}`}
            onClick={() => { setTab(t); if (t === 'seguidores') loadFollowers(); if (t === 'seguindo') loadFollowing(); }}>
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
              <div key={u.id} className="sp-user-card" style={{ cursor: 'pointer' }} onClick={() => setViewingId(u.id)}>
                <div className="sp-user-card__avatar" style={u.avatarUrl ? { backgroundImage: `url(${u.avatarUrl})`, backgroundSize: 'cover' } : {}}>{!u.avatarUrl && (u.name ?? '?')[0]}</div>
                <div className="sp-user-card__info"><div className="sp-user-card__name">{u.name}</div>{u.username && <div className="sp-user-card__username">@{u.username}</div>}</div>
              </div>
            ))}
          </div>
        )}
        {tab === 'seguindo' && (
          <div className="sp-user-list">
            {following.length === 0 ? <div style={{ color: '#b3b3b3', padding: 24 }}>Não está seguindo ninguém ainda.</div> : following.map(u => (
              <div key={u.id} className="sp-user-card" style={{ cursor: 'pointer' }} onClick={() => setViewingId(u.id)}>
                <div className="sp-user-card__avatar" style={u.avatarUrl ? { backgroundImage: `url(${u.avatarUrl})`, backgroundSize: 'cover' } : {}}>{!u.avatarUrl && (u.name ?? '?')[0]}</div>
                <div className="sp-user-card__info"><div className="sp-user-card__name">{u.name}</div>{u.username && <div className="sp-user-card__username">@{u.username}</div>}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Profile Page ─────────────────────────────────────────────────────────────
function ProfilePage({ user, songs, token, onClose, onPlaySong, audioRef, playing, currentTheme, onThemeChange }: {
  user: User; songs: any[]; token: string; onClose: () => void; onPlaySong: (s: any) => void;
  audioRef?: React.RefObject<HTMLAudioElement | null>; playing?: boolean;
  currentTheme?: AppTheme; onThemeChange?: (t: AppTheme) => void;
}) {
  const [profile, setProfile] = useState<any>(null);
  const [tab, setTab] = useState<'musicas' | 'seguidores' | 'seguindo'>('musicas');
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [showCoverEdit, setShowCoverEdit] = useState(false);
  const [showAvatarEditModal, setShowAvatarEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', username: '', bio: '', avatarUrl: '', coverUrl: '', isPrivate: false });
  const [saving, setSaving] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [viewingId, setViewingId] = useState<string | null>(null);

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

  async function saveFlair(patch: Partial<any>) {
    const newFlair = { ...(profile?.flair ?? {}), ...patch };
    try {
      const updated = await apiFetch('/social/profile', token, { method: 'POST', body: JSON.stringify({ flair: newFlair }) });
      setProfile((p: any) => ({ ...p, flair: updated.flair ?? newFlair }));
    } catch { /* silently fail */ }
  }
  async function doSearch(q: string) {
    setSearchQ(q);
    if (!q.trim()) { setSearchResults([]); return; }
    // Remove @ se presente
    const username = q.startsWith('@') ? q.slice(1) : q;
    if (!username.trim()) { setSearchResults([]); return; }
    try {
      const data = await apiFetch(`/social/search?q=${encodeURIComponent('@' + username)}`, token);
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
      {viewingId && <OtherProfilePage userId={viewingId} token={token} onClose={() => setViewingId(null)} onPlaySong={onPlaySong} playing={playing} audioRef={audioRef} />}
      <div className="sp-profile-page" style={{ display: viewingId ? 'none' : undefined }}>
        <div className="sp-profile-page__cover" style={{ background: coverBg }}>
          <button className="sp-profile-page__back" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          </button>

          {/* Botão de ajuste da capa — visível sempre */}
          {(profile?.coverUrl || editing) && (
            <button
              onClick={() => setShowCoverEdit(true)}
              style={{
                position: 'absolute', top: 12, right: 12,
                width: 36, height: 36,
                background: 'rgba(0,0,0,0.6)',
                border: '1.5px solid rgba(255,255,255,0.25)',
                borderRadius: '50%',
                color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(6px)',
                transition: 'background 0.15s, transform 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.85)'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.6)'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
              title="Ajustar capa"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
          )}
          {showCoverEdit && (
            <CoverEditModal
              token={token}
              currentUrl={profile?.coverUrl}
              onSaved={url => { setEditForm(f => ({ ...f, coverUrl: url })); setProfile((p: any) => ({ ...p, coverUrl: url })); setShowCoverEdit(false); }}
              onClose={() => setShowCoverEdit(false)}
            />
          )}
          {showAvatarEditModal && (
            <AvatarEditModal
              token={token}
              currentUrl={profile?.avatarUrl}
              onSaved={url => { setEditForm(f => ({ ...f, avatarUrl: url })); setProfile((p: any) => ({ ...p, avatarUrl: url })); setShowAvatarEditModal(false); }}
              onClose={() => setShowAvatarEditModal(false)}
            />
          )}
        </div>

        <div className="sp-profile-page__info-row">
          <div className="sp-profile-page__avatar-wrap">
            {editing ? (
              <>
                <div className="sp-profile-page__avatar" style={(editForm.avatarUrl) ? { backgroundImage: `url(${editForm.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                  {!editForm.avatarUrl && user.email[0].toUpperCase()}
                </div>
                <button className="sp-profile-page__edit-avatar" onClick={() => setShowAvatarEditModal(true)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                </button>
              </>
            ) : (
              <UserFlairDisplay
                flair={profile?.flair}
                name={profile?.name ?? user.email.split('@')[0]}
                avatarUrl={profile?.avatarUrl}
                size={90}
                playing={playing}
                audioRef={audioRef}
                showName={false}
                userPlan={(user as any).plan}
                isAdmin={(user as any).isAdmin === true}
                showBadges={false}
              />
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
            <div className="sp-profile-edit-row"><label>@username</label><input value={editForm.username} onChange={e => {
              // Remove @ e qualquer caractere inválido — só letras, números, _ e .
              const clean = e.target.value.replace(/@/g, '').replace(/[^a-zA-Z0-9_.]/g, '').slice(0, 30);
              setEditForm(f => ({ ...f, username: clean }));
            }} placeholder="username (sem @)" maxLength={30} /></div>
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="sp-profile-page__name" style={profile?.flair?.nameColor && profile?.flair?.enabled !== false ? { color: profile?.flair?.nameColor, textShadow: `0 0 8px ${profile?.flair?.nameColor}` } : {}}>
                    {profile?.name ?? user.email.split('@')[0]}
                  </div>
                  {profile?.flair?.enabled !== false && ((profile?.flair?.badges ?? []).length > 0 || (user as any).isAdmin) && (
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      {(user as any).isAdmin && (
                        <span title="Administrador" style={{ fontSize: 16, filter: 'drop-shadow(0 0 4px #FFD700)', lineHeight: 1, display: 'flex', alignItems: 'center' }}>👑</span>
                      )}
                      {(profile?.flair?.badges as string[] ?? []).map((bid: string) => {
                        const b = [
                          { id: 'premium',  label: 'Premium',    emoji: '💎',  color: '#fbbf24' },
                          { id: 'founder',  label: 'Fundador',   emoji: '⭐',  color: '#a78bfa' },
                          { id: 'dj',       label: 'DJ',         emoji: '🎧',  color: '#00D4FF' },
                          { id: 'curator',  label: 'Curador',    emoji: '🎵',  color: '#00FF88' },
                          { id: 'beta',     label: 'Beta',       emoji: '⚡',  color: '#f97316' },
                          { id: 'verified', label: 'Verificado', emoji: '✅',  color: '#34d399' },
                        ].find(x => x.id === bid);
                        return b ? (
                          <span key={bid} title={b.label} style={{ fontSize: 16, filter: `drop-shadow(0 0 5px ${b.color})`, lineHeight: 1, display: 'flex', alignItems: 'center' }}>
                            {b.emoji}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                {profile?.username && <div className="sp-profile-page__username">@{profile.username}</div>}
              </div>

              {/* Customização de efeitos — só para o próprio usuário */}
              {profile?.isOwn !== false && (
                <FlairCustomizer
                  profile={profile}
                  isPremium={(user as any).plan === 'premium' || (user as any).plan === 'family'}
                  isAdmin={(user as any).isAdmin === true}
                  onSaveFlair={saveFlair}
                  currentTheme={currentTheme}
                  onThemeChange={onThemeChange}
                />
              )}
            </div>

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
            {/* Gerenciamento Family */}
            {(user as any).plan === 'family' && (
              <FamilyManager token={token} onViewProfile={(id: string) => setViewingId(id)} />
            )}
          </div>
        )}

        <div className="sp-profile-page__search-wrap">
          <div className="sp-profile-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#b3b3b3' }}><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <input placeholder="Buscar usuários por nome ou @username..." value={searchQ} onChange={e => doSearch(e.target.value)} />
          </div>
          {searchResults.length > 0 && (
            <div className="sp-user-results">
              {searchResults.map(u => (
                <div key={u.id} className="sp-user-card" style={{ cursor: 'pointer' }} onClick={() => setViewingId(u.id)}>
                  <UserFlairDisplay
                    flair={u.flair}
                    name={u.name ?? u.email?.split('@')[0] ?? '?'}
                    avatarUrl={u.avatarUrl}
                    size={40}
                    showName={false}
                    userPlan={u.plan}
                    isAdmin={u.isAdmin === true}
                    showBadges={false}
                  />
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
function ProfileMenu({ user, onLogout, onAdmin, onProfile, onClose, currentTheme, currentLang, onThemeChange, onLangChange, onShowStats, onShowQueue, onShowRecentlyPlayed, onShowEqualizer, onShowWrapped, onShowParty, onTogglePrivate, onShowAchievements, onShowLyricsSearch, onShowGenreExplorer, onShowMoodSelector, onShowYearlyStats, onShowDarkModeSelector, onShowTempoPanel, onShowListeningHeatmap, onShowFontSizePanel, onShowKeyboardShortcuts, onShowDyslexiaFont, onShowSetlistBuilder, onShowSimilarArtists, onShowTheoryDisplay, current }: {
  user: User; onLogout: () => void; onAdmin: () => void; onProfile: () => void; onClose: () => void;
  currentTheme: AppTheme; currentLang: Lang;
  onThemeChange: (t: AppTheme) => void; onLangChange: (l: Lang) => void;
  onShowStats: () => void; onShowQueue: () => void; onShowRecentlyPlayed: () => void; onShowEqualizer: () => void; onShowWrapped: () => void; onShowParty: () => void; onTogglePrivate: () => void; onShowAchievements: () => void; onShowLyricsSearch: () => void; onShowGenreExplorer: () => void; onShowMoodSelector: () => void; onShowYearlyStats: () => void; onShowDarkModeSelector: () => void; onShowTempoPanel: () => void; onShowListeningHeatmap: () => void; onShowFontSizePanel: () => void; onShowKeyboardShortcuts: () => void; onShowDyslexiaFont: () => void; onShowSetlistBuilder: () => void; onShowSimilarArtists: () => void; onShowTheoryDisplay: () => void; current: Song | null;
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
        {isPremium && (user as any).plan !== 'family' && (
          <button className="sp-profile-menu__item" style={{ color: '#a78bfa', fontWeight: 700 }}
            onClick={() => setModal('plan')}>
            👑 Upgrade para Family
          </button>
        )}
        {(user as any).plan === 'family' && (
          <button className="sp-profile-menu__item" style={{ color: '#fbbf24', fontWeight: 700 }}
            onClick={() => setModal('plan')}>
            💎 Plano Family ativo
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
      {modal === 'plan' && <PlanModal user={user} onClose={() => setModal(null)} />}
      {modal === 'settings' && <SettingsModal user={user} onClose={() => setModal(null)} currentTheme={currentTheme} currentLang={currentLang} onThemeChange={onThemeChange} onLangChange={onLangChange} onShowStats={onShowStats} onShowQueue={onShowQueue} onShowRecentlyPlayed={onShowRecentlyPlayed} onShowEqualizer={onShowEqualizer} onShowWrapped={onShowWrapped} onShowParty={onShowParty} onTogglePrivate={onTogglePrivate} onShowAchievements={onShowAchievements} onShowLyricsSearch={onShowLyricsSearch} onShowGenreExplorer={onShowGenreExplorer} onShowMoodSelector={onShowMoodSelector} onShowYearlyStats={onShowYearlyStats} onShowDarkModeSelector={onShowDarkModeSelector} onShowTempoPanel={onShowTempoPanel} onShowListeningHeatmap={onShowListeningHeatmap} onShowFontSizePanel={onShowFontSizePanel} onShowKeyboardShortcuts={onShowKeyboardShortcuts} onShowDyslexiaFont={onShowDyslexiaFont} onShowSetlistBuilder={onShowSetlistBuilder} onShowSimilarArtists={onShowSimilarArtists} onShowTheoryDisplay={onShowTheoryDisplay} current={current} />}
      {modal === 'support' && <SupportModal onClose={() => setModal(null)} />}
      {modal === 'about' && <AboutModal onClose={() => setModal(null)} />}
    </>
  );
}

// ── Plan Modal ────────────────────────────────────────────────────────────────
function PlanModal({ user, onClose }: { user: User; onClose: () => void }) {
  const plan = (user as any).plan ?? 'free';
  const isFree = plan === 'free';
  const isPremium = plan === 'premium';
  const isFamily = plan === 'family';

  // Benefícios por plano
  const FREE_BENEFITS = [
    ['🎵', 'Streaming ilimitado', 'Ouça todas as músicas da plataforma'],
    ['🔍', 'Busca completa', 'Encontre músicas, álbuns, artistas e usuários'],
    ['📋', 'Playlists', 'Crie e gerencie suas playlists'],
    ['❤️', 'Favoritos', 'Salve suas músicas favoritas'],
    ['👥', 'Social', 'Siga amigos e veja o que estão ouvindo'],
  ];

  const PREMIUM_BENEFITS = [
    ['⬇️', 'Downloads offline', 'Baixe músicas e ouça sem internet'],
    ['🎨', 'Temas exclusivos', '7 temas visuais premium para personalizar'],
    ['⚡', 'Efeitos de perfil', 'Raios, badges e cores no seu avatar'],
    ['🎵', 'Beat sync', 'Efeitos sincronizados com a batida da música'],
    ['💎', 'Badge Premium', 'Destaque-se com o badge exclusivo'],
    ['🌈', 'Cor do nome', 'Personalize a cor do seu nome no perfil'],
    ['📱', 'Todos os dispositivos', 'Web, mobile e TV sem limitações'],
  ];

  const FAMILY_BENEFITS = [
    ['👨‍👩‍👧‍👦', 'Até 6 contas', 'Compartilhe com toda a família — cada um com seu perfil'],
    ['👑', 'Badge Fundador', 'Badge exclusivo de membro fundador'],
    ['🌩️', 'Efeito Tempestade', 'Raios de tempestade real no perfil'],
    ['🎭', 'Todos os estilos de raio', 'Normal, longo, curto, largo, plasma e tempestade'],
    ['⭐', 'Prioridade de suporte', 'Atendimento prioritário pelo admin'],
    ['🔮', 'Acesso antecipado', 'Primeiros a receber novas funcionalidades'],
    ...PREMIUM_BENEFITS,
  ];

  if (isFamily) {
    return (
      <div className="sp-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}
        onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={{ background: 'linear-gradient(135deg, #1a0a2e, #0a1a2e)', borderRadius: 20, padding: 32, maxWidth: 480, width: '90%', maxHeight: '85vh', overflowY: 'auto', border: '1px solid #fbbf24', boxShadow: '0 0 40px rgba(251,191,36,0.2)' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>👑</div>
            <div style={{ color: '#fbbf24', fontSize: 24, fontWeight: 900 }}>Você já tem o Plano Family!</div>
            <div style={{ color: '#b3b3b3', fontSize: 14, marginTop: 6, lineHeight: 1.6 }}>
              Você está no topo. Aproveite todos os benefícios exclusivos.
            </div>
          </div>
          <div style={{ background: 'rgba(251,191,36,0.08)', borderRadius: 12, padding: '16px 20px', marginBottom: 20, border: '1px solid rgba(251,191,36,0.2)' }}>
            <div style={{ color: '#fbbf24', fontSize: 13, fontWeight: 700, marginBottom: 12 }}>✨ Seus benefícios ativos</div>
            {FAMILY_BENEFITS.map(([icon, title, sub]) => (
              <div key={title as string} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{title}</div>
                  <div style={{ color: '#9ca3af', fontSize: 11 }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '14px 16px', marginBottom: 20, fontSize: 13, color: '#9ca3af', lineHeight: 1.7 }}>
            🚀 <strong style={{ color: '#fbbf24' }}>Em breve:</strong> Estamos trabalhando em novas funcionalidades exclusivas para o plano Family. Fique ligado nas atualizações!
          </div>
          <button onClick={onClose} style={{ width: '100%', background: 'linear-gradient(90deg, #fbbf24, #f59e0b)', color: '#000', border: 'none', borderRadius: 500, padding: '13px 0', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>
            Incrível, obrigado! 🎉
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sp-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#111', borderRadius: 20, maxWidth: 560, width: '90%', maxHeight: '88vh', overflowY: 'auto', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '28px 28px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#6a6a6a', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
            {isFree ? 'Você está no plano Gratuito' : 'Você está no plano Premium'}
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 4 }}>
            {isFree ? 'Escolha seu plano' : 'Upgrade para Family'}
          </div>
          <div style={{ color: '#b3b3b3', fontSize: 13, marginBottom: 20 }}>
            {isFree ? 'Desbloqueie o melhor da música' : 'Compartilhe com toda a família'}
          </div>
        </div>

        {/* Planos */}
        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>

          {/* Plano atual — Free */}
          {isFree && (
            <div style={{ background: '#1a1a1a', borderRadius: 14, padding: '18px 20px', border: '1px solid #2a2a2a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ color: '#fff', fontSize: 16, fontWeight: 800 }}>🎵 Gratuito</div>
                  <div style={{ color: '#6a6a6a', fontSize: 12 }}>Plano atual</div>
                </div>
                <div style={{ background: '#2a2a2a', borderRadius: 8, padding: '4px 12px', fontSize: 12, color: '#b3b3b3', fontWeight: 700 }}>Ativo</div>
              </div>
              {FREE_BENEFITS.map(([icon, title, sub]) => (
                <div key={title as string} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  <div>
                    <span style={{ color: '#b3b3b3', fontSize: 13, fontWeight: 600 }}>{title}</span>
                    <span style={{ color: '#6a6a6a', fontSize: 11 }}> — {sub}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Premium */}
          {(isFree || isPremium) && (
            <div style={{ background: 'linear-gradient(135deg, #0d1a0d, #1a2e1a)', borderRadius: 14, padding: '18px 20px', border: `2px solid ${isPremium ? '#1db954' : '#1db95466'}`, position: 'relative', overflow: 'hidden' }}>
              {isFree && <div style={{ position: 'absolute', top: 12, right: 12, background: '#1db954', color: '#000', fontSize: 10, fontWeight: 900, padding: '3px 10px', borderRadius: 20 }}>RECOMENDADO</div>}
              {isPremium && <div style={{ position: 'absolute', top: 12, right: 12, background: '#1db954', color: '#000', fontSize: 10, fontWeight: 900, padding: '3px 10px', borderRadius: 20 }}>ATIVO</div>}
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: '#1db954', fontSize: 18, fontWeight: 900 }}>⭐ Premium</div>
                <div style={{ color: '#b3b3b3', fontSize: 12, marginTop: 2 }}>Tudo do gratuito, mais:</div>
              </div>
              {PREMIUM_BENEFITS.map(([icon, title, sub]) => (
                <div key={title as string} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  <div>
                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{title}</span>
                    <span style={{ color: '#6a6a6a', fontSize: 11 }}> — {sub}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Family */}
          <div style={{ background: 'linear-gradient(135deg, #1a0a2e, #0a1020)', borderRadius: 14, padding: '18px 20px', border: `2px solid ${isFamily ? '#fbbf24' : '#fbbf2466'}`, position: 'relative', overflow: 'hidden' }}>
            {isPremium && <div style={{ position: 'absolute', top: 12, right: 12, background: 'linear-gradient(90deg,#fbbf24,#f59e0b)', color: '#000', fontSize: 10, fontWeight: 900, padding: '3px 10px', borderRadius: 20 }}>UPGRADE</div>}
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: '#fbbf24', fontSize: 18, fontWeight: 900 }}>👑 Family</div>
              <div style={{ color: '#b3b3b3', fontSize: 12, marginTop: 2 }}>Tudo do Premium, mais:</div>
            </div>
            {[
              ['👨‍👩‍👧‍👦', 'Até 6 contas', 'Cada membro com perfil independente'],
              ['👑', 'Badge Fundador', 'Badge exclusivo visível para todos'],
              ['🌩️', 'Tempestade real', 'Efeito de raios mais intenso e dramático'],
              ['🔮', 'Acesso antecipado', 'Primeiros a receber novas funcionalidades'],
              ['⭐', 'Prioridade de suporte', 'Atendimento prioritário'],
            ].map(([icon, title, sub]) => (
              <div key={title as string} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <div>
                  <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{title}</span>
                  <span style={{ color: '#6a6a6a', fontSize: 11 }}> — {sub}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Nota */}
          <div style={{ background: '#1a1a1a', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: '#6a6a6a', textAlign: 'center', lineHeight: 1.6 }}>
            Os planos são concedidos pelo administrador da plataforma.<br />
            Entre em contato para solicitar seu upgrade.
          </div>
        </div>

        <div style={{ padding: '0 20px 24px' }}>
          <button onClick={onClose} style={{ width: '100%', background: isFree ? '#1db954' : 'linear-gradient(90deg,#fbbf24,#f59e0b)', color: '#000', border: 'none', borderRadius: 500, padding: '13px 0', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>
            {isFree ? 'Entendido' : 'Fechar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Settings Modal ────────────────────────────────────────────────────────────
function SettingsModal({ user, onClose, currentTheme, currentLang, onThemeChange, onLangChange, onShowStats, onShowQueue, onShowRecentlyPlayed, onShowEqualizer, onShowWrapped, onShowParty, onTogglePrivate, onShowAchievements, onShowLyricsSearch, onShowGenreExplorer, onShowMoodSelector, onShowYearlyStats, onShowDarkModeSelector, onShowTempoPanel, onShowListeningHeatmap, onShowFontSizePanel, onShowKeyboardShortcuts, onShowDyslexiaFont, onShowSetlistBuilder, onShowSimilarArtists, onShowTheoryDisplay, current }: {
  user: User; onClose: () => void;
  currentTheme: AppTheme; currentLang: Lang;
  onThemeChange: (t: AppTheme) => void; onLangChange: (l: Lang) => void;
  onShowStats: () => void; onShowQueue: () => void; onShowRecentlyPlayed: () => void; onShowEqualizer: () => void; onShowWrapped: () => void; onShowParty: () => void; onTogglePrivate: () => void; onShowAchievements: () => void; onShowLyricsSearch: () => void; onShowGenreExplorer: () => void; onShowMoodSelector: () => void; onShowYearlyStats: () => void; onShowDarkModeSelector: () => void; onShowTempoPanel: () => void; onShowListeningHeatmap: () => void; onShowFontSizePanel: () => void; onShowKeyboardShortcuts: () => void; onShowDyslexiaFont: () => void; onShowSetlistBuilder: () => void; onShowSimilarArtists: () => void; onShowTheoryDisplay: () => void; current: Song | null;
}) {
  const [audioQuality, setAudioQuality] = useState('Alta');
  const [notifs, setNotifs] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(currentTheme.id);
  const [selectedLang, setSelectedLang] = useState(currentLang);
  const [saved, setSaved] = useState(false);
  const userIsPremium = (user as any)?.plan === 'premium' || (user as any)?.plan === 'family';

  function save() {
    const theme = THEMES.find(t => t.id === selectedTheme)!;
    // Segurança: não aplica tema premium se usuário não tem plano
    if (theme.premium && !userIsPremium) return;
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
              {!userIsPremium && (
                <div style={{ marginBottom: 10, padding: '8px 12px', background: 'rgba(124,58,237,0.15)', borderRadius: 8, border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>🔒</span>
                  <span style={{ color: '#c4b5fd', fontSize: 12 }}>Temas exclusivos disponíveis no plano <strong style={{ color: '#a78bfa' }}>Premium</strong></span>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {THEMES.map(theme => {
                  const locked = theme.premium && !userIsPremium;
                  const isSelected = selectedTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => !locked && setSelectedTheme(theme.id)}
                      title={locked ? 'Exclusivo Premium' : theme.name}
                      style={{
                        background: theme.bgBase,
                        border: isSelected ? `2px solid ${theme.accent}` : '2px solid #3a3a3a',
                        borderRadius: 8, padding: '8px 4px',
                        cursor: locked ? 'not-allowed' : 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        transition: 'border-color 0.15s',
                        opacity: locked ? 0.5 : 1,
                        position: 'relative',
                      }}
                    >
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: theme.accent, boxShadow: isSelected ? `0 0 8px ${theme.accent}` : 'none' }} />
                      <span style={{ color: theme.textPrimary, fontSize: 10, fontWeight: 600 }}>{theme.name}</span>
                      {locked && (
                        <span style={{ position: 'absolute', top: 4, right: 4, fontSize: 9, lineHeight: 1 }}>🔒</span>
                      )}
                    </button>
                  );
                })}
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

          {/* Ferramentas e Recursos */}
          <_SettingSection title="Ferramentas e Recursos">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '12px 14px' }}>
              <button onClick={onShowStats} style={{ padding: '12px 8px', background: '#242424', border: '1px solid #3a3a3a', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, textAlign: 'center' }}><span>📊</span><br/>Estatísticas</button>
              <button onClick={onShowQueue} style={{ padding: '12px 8px', background: '#242424', border: '1px solid #3a3a3a', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, textAlign: 'center' }}><span>📋</span><br/>Fila</button>
              <button onClick={onShowRecentlyPlayed} style={{ padding: '12px 8px', background: '#242424', border: '1px solid #3a3a3a', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, textAlign: 'center' }}><span>🕒</span><br/>Histórico</button>
              <button onClick={onShowEqualizer} style={{ padding: '12px 8px', background: '#242424', border: '1px solid #3a3a3a', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, textAlign: 'center' }}><span>🎚️</span><br/>Equalizador</button>
              <button onClick={onShowWrapped} style={{ padding: '12px 8px', background: '#242424', border: '1px solid #3a3a3a', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, textAlign: 'center' }}><span>🎁</span><br/>Wrapped 2026</button>
              <button onClick={onShowParty} style={{ padding: '12px 8px', background: '#242424', border: '1px solid #3a3a3a', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, textAlign: 'center' }}><span>🎉</span><br/>Listening Party</button>
              <button onClick={onTogglePrivate} style={{ padding: '12px 8px', background: '#242424', border: '1px solid #3a3a3a', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, textAlign: 'center' }}><span>🕵️</span><br/>Modo Anônimo</button>
              <button onClick={onShowAchievements} style={{ padding: '12px 8px', background: '#242424', border: '1px solid #3a3a3a', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, textAlign: 'center' }}><span>🏆</span><br/>Achievements</button>
              <button onClick={onShowLyricsSearch} style={{ padding: '12px 8px', background: '#242424', border: '1px solid #3a3a3a', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, textAlign: 'center' }}><span>🔍</span><br/>Letras</button>
              <button onClick={onShowGenreExplorer} style={{ padding: '12px 8px', background: '#242424', border: '1px solid #3a3a3a', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, textAlign: 'center' }}><span>🎧</span><br/>Gêneros</button>
              <button onClick={onShowMoodSelector} style={{ padding: '12px 8px', background: '#242424', border: '1px solid #3a3a3a', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, textAlign: 'center' }}><span>🎵</span><br/>Humor</button>
              <button onClick={onShowYearlyStats} style={{ padding: '12px 8px', background: '#242424', border: '1px solid #3a3a3a', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, textAlign: 'center' }}><span>📊</span><br/>Yearly Stats</button>
              <button onClick={onShowDarkModeSelector} style={{ padding: '12px 8px', background: '#242424', border: '1px solid #3a3a3a', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, textAlign: 'center' }}><span>🎨</span><br/>Dark Mode</button>
              <button onClick={onShowTempoPanel} style={{ padding: '12px 8px', background: '#242424', border: '1px solid #3a3a3a', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, textAlign: 'center' }}><span>⏱️</span><br/>Tempo</button>
              <button onClick={onShowListeningHeatmap} style={{ padding: '12px 8px', background: '#242424', border: '1px solid #3a3a3a', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, textAlign: 'center' }}><span>📊</span><br/>Heatmap</button>
              <button onClick={onShowFontSizePanel} style={{ padding: '12px 8px', background: '#242424', border: '1px solid #3a3a3a', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, textAlign: 'center' }}><span>🔤</span><br/>Fonte</button>
              <button onClick={onShowKeyboardShortcuts} style={{ padding: '12px 8px', background: '#242424', border: '1px solid #3a3a3a', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, textAlign: 'center' }}><span>⌨️</span><br/>Atalhos</button>
              <button onClick={onShowDyslexiaFont} style={{ padding: '12px 8px', background: '#242424', border: '1px solid #3a3a3a', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, textAlign: 'center' }}><span>📖</span><br/>Dislexia</button>
              <button onClick={onShowSetlistBuilder} style={{ padding: '12px 8px', background: '#242424', border: '1px solid #3a3a3a', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, textAlign: 'center' }}><span>🎵</span><br/>Setlist</button>
              <button onClick={onShowSimilarArtists} style={{ padding: '12px 8px', background: '#242424', border: '1px solid #3a3a3a', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, textAlign: 'center' }}><span>🎶</span><br/>Artistas</button>
              <button onClick={onShowTheoryDisplay} style={{ padding: '12px 8px', background: '#242424', border: '1px solid #3a3a3a', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, textAlign: 'center' }}><span>🎼</span><br/>Análise</button>
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

// ── Mini Player ───────────────────────────────────────────────────────────────
// ── Push Toast (WhatsApp-style, bottom-right) ─────────────────────────────────
interface PushToast { id: number; title: string; body: string; icon?: string; }

let _pushId = 0;
const _pushListeners: Set<(t: PushToast) => void> = new Set();

export function firePush(title: string, body: string, icon?: string) {
  const toast: PushToast = { id: ++_pushId, title, body, icon };
  _pushListeners.forEach(fn => fn(toast));
  // also fire native browser notification if permitted
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body, icon: icon ?? '/favicon.ico', silent: false });
  }
}

function PushToastContainer() {
  const [toasts, setToasts] = useState<PushToast[]>([]);

  useEffect(() => {
    const handler = (t: PushToast) => {
      setToasts(prev => [...prev.slice(-4), t]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 5500);
    };
    _pushListeners.add(handler);
    return () => { _pushListeners.delete(handler); };
  }, []);

  if (!toasts.length) return null;
  return (
    <div className="push-container">
      {toasts.map(t => (
        <div key={t.id} className="push-toast" onClick={() => setToasts(p => p.filter(x => x.id !== t.id))}>
          {t.icon && <img src={t.icon} className="push-toast__icon" alt="" />}
          <div className="push-toast__body">
            <div className="push-toast__title">{t.title}</div>
            <div className="push-toast__msg">{t.body}</div>
          </div>
          <button className="push-toast__close">✕</button>
        </div>
      ))}
    </div>
  );
}

// ── Mini Player (Spotify 2026 style) ─────────────────────────────────────────
interface MiniPlayerProps {
  song: { title: string; artist?: string; albumName?: string; coverUrl?: string } | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  onPlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (v: number) => void;
  onClose: () => void;
}

function MiniPlayer({ song, playing, currentTime, duration, onPlay, onPrev, onNext, onSeek, onClose }: MiniPlayerProps) {
  const [pos, setPos]     = useState({ x: window.innerWidth - 380, y: window.innerHeight - 220 });
  const [expanded, setExpanded] = useState(false);
  const dragging = useRef(false);
  const offset   = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  function onMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('button, input')) return;
    dragging.current = true;
    hasMoved.current = false;
    offset.current   = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return;
      hasMoved.current = true;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth  - (expanded ? 360 : 360), e.clientX - offset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - (expanded ? 200 : 80),  e.clientY - offset.current.y)),
      });
    }
    function onMouseUp() { dragging.current = false; }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, [expanded]);

  if (!song) return null;

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const fmtT = (s: number) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

  return (
    <div
      className={`sp-mini${expanded ? ' sp-mini--expanded' : ''}`}
      style={{ left: pos.x, top: pos.y, cursor: dragging.current ? 'grabbing' : 'default' }}
      onMouseDown={onMouseDown}
    >
      {/* blurred cover bg */}
      {song.coverUrl && (
        <div className="sp-mini__bg" style={{ backgroundImage: `url(${song.coverUrl})` }} />
      )}

      <div className="sp-mini__inner">
        {/* cover */}
        <div className={`sp-mini__cover${expanded ? ' sp-mini__cover--lg' : ''}`}>
          {song.coverUrl
            ? <img src={song.coverUrl} alt={song.title} />
            : <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#b3b3b3' }}><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
          }
        </div>

        <div className="sp-mini__content">
          {/* info */}
          <div className="sp-mini__info">
            <div className="sp-mini__title">{song.title}</div>
            <div className="sp-mini__artist">{song.artist ?? ''}{song.albumName ? ` · ${song.albumName}` : ''}</div>
          </div>

          {/* controls */}
          <div className="sp-mini__controls">
            <button className="sp-mini__btn" onClick={e => { e.stopPropagation(); onPrev(); }} title="Anterior">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
            </button>
            <button className="sp-mini__play" onClick={e => { e.stopPropagation(); onPlay(); }}>
              {playing
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              }
            </button>
            <button className="sp-mini__btn" onClick={e => { e.stopPropagation(); onNext(); }} title="Próxima">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
          </div>

          {/* progress bar */}
          {expanded && (
            <div className="sp-mini__progress">
              <span className="sp-mini__time">{fmtT(currentTime)}</span>
              <div className="sp-mini__bar-wrap" onClick={e => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                onSeek(((e.clientX - rect.left) / rect.width) * duration);
              }}>
                <div className="sp-mini__bar-fill" style={{ width: `${pct}%` }} />
                <div className="sp-mini__bar-thumb" style={{ left: `${pct}%` }} />
              </div>
              <span className="sp-mini__time">{fmtT(duration)}</span>
            </div>
          )}
        </div>

        {/* top-right actions */}
        <div className="sp-mini__actions">
          <button className="sp-mini__action-btn" onClick={e => { e.stopPropagation(); setExpanded(x => !x); }} title={expanded ? 'Compactar' : 'Expandir'}>
            {expanded
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            }
          </button>
          <button className="sp-mini__action-btn" onClick={e => { e.stopPropagation(); onClose(); }} title="Fechar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
      </div>

      {/* bottom progress strip (compact mode) */}
      {!expanded && (
        <div className="sp-mini__strip-wrap" onClick={e => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          onSeek(((e.clientX - rect.left) / rect.width) * duration);
        }}>
          <div className="sp-mini__strip-fill" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

// ── Song Carousel (Netflix-style) ────────────────────────────────────────────
const SongCarousel = memo(function SongCarousel({ title, songs, current, onPlay, onContextMenu, getDownloadStatus, onDownload, onGift }: {
  title: string;
  songs: Song[];
  current: Song | null;
  onPlay: (song: Song) => void;
  onContextMenu: (song: Song, x: number, y: number) => void;
  getDownloadStatus: (id: string) => any;
  onDownload: (id: string) => void;
  onGift: (song: Song) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);
  const SCROLL_AMOUNT = 172 * 4; // 4 cards + gap

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  function scroll(dir: 'left' | 'right') {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -SCROLL_AMOUNT : SCROLL_AMOUNT, behavior: 'smooth' });
    setTimeout(updateArrows, 350);
  }

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    return () => el.removeEventListener('scroll', updateArrows);
  }, [songs, updateArrows]);

  return (
    <div className="sp-carousel">
      <div className="sp-carousel__header">
        <div className="sp-carousel__title">{title}</div>
        <div className="sp-carousel__count">{songs.length} músicas</div>
      </div>
      <div className="sp-carousel__track-wrap">
        <button className="sp-carousel__arrow" onClick={() => scroll('left')} disabled={!canLeft} aria-label="Anterior">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        </button>
        <div ref={trackRef} className="sp-carousel__track">
          {songs.map(song => (
            <div key={song.id} className="sp-card"
              style={{ opacity: song.available === false ? 0.7 : 1, outline: current?.id === song.id ? '2px solid var(--accent)' : 'none' }}
              onClick={() => song.available !== false && onPlay(song)}
              onContextMenu={e => { e.preventDefault(); onContextMenu(song, e.clientX, e.clientY); }}>
              <div className="sp-card__art">
                {song.coverUrl
                  ? <img src={song.coverUrl} alt={song.title} loading="lazy" />
                  : <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#535353' }}><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>}
                {song.available !== false
                  ? <button className="sp-card__play" onClick={e => { e.stopPropagation(); onPlay(song); }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    </button>
                  : <div style={{ position: 'absolute', bottom: 8, right: 8, background: '#f59e0b', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontWeight: 700, color: '#000' }}>EM BREVE</div>}

              </div>
              <div className="sp-card__title">{song.title}</div>
              <div className="sp-card__sub">{song.artist ?? 'Artista desconhecido'}</div>
            </div>
          ))}
        </div>
        <button className="sp-carousel__arrow sp-carousel__arrow--right" onClick={() => scroll('right')} disabled={!canRight} aria-label="Próximo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        </button>
      </div>
    </div>
  );
});

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
    // Intercepta clique direito global para exibir menu customizado da plataforma
    useEffect(() => {
      function handleContextMenu(e) {
        // Permite menu nativo em campos de input/textarea
        if (
          e.target.tagName === 'INPUT' ||
          e.target.tagName === 'TEXTAREA' ||
          e.target.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        // Exibe menu customizado vazio (ou com opções globais)
        setContextMenu({ song: null, x: e.clientX, y: e.clientY });
      }
      window.addEventListener('contextmenu', handleContextMenu);
      return () => window.removeEventListener('contextmenu', handleContextMenu);
    }, []);
  const [token, setToken] = useState('');
  const [user, setUser] = useState<User | null>(null);
  // wsToken: real JWT for WebSocket (fetched after auth, stored in memory only)
  const [wsToken, setWsToken] = useState('');

  const [adminMode, setAdminMode] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const adminFromUrl = urlParams.get('admin') === '1';
    const adminFromSession = sessionStorage.getItem('adminMode') === 'true';
    return adminFromUrl || adminFromSession;
  });
  const [songs, setSongs] = useState<Song[]>([]);
  const [queue, setQueue] = useState<Song[]>(() => {
    try { const s = sessionStorage.getItem('player_queue'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [currentIdx, setCurrentIdx] = useState(() => {
    const i = sessionStorage.getItem('player_idx'); return i ? Number(i) : 0;
  });
  const [streamUrl, setStreamUrl] = useState(() => sessionStorage.getItem('player_url') ?? '');
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => {
    const t = sessionStorage.getItem('player_time'); return t ? Number(t) : 0;
  });
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const v = sessionStorage.getItem('player_vol'); return v ? Number(v) : 0.8;
  });
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(() => {
    return (sessionStorage.getItem('player_repeat') as RepeatMode) ?? 'off';
  });
  const [shuffled, setShuffled] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ songs: Song[]; albums: any[]; playlists: any[]; users: any[]; artists: any[] } | null>(null);
  const [tab, setTab] = useState<'tudo' | 'musicas'>('tudo');
  // New UI states
  const [showProfile, setShowProfile] = useState(false);
  const [showProfilePage, setShowProfilePage] = useState(() => sessionStorage.getItem('page') === 'profile');
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showMini, setShowMini] = useState(false);
  const [showAvatarEdit, setShowAvatarEdit] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<import('./hooks/usePlaylists').Playlist | null>(() => {
    try { const s = sessionStorage.getItem('selectedPlaylist'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [selectedAlbum, setSelectedAlbum] = useState<{ name: string; artist?: string; coverUrl?: string } | null>(null);
  // Modal para criar playlist
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [albumSongs, setAlbumSongs] = useState<Song[]>([]);
  const [loadingAlbum, setLoadingAlbum] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ song: Song; x: number; y: number } | null>(null);
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(() => loadSavedTheme());
  const [currentLang, setCurrentLang] = useState<Lang>(() => loadSavedLang());
  const isPremium = (user as any)?.plan === 'premium' || (user as any)?.plan === 'family';
  const { downloadSong, getStatus } = useDownloads(token, isPremium);
  const { playlists, create: createPlaylist, remove: removePlaylist, addSong: addToPlaylist } = usePlaylists(token);
  const { isFavorite, toggle: toggleFavorite, favoriteIds } = useFavorites(token);
  const { history, addToHistory, getRecentlyPlayed, getTopArtists, getTotalPlayTime } = usePlayHistory();
  const { badges: allBadges, stats: badgeStats } = useBadges(history);
  
  // Modal states
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showRecentlyPlayedModal, setShowRecentlyPlayedModal] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [showEqualizerModal, setShowEqualizerModal] = useState(false);
  const [showWrappedModal, setShowWrappedModal] = useState(false);
  
  // Equalizer state
  const [equalizerSettings, setEqualizerSettings] = useState({ bass: 0, mid: 0, treble: 0, volume: 100 });
  
  // Auto dark mode toggle
  const [autoDarkModeEnabled] = useState(() => localStorage.getItem('autoDarkMode') === 'true');
  
  // Recommendations engine
  const { generateRecommendations } = useRecommendationsEngine();
  
  // Radio 24/7
  const { currentStation, selectStation } = useRadioStreams();
  
  // Offline sync
  const { isOnline, syncProgress } = useOfflineSync();
  
  // Listening Party
  const { party, createParty } = useListeningParty(user?.id || 'guest');
  const [showPartyModal, setShowPartyModal] = useState(false);
  
  // Song Gifting
  const { sendGift } = useSongGifting(user?.id || 'guest');
  const [showGiftingModal, setShowGiftingModal] = useState(false);
  const [giftingSong, setGiftingSong] = useState<{ id: string; title: string; artist?: string } | null>(null);

  // ── PHASE 5 Features ──
  const { isPrivateMode, togglePrivateMode } = usePrivateMode();
  const { achievements, getUnlockedCount } = useAchievements(history);
  const { stats, updateStats } = useYearlyStats(history);
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showYearlyStats, setShowYearlyStats] = useState(false);
  const [showLyricsSearch, setShowLyricsSearch] = useState(false);
  const [showGenreExplorer, setShowGenreExplorer] = useState(false);
  const [showQRShare, setShowQRShare] = useState(false);
  const [currentQRPlaylist] = useState<{ name: string; id: string } | null>(null);
  const [showDarkModeSelector, setShowDarkModeSelector] = useState(false);
  const [moodEmoji, setMoodEmoji] = useState('😊');

  // ── PHASE 6 Features (TOP 15) ──
  // 1. Tempo Control
  const tempoControl = useTempoControl();
  const [showTempoPanel, setShowTempoPanel] = useState(false);

  // 2. Crossfade
  // @ts-ignore - Phase 6 audio feature
  const _crossfadeControl = useCrossfade();

  // 3. Karaoke Mode
  // @ts-ignore - Phase 6 audio feature
  const _karaokeControl = useKaraokeMode();

  // 4. Audio Ducking
  // @ts-ignore - Phase 6 audio feature
  const _duckingControl = useAudioDucking();

  // 5. Smart Queue
  // @ts-ignore - Phase 6 recommendation feature
  const _smartQueueControl = useSmartQueue(moodEmoji);

  // 6. Music Theory
  // @ts-ignore - Phase 6 analyzer feature
  const _theoryControl = useMusicTheory();
  const [showTheoryDisplay, setShowTheoryDisplay] = useState(false);
  const [currentTheory, setCurrentTheory] = useState<any>(null);

  // 7. 3D Visualizer
  const [showVisualizer, _setShowVisualizer] = useState(false);

  // 8. Similar Artists Chain
  const [showSimilarArtists, setShowSimilarArtists] = useState(false);

  // 9. Gapless Playback  
  // @ts-ignore - Phase 6 playback feature
  const _gaplessControl = useGaplessPlayback();

  // 10. Listening Heatmap
  // @ts-ignore - Phase 6 analytics feature
  const _heatmapControl = useListeningHeatmap();
  const [showListeningHeatmap, setShowListeningHeatmap] = useState(false);

  // 11. Font Size Adjuster
  // @ts-ignore - Phase 6 accessibility feature
  const _fontControl = useFontSizeAdjuster();
  const [showFontSizePanel, setShowFontSizePanel] = useState(false);

  // 12. Voice Commands
  // @ts-ignore - Phase 6 voice feature
  const _voiceControl = useVoiceCommands('');
  const [_showVoiceControl] = useState(false);

  // 13. Keyboard Shortcuts
  // @ts-ignore - Phase 6 accessibility feature
  const _keyboardControl = useKeyboardShortcuts([]);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // 14. Dyslexia Font
  // @ts-ignore - Phase 6 accessibility feature
  const _dyslexiaControl = useDyslexiaFont();
  const [showDyslexiaFont, setShowDyslexiaFont] = useState(false);

  // 15. Setlist Builder
  // @ts-ignore - Phase 6 playlists feature
  const _setlistControl = useSetlistBuilder();
  const [showSetlistBuilder, setShowSetlistBuilder] = useState(false);
  
  const [premiumPopup, setPremiumPopup] = useState<{ message: string; durationLabel: string; expiresAt: string | null } | null>(null);
  // Translation helper — re-evaluates when lang changes
  const tr = (key: string) => {
    const map = TRANSLATIONS[currentLang] ?? TRANSLATIONS['pt'];
    return map[key] ?? TRANSLATIONS['pt'][key] ?? key;
  };
  const { devices, connected, transferTo } = useDevices({
    token: wsToken,
    onPlaybackSync: (event) => {
      if (event.action === 'pause') setPlaying(false);
    },
    onPremiumGranted: (data: any) => {
      setPremiumPopup(data);
      setUser(u => u ? { ...u, plan: data.plan } as any : u);
    },
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [showFriendFeed, setShowFriendFeed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const nextAudioRef = useRef<HTMLAudioElement>(null);
  const restoredRef = useRef(false);
  const isRestoringRef = useRef(false);

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
    // fire push toast (visible even when tab is in background via Web Notifications)
    firePush('OursMusic', msg, '/favicon.ico');
  }

  // request notification permission once
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Fetch album songs when album is selected
  useEffect(() => {
    if (!selectedAlbum) return;
    setLoadingAlbum(true);
    apiFetch(`/search?q=${encodeURIComponent(selectedAlbum.name)}`, token)
      .then(result => {
        if (result && result.songs) {
          // Filter songs by album name (to ensure they belong to the selected album)
          const filtered = result.songs.filter((s: Song) => 
            s.albumName?.toLowerCase() === selectedAlbum.name.toLowerCase()
          );
          setAlbumSongs(filtered.length > 0 ? filtered : result.songs);
        } else {
          setAlbumSongs([]);
        }
      })
      .catch(() => setAlbumSongs([]))
      .finally(() => setLoadingAlbum(false));
  }, [selectedAlbum, token]);

  // Listener de broadcast global (enviado pelo admin para todas as plataformas)
  useEffect(() => {
    function onBroadcast(e: Event) {
      const data = (e as CustomEvent).detail as { message: string; type: string };
      const icons: Record<string, string> = { info: 'ℹ️', update: '🚀', warning: '⚠️' };
      addNotification(`${icons[data.type] ?? '📢'} ${data.message}`);
    }
    window.addEventListener('app:broadcast', onBroadcast);
    return () => window.removeEventListener('app:broadcast', onBroadcast);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔔 Listener for all notification types (follower, plan updates, etc)
  useEffect(() => {
    function onNotification(e: Event) {
      const data = (e as CustomEvent).detail as { type: string; message: string; event?: string; [key: string]: any };
      console.log('🔔 Notification event received:', data.type, data.message);
      addNotification(data.message);
    }
    window.addEventListener('notif:received', onNotification);
    return () => window.removeEventListener('notif:received', onNotification);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-restore session via cookie HttpOnly ao carregar/recarregar ────────
  useEffect(() => {
    // Só tenta restaurar se havia uma sessão ativa (evita logout desnecessário)
    if (!localStorage.getItem('om_session')) return;
    let cancelled = false;
    async function restoreSession() {
      try {
        const rt = sessionStorage.getItem('_rt') ?? '';
        const r = await fetch(`${API}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...EXTRA_HEADERS },
          credentials: 'include',
          body: JSON.stringify(rt ? { refresh_token: rt } : {}),
        });
        if (!r.ok || cancelled) {
          localStorage.removeItem('om_session');
          return;
        }
        const data = await r.json();
        if (data?.access_token) {
          _token = data.access_token;
          sessionStorage.setItem('_om_access', data.access_token);
          if (data.refresh_token) sessionStorage.setItem('_rt', data.refresh_token);
        }
        if (data?.user && !cancelled) {
          await onAuth(data.user);
        }
      } catch {
        // Sem conexão — mantém flag
      }
    }
    restoreSession();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onAuth(u: User) {
    // Cookie HttpOnly já foi setado pelo backend — busca dados completos
    // Usa o JWT real em memória se disponível (cross-origin ngrok), senão usa flag
    setToken(_token || 'authenticated');
    // NÃO zera _token aqui — pode ter sido setado pelo login cross-origin
    // _token = '';
    // Persiste flag no localStorage para sobreviver a F5
    localStorage.setItem('om_session', '1');
    try {
      const [profile, meData, wsData] = await Promise.allSettled([
        apiFetch('/social/profile/me', ''),
        apiFetch('/auth/me', ''),
        apiFetch('/auth/ws-token', ''),
      ]);
      const p = profile.status === 'fulfilled' ? profile.value : {};
      const m = meData.status === 'fulfilled' ? meData.value : {};
      const ws = wsData.status === 'fulfilled' ? wsData.value : {};
      if (ws?.token) setWsToken(ws.token);
      const fullUser = { ...u, ...p, isAdmin: m?.isAdmin ?? u.isAdmin ?? false };
      setUser(fullUser);
      // Re-aplica tema salvo agora que sabemos o plano do usuário
      const userPremium = (fullUser as any)?.plan === 'premium' || (fullUser as any)?.plan === 'family';
      setCurrentTheme(loadSavedTheme(userPremium));
    } catch {
      setUser(u);
    }
  }
  function logout() {
    // Invalida sessão no servidor e limpa cookies
    fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    setToken(''); setUser(null); _token = ''; setWsToken('');
    localStorage.removeItem('om_session');
    sessionStorage.clear();
    setPlaying(false); setStreamUrl(''); setQueue([]); setAdminMode(false);
  }
  function enterAdmin() {
    const adminUrl = new URL(window.location.href);
    adminUrl.searchParams.set('admin', '1');
    window.open(adminUrl.toString(), '_blank');
  }
  function exitAdmin() { sessionStorage.removeItem('adminMode'); setAdminMode(false); }


  useEffect(() => {
    if (!token) return;
    apiFetch('/songs', token).then(d => {
      if (Array.isArray(d)) setSongs(d);
      else if (d?.songs && Array.isArray(d.songs)) setSongs(d.songs);
      else setSongs([]);
    }).catch(() => setSongs([]));
  }, [token]);

  // Atualizar músicas quando uma nova for adicionada (sem recarregar a página)
  const refreshSongs = useCallback(async () => {
    if (!token) return;
    setIsRefreshing(true);
    try {
      const data = await apiFetch('/songs', token);
      if (Array.isArray(data)) setSongs(data);
      else if (data?.songs && Array.isArray(data.songs)) setSongs(data.songs);
    } catch (e) {
      console.error('Erro ao atualizar músicas:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [token]);

  // Escutar evento de nova música adicionada
  useEffect(() => {
    const handleSongUploaded = () => {
      setTimeout(() => refreshSongs(), 1000);
    };
    window.addEventListener('songUploaded', handleSongUploaded);
    return () => window.removeEventListener('songUploaded', handleSongUploaded);
  }, [refreshSongs]);

  // Persiste estado do player no sessionStorage
  useEffect(() => { if (queue.length) sessionStorage.setItem('player_queue', JSON.stringify(queue)); }, [queue]);
  useEffect(() => { sessionStorage.setItem('player_idx', String(currentIdx)); }, [currentIdx]);
  useEffect(() => { sessionStorage.setItem('player_vol', String(volume)); }, [volume]);
  useEffect(() => { sessionStorage.setItem('player_repeat', repeatMode); }, [repeatMode]);
  useEffect(() => { sessionStorage.setItem('player_was_playing', String(playing)); }, [playing]);
  useEffect(() => { updateStats(history); }, [history, updateStats]);

  // Restaura player após F5 — re-busca URL fresca (signed URLs expiram)
  useEffect(() => {
    if (restoredRef.current || !token) return;
    const savedQueue = (() => { try { const s = sessionStorage.getItem('player_queue'); return s ? JSON.parse(s) : []; } catch { return []; } })();
    const savedIdx = Number(sessionStorage.getItem('player_idx') ?? 0);
    const savedTime = Number(sessionStorage.getItem('player_time') ?? 0);
    const savedPlaying = sessionStorage.getItem('player_was_playing') === 'true';
    const song = savedQueue[savedIdx];
    if (!song?.id) return;
    restoredRef.current = true;
    isRestoringRef.current = true;

    apiFetch(`/songs/stream/${song.id}`, token).then(data => {
      if (!data?.url) { isRestoringRef.current = false; return; }
      setQueue(savedQueue);
      setCurrentIdx(savedIdx);
      setStreamUrl(data.url);

      const a = audioRef.current;
      if (!a) { isRestoringRef.current = false; return; }
      a.src = data.url;
      a.volume = volume;
      a.load();

      const onCanPlay = () => {
        isRestoringRef.current = false;
        if (savedTime > 1) a.currentTime = savedTime;
        if (savedPlaying) {
          a.play().then(() => setPlaying(true)).catch(() => {});
        }
      };
      a.addEventListener('canplay', onCanPlay, { once: true });
    }).catch(() => { isRestoringRef.current = false; });
  }, [token]);

  // Persiste estado de navegação no sessionStorage
  useEffect(() => {
    if (showProfilePage) sessionStorage.setItem('page', 'profile');
    else sessionStorage.removeItem('page');
  }, [showProfilePage]);

  useEffect(() => {
    if (selectedPlaylist) sessionStorage.setItem('selectedPlaylist', JSON.stringify(selectedPlaylist));
    else sessionStorage.removeItem('selectedPlaylist');
  }, [selectedPlaylist]);

  // 🌙 Auto dark mode effect
  useEffect(() => {
    if (autoDarkModeEnabled) {
      localStorage.setItem('autoDarkMode', 'true');
      const cleanup = enableAutoDarkMode(theme => setCurrentTheme(theme));
      return cleanup;
    } else {
      localStorage.setItem('autoDarkMode', 'false');
    }
  }, [autoDarkModeEnabled]);

  async function playSong(song: Song, list?: Song[]) {
    if (!token) return;
    try {
      const data = await apiFetch(`/songs/stream/${song.id}`, token);
      const newQueue = list ?? songs;
      const idx = newQueue.findIndex(s => s.id === song.id);
      setQueue(newQueue); setCurrentIdx(idx >= 0 ? idx : 0);
      setStreamUrl(data.url); setPlaying(true);
      
      // 📊 Track play history
      addToHistory({ songId: song.id, title: song.title, artist: song.artist || 'Unknown', duration: song.duration });
    } catch (e: any) { console.warn('Stream error:', e.message); }
  }

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !streamUrl) return;
    if (isRestoringRef.current) return; // restauração gerencia o src diretamente
    a.src = streamUrl;
    a.play().catch(() => {});
  }, [streamUrl]);
  useEffect(() => { const a = audioRef.current; if (!a) return; playing ? a.play().catch(() => {}) : a.pause(); }, [playing]);
  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  function handleTimeUpdate() {
    const a = audioRef.current; if (!a) return;
    setCurrentTime(a.currentTime);
    // Persiste posição a cada segundo
    sessionStorage.setItem('player_time', String(Math.floor(a.currentTime)));
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
  async function doSearch(q: string) { if (!q.trim()) { setSearchResults(null); return; } try { const d = await apiFetch(`/search?q=${encodeURIComponent(q)}`, token); setSearchResults({ songs: d.songs ?? [], albums: d.albums ?? [], playlists: d.playlists ?? [], users: d.users ?? [], artists: d.artists ?? [] }); } catch { setSearchResults({ songs: [], albums: [], playlists: [], users: [], artists: [] }); } }

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
  const displaySongs = searchResults?.songs ?? songs;
  const current = queue[currentIdx] ?? null;

  // Agrupa músicas por álbum para os carrosséis — memoizado para não recalcular a cada render
  const carousels = useMemo(() => {
    const MAX_PER_ROW = 20;
    const result: { title: string; songs: Song[] }[] = [];
    const used = new Set<string>();

    // 1. Recentes — primeiras 20 disponíveis
    const recentes = songs.filter(s => s.available !== false).slice(0, MAX_PER_ROW);
    if (recentes.length > 0) {
      result.push({ title: 'Adicionadas Recentemente', songs: recentes });
      recentes.forEach(s => used.add(s.id));
    }

    // 2. Agrupa por albumName
    const albumMap = new Map<string, Song[]>();
    for (const s of songs) {
      const key = s.albumName?.trim() || null;
      if (!key) continue;
      if (!albumMap.has(key)) albumMap.set(key, []);
      albumMap.get(key)!.push(s);
    }

    // Ordena álbuns por quantidade de músicas
    const sorted = [...albumMap.entries()].sort((a, b) => b[1].length - a[1].length);
    for (const [albumName, albumSongs] of sorted) {
      if (result.length >= 10) break;
      const fresh = albumSongs.filter(s => !used.has(s.id)).slice(0, MAX_PER_ROW);
      if (fresh.length < 2) continue;
      fresh.forEach(s => used.add(s.id));
      result.push({ title: albumName, songs: fresh });
    }

    // 3. Agrupa por artista (músicas que sobraram)
    const artistMap = new Map<string, Song[]>();
    for (const s of songs) {
      if (used.has(s.id)) continue;
      const key = s.artist?.trim() || null;
      if (!key) continue;
      if (!artistMap.has(key)) artistMap.set(key, []);
      artistMap.get(key)!.push(s);
    }
    const sortedArtists = [...artistMap.entries()].sort((a, b) => b[1].length - a[1].length);
    for (const [artistName, artistSongs] of sortedArtists) {
      if (result.length >= 12) break;
      const fresh = artistSongs.filter(s => !used.has(s.id)).slice(0, MAX_PER_ROW);
      if (fresh.length < 2) continue;
      fresh.forEach(s => used.add(s.id));
      result.push({ title: artistName, songs: fresh });
    }

    // 4. Resto sem categoria
    const rest = songs.filter(s => !used.has(s.id)).slice(0, MAX_PER_ROW);
    if (rest.length >= 2) result.push({ title: 'Mais Músicas', songs: rest });

    return result;
  }, [songs]);

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

  // Player bar e audio ficam sempre montados — independente da view
  const persistentPlayer = (
    <>
      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)} onEnded={handleEnded} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
      <audio ref={nextAudioRef} preload="auto" aria-hidden="true" />
    </>
  );

  if (adminMode && user?.isAdmin) return (
    <>
      <AdminPanel token={token} userEmail={user.email} onExit={exitAdmin} onLogout={logout} />
    </>
  );

  return (
    <div className="sp-root">
      {/* HEADER */}
      <header className="sp-header">
        <div className="sp-header__logo">
          <OursMusicLogo size={22} showName={true} nameFontSize={15} />
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
            <button 
              className="sp-header__home-btn" 
              title="Atualizar plataforma" 
              onClick={refreshSongs}
              style={{ opacity: isRefreshing ? 0.5 : 1, cursor: isRefreshing ? 'wait' : 'pointer', transition: 'opacity 0.2s' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }}>
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-8 3.58-8 8s3.58 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h6V5l-1.35 1.35z"/>
              </svg>
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
          {/* Botão de download */}
          <button className="sp-header__icon-btn" onClick={installApp} title="Instalar aplicativo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
          </button>
          {/* Botão de notificações */}
          <div style={{ position: 'relative' }}>
            <button className="sp-header__icon-btn" onClick={() => { setShowNotif(n => !n); if (!showNotif) setNotifications([]); }} title="Notificações">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
              {notifications.length > 0 && <span className="sp-notif-badge">{notifications.length}</span>}
            </button>
            {showNotif && (
              <div className="sp-notif-panel">
                <div className="sp-notif-panel__header">
                  <span>Notificações</span>
                  <button onClick={() => { setShowNotif(false); }} style={{ color: '#b3b3b3', fontSize: 12 }}>✕</button>
                </div>
                {notifications.length === 0
                  ? <div style={{ padding: '20px 16px', color: '#b3b3b3', fontSize: 13 }}>Nenhuma notificação</div>
                  : notifications.map((n, i) => <div key={i} className="sp-notif-item">{n}</div>)}
              </div>
            )}
          </div>
          {/* Botão de atividades de amigos */}
          <button className="sp-header__icon-btn" title="Atividade de amigos" onClick={() => setShowFriendFeed(f => !f)} style={{ color: showFriendFeed ? 'var(--accent, #1db954)' : undefined }}>
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
              onShowStats={() => { setShowStatsModal(true); setShowProfile(false); }}
              onShowQueue={() => { setShowQueueModal(true); setShowProfile(false); }}
              onShowRecentlyPlayed={() => { setShowRecentlyPlayedModal(true); setShowProfile(false); }}
              onShowEqualizer={() => { setShowEqualizerModal(true); setShowProfile(false); }}
              onShowWrapped={() => { setShowWrappedModal(true); setShowProfile(false); }}
              onShowParty={() => { createParty(); setShowPartyModal(true); setShowProfile(false); }}
              onTogglePrivate={() => { togglePrivateMode(); setShowProfile(false); }}
              onShowAchievements={() => { setShowAchievements(true); setShowProfile(false); }}
              onShowLyricsSearch={() => { setShowLyricsSearch(true); setShowProfile(false); }}
              onShowGenreExplorer={() => { setShowGenreExplorer(true); setShowProfile(false); }}
              onShowMoodSelector={() => { setShowMoodSelector(true); setShowProfile(false); }}
              onShowYearlyStats={() => { setShowYearlyStats(true); setShowProfile(false); }}
              onShowDarkModeSelector={() => { setShowDarkModeSelector(true); setShowProfile(false); }}
              onShowTempoPanel={() => { setShowTempoPanel(true); setShowProfile(false); }}
              onShowListeningHeatmap={() => { setShowListeningHeatmap(true); setShowProfile(false); }}
              onShowFontSizePanel={() => { setShowFontSizePanel(true); setShowProfile(false); }}
              onShowKeyboardShortcuts={() => { setShowKeyboardShortcuts(true); setShowProfile(false); }}
              onShowDyslexiaFont={() => { setShowDyslexiaFont(true); setShowProfile(false); }}
              onShowSetlistBuilder={() => { setShowSetlistBuilder(true); setShowProfile(false); }}
              onShowSimilarArtists={() => { setShowSimilarArtists(true); setShowProfile(false); }}
              onShowTheoryDisplay={() => { if (current) { setCurrentTheory({ bpm: 120, key: 'C', scale: 'Major', timeSignature: '4/4', energy: 75, danceability: 68 }); setShowTheoryDisplay(true); setShowProfile(false); } }}
              current={current}
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
            <button className="sp-sidebar__create" onClick={() => setShowCreatePlaylist(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg> Criar
            </button>
          </div>
          <div className="sp-sidebar__list">
            {/* Exibe músicas curtidas se houver */}
            {favoriteIds.size > 0 && (
              <div className={`sp-sidebar__item${!selectedPlaylist ? ' sp-sidebar__item--active' : ''}`} onClick={() => setSelectedPlaylist(null)}>
                <div className="sp-sidebar__item-art" style={{ background: 'linear-gradient(135deg,#450af5,#c4efd9)' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></div>
                <div className="sp-sidebar__item-info">
                  <div className={`sp-sidebar__item-name${!selectedPlaylist ? ' sp-sidebar__item-name--active' : ''}`}>{tr('likedSongs')}</div>
                  <div className="sp-sidebar__item-sub">Playlist · {favoriteIds.size} músicas</div>
                </div>
              </div>
            )}
            {/* Exibe playlists do usuário se houver */}
            {playlists.length > 0 && playlists.map(pl => (
              <div key={pl.id} className={`sp-sidebar__item${selectedPlaylist?.id === pl.id ? ' sp-sidebar__item--active' : ''}`}
                onClick={() => setSelectedPlaylist(pl)}>
                <div className="sp-sidebar__item-art" style={{
                  background: pl.coverUrl ? `url(${pl.coverUrl})` : '#2a2a2a',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  {!pl.coverUrl && <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#b3b3b3' }}><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>}
                </div>
                <div className="sp-sidebar__item-info">
                  <div className={`sp-sidebar__item-name${selectedPlaylist?.id === pl.id ? ' sp-sidebar__item-name--active' : ''}`}>{pl.title}</div>
                  <div className="sp-sidebar__item-sub">Playlist · {pl.songs?.length ?? 0} músicas</div>
                </div>
                <button style={{ color: '#b3b3b3', padding: '4px', marginLeft: 'auto', flexShrink: 0, fontSize: 16 }}
                  onClick={e => { e.stopPropagation(); if (confirm(`Excluir "${pl.title}"?`)) removePlaylist(pl.id); }}>✕</button>
              </div>
            ))}
            {/* Exibe promoção só se não houver playlists nem músicas curtidas */}
            {playlists.length === 0 && favoriteIds.size === 0 && (
              <div className="sp-sidebar__promo">
                <div className="sp-sidebar__promo-title">Crie sua primeira playlist</div>
                <div className="sp-sidebar__promo-sub">É fácil, vamos te ajudar.</div>
                <button className="sp-sidebar__promo-btn" onClick={() => setShowCreatePlaylist(true)}>Criar playlist</button>
                <CreatePlaylistModal
                  open={showCreatePlaylist}
                  onClose={() => setShowCreatePlaylist(false)}
                  onCreate={async (name, coverUrl) => {
                    if (name?.trim()) await createPlaylist(name.trim(), coverUrl);
                  }}
                />
              </div>
            )}
          </div>
        </aside>

        <main className="sp-main" style={{ background: `linear-gradient(180deg, rgb(${accentColor}) 0%, #121212 340px)` }}>
          <div className="sp-main__tabs">
            <button className={`sp-main__tab${tab === 'tudo' && !search ? ' sp-main__tab--active' : ''}`} onClick={() => { setTab('tudo'); setSearch(''); setSearchResults(null); }}>{tr('home')}</button>
            <button className={`sp-main__tab${tab === 'musicas' && !search ? ' sp-main__tab--active' : ''}`} onClick={() => { setTab('musicas'); setSearch(''); setSearchResults(null); }}>{tr('search')}</button>
          </div>
          <div className="sp-main__content">
            {selectedPlaylist ? (
              /* ── Playlist detail view ── */
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginBottom: 32, padding: '8px 0' }}>
                  <div style={{
                    width: 160, height: 160, borderRadius: 8,
                    background: selectedPlaylist.coverUrl ? `url(${selectedPlaylist.coverUrl})` : '#2a2a2a',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 32px rgba(0,0,0,.5)'
                  }}>
                    {!selectedPlaylist.coverUrl && <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#535353' }}><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b3b3b3', marginBottom: 8 }}>Playlist</div>
                    <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 8 }}>{selectedPlaylist.title}</div>
                    <div style={{ color: '#b3b3b3', fontSize: 14 }}>{selectedPlaylist.songs?.length ?? 0} músicas</div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                      {selectedPlaylist.songs?.length > 0 && (
                        <button className="sp-card__play" style={{ position: 'static', opacity: 1, transform: 'none', width: 56, height: 56 }}
                          onClick={() => { const songs = selectedPlaylist.songs.map(s => s.song as any); if (songs.length) playSong(songs[0], songs); }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                        </button>
                      )}
                      <button onClick={() => removePlaylist(selectedPlaylist.id).then(() => setSelectedPlaylist(null))}
                        style={{ background: 'none', border: '1px solid #535353', color: '#b3b3b3', borderRadius: 500, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        Excluir playlist
                      </button>
                    </div>
                  </div>
                </div>
                <div className="sp-song-list">
                  {selectedPlaylist.songs?.length === 0 ? (
                    <div className="sp-empty"><div className="sp-empty__icon">🎵</div><div className="sp-empty__title">Playlist vazia</div><div style={{ color: '#b3b3b3' }}>Adicione músicas clicando em ⋯ em qualquer música</div></div>
                  ) : selectedPlaylist.songs?.map((item, i) => {
                    const song = item.song as any;
                    return (
                      <div key={song.id} className="sp-song-row" onClick={() => playSong(song, selectedPlaylist.songs.map(s => s.song as any))} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ song, x: e.clientX, y: e.clientY }); }}>
                        <div className="sp-song-row__num">{current?.id === song.id ? <span style={{ color: 'var(--accent)' }}>♪</span> : i + 1}</div>
                        <div className="sp-song-row__play"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
                        <div className="sp-song-row__info"><div className={`sp-song-row__title${current?.id === song.id ? ' sp-song-row__title--active' : ''}`}>{song.title}</div><div className="sp-song-row__artist">{song.artist ?? 'Artista desconhecido'}</div></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="sp-song-row__dur">{Math.floor(song.duration/60)}:{String(song.duration%60).padStart(2,'0')}</span>
                          <button style={{ background: 'none', border: 'none', color: '#b3b3b3', cursor: 'pointer', padding: 4, fontSize: 12 }} onClick={e => { e.stopPropagation(); setGiftingSong(song); setShowGiftingModal(true); }} title="💝 Enviar como presente">💝</button>
                          <button style={{ background: 'none', border: 'none', color: '#b3b3b3', cursor: 'pointer', padding: 4, fontSize: 12 }} onClick={e => { e.stopPropagation(); }} title="🎬 Ver vídeo clipe">🎬</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : selectedAlbum ? (
              /* ── Album detail view ── */
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginBottom: 32, padding: '8px 0' }}>
                  <div style={{ width: 160, height: 160, borderRadius: 8, background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,.5)' }}>
                    {selectedAlbum.coverUrl ? <img src={selectedAlbum.coverUrl} alt={selectedAlbum.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#535353' }}><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b3b3b3', marginBottom: 8 }}>Álbum</div>
                    <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 8 }}>{selectedAlbum.name}</div>
                    <div style={{ color: '#b3b3b3', fontSize: 14 }}>{selectedAlbum.artist} · {albumSongs.length} músicas</div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                      {albumSongs.length > 0 && (
                        <button className="sp-card__play" style={{ position: 'static', opacity: 1, transform: 'none', width: 56, height: 56 }}
                          onClick={() => { if (albumSongs.length) playSong(albumSongs[0], albumSongs); }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                        </button>
                      )}
                      <button onClick={() => setSelectedAlbum(null)}
                        style={{ background: 'none', border: '1px solid #535353', color: '#b3b3b3', borderRadius: 500, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        Fechar álbum
                      </button>
                    </div>
                  </div>
                </div>
                <div className="sp-song-list">
                  {loadingAlbum ? (
                    <div className="sp-empty"><div className="sp-empty__icon">🎵</div><div className="sp-empty__title">Carregando músicas...</div></div>
                  ) : albumSongs.length === 0 ? (
                    <div className="sp-empty"><div className="sp-empty__icon">🎵</div><div className="sp-empty__title">Nenhuma música encontrada</div></div>
                  ) : albumSongs.map((song, i) => (
                    <div key={song.id} className="sp-song-row" onClick={() => song.available !== false && playSong(song, albumSongs)} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ song, x: e.clientX, y: e.clientY }); }} style={{ opacity: song.available === false ? 0.5 : 1, cursor: song.available === false ? 'default' : 'pointer' }}>
                      <div className="sp-song-row__num">{current?.id === song.id ? <span style={{ color: 'var(--accent)' }}>♪</span> : i + 1}</div>
                      <div className="sp-song-row__play"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
                      <div className="sp-song-row__info"><div className={`sp-song-row__title${current?.id === song.id ? ' sp-song-row__title--active' : ''}`}>{song.title}</div><div className="sp-song-row__artist">{song.artist ?? 'Artista desconhecido'}</div></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="sp-song-row__dur">{fmt(song.duration)}</span>
                        {song.available !== false && (
                          <>
                            <button style={{ background: 'none', border: 'none', color: '#b3b3b3', cursor: 'pointer', padding: 4, fontSize: 12 }} onClick={e => { e.stopPropagation(); setGiftingSong(song); setShowGiftingModal(true); }} title="💝 Enviar como presente">💝</button>
                            <button style={{ background: 'none', border: 'none', color: '#b3b3b3', cursor: 'pointer', padding: 4, fontSize: 12 }} onClick={e => { e.stopPropagation(); }} title="🎬 Ver vídeo clipe">🎬</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : search || searchResults ? (
              <div className="sp-section">
                <div className="sp-section__header"><div className="sp-section__title">{search ? `Resultados para "${search}"` : 'Todas as músicas'}</div></div>
                {searchResults && (searchResults.songs.length + searchResults.albums.length + searchResults.playlists.length + searchResults.users.length + searchResults.artists.length) === 0 ? (
                  <div className="sp-empty"><div className="sp-empty__icon">🔍</div><div className="sp-empty__title">Nenhum resultado</div></div>
                ) : (
                  <>
                    {/* Artistas */}
                    <ArtistSearchResults
                      artists={searchResults?.artists ?? []}
                      token={token}
                      onPlaySong={playSong}
                    />

                    {/* Músicas */}
                    {displaySongs.length > 0 && (
                      <>
                        <div style={{ color: '#b3b3b3', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, padding: '8px 0 6px' }}>Músicas</div>
                        <div className="sp-song-list">
                          {displaySongs.map((song, i) => (
                            <div key={song.id} className="sp-song-row" onClick={() => song.available !== false && playSong(song, displaySongs)} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ song, x: e.clientX, y: e.clientY }); }} style={{ opacity: song.available === false ? 0.5 : 1, cursor: song.available === false ? 'default' : 'pointer' }}>
                              <div className="sp-song-row__num">{current?.id === song.id ? <span style={{ color: 'var(--accent)' }}>♪</span> : i + 1}</div>
                              <div className="sp-song-row__play"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
                              <div className="sp-song-row__info"><div className={`sp-song-row__title${current?.id === song.id ? ' sp-song-row__title--active' : ''}`}>{song.title}</div><div className="sp-song-row__artist">{song.artist ?? 'Artista desconhecido'}{song.albumName ? ` · ${song.albumName}` : ''}</div></div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <DownloadButton status={getStatus(song.id)} onClick={e => { e.stopPropagation(); downloadSong(song.id); }} />
                                <span className="sp-song-row__dur">{fmt(song.duration)}</span>
                                {song.available !== false && (
                                  <>
                                    <button style={{ background: 'none', border: 'none', color: '#b3b3b3', cursor: 'pointer', padding: 4, fontSize: 12 }} onClick={e => { e.stopPropagation(); setGiftingSong(song); setShowGiftingModal(true); }} title="💝 Enviar como presente">💝</button>
                                    <button style={{ background: 'none', border: 'none', color: '#b3b3b3', cursor: 'pointer', padding: 4, fontSize: 12 }} onClick={e => { e.stopPropagation(); }} title="🎬 Ver vídeo clipe">🎬</button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Álbuns */}
                    {searchResults && searchResults.albums.length > 0 && (
                      <>
                        <div style={{ color: '#b3b3b3', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, padding: '16px 0 6px' }}>Álbuns</div>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          {searchResults.albums.map((alb: any) => (
                            <div key={alb.name} style={{ width: 140, cursor: 'pointer' }}
                              onClick={() => setSelectedAlbum({ name: alb.name, artist: alb.artist, coverUrl: alb.coverUrl })}>
                              <div style={{ width: 140, height: 140, borderRadius: 8, overflow: 'hidden', background: '#2a2a2a', marginBottom: 6 }}>
                                {alb.coverUrl ? <img src={alb.coverUrl} alt={alb.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#535353' }}><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg></div>}
                              </div>
                              <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alb.name}</div>
                              <div style={{ color: '#b3b3b3', fontSize: 11 }}>{alb.artist ?? ''} · {alb.songCount} faixas</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Playlists */}
                    {searchResults && searchResults.playlists.length > 0 && (
                      <>
                        <div style={{ color: '#b3b3b3', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, padding: '16px 0 6px' }}>Playlists</div>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          {searchResults.playlists.map((pl: any) => (
                            <div key={pl.id} style={{ width: 140, cursor: 'default' }}>
                              <div style={{ width: 140, height: 140, borderRadius: 8, background: 'linear-gradient(135deg,#450af5,#c4efd9)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="#fff"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>
                              </div>
                              <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.title}</div>
                              <div style={{ color: '#b3b3b3', fontSize: 11 }}>por {pl.user?.name ?? pl.user?.username ?? '?'} · {pl._count?.songs ?? 0} músicas</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Usuários */}
                    {searchResults && searchResults.users.length > 0 && (
                      <>
                        <div style={{ color: '#b3b3b3', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, padding: '16px 0 6px' }}>Usuários</div>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          {searchResults.users.map((u: any) => (
                            <div key={u.id} onClick={() => setViewingUserId(u.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '10px 14px', minWidth: 200, cursor: 'pointer', transition: 'background 0.15s' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}>
                              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#2a2a2a', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff', fontWeight: 700 }}>
                                {u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.name ?? u.username ?? '?')[0].toUpperCase()}
                              </div>
                              <div>
                                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{u.name ?? u.username}</div>
                                {u.username && <div style={{ color: '#b3b3b3', fontSize: 11 }}>@{u.username} · {u._count?.followers ?? 0} seguidores</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            ) : songs.length === 0 ? (
              <div className="sp-empty"><div className="sp-empty__icon">🎵</div><div className="sp-empty__title">{tr('noSongs')}</div><div style={{ color: '#b3b3b3' }}>Aguarde o admin adicionar músicas</div></div>
            ) : (
              <>
                <div className="sp-main__greeting">{new Date().getHours() < 12 ? tr('goodMorning') : new Date().getHours() < 18 ? tr('goodAfternoon') : tr('goodEvening')}</div>
                {/* 🎵 Álbuns Recentes */}
                <div style={{ marginBottom: 30 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#fff' }}>Álbuns Recentes</div>
                  <div className="sp-quick-grid">
                    {(() => {
                      const recentSongs = songs.filter(s => s.available !== false).slice(0, 12);
                      const albumsMap = new Map<string, { album: string; artist?: string; cover?: string; songs: typeof songs }>();
                      
                      recentSongs.forEach(song => {
                        const albumKey = `${song.albumName}-${song.artist}`;
                        if (!albumsMap.has(albumKey)) {
                          albumsMap.set(albumKey, {
                            album: song.albumName || 'Sem álbum',
                            artist: song.artist,
                            cover: song.coverUrl,
                            songs: [],
                          });
                        }
                        albumsMap.get(albumKey)!.songs.push(song);
                      });

                      return Array.from(albumsMap.values()).slice(0, 6).map((album, idx) => (
                        <div key={idx} className="sp-quick-item" onClick={() => { setSelectedAlbum(album); setLoadingAlbum(false); setAlbumSongs(album.songs); }} style={{ cursor: 'pointer' }}>
                          <div className="sp-quick-item__art">{album.cover ? <img src={album.cover} alt={album.album} style={{ objectFit: 'cover', width: '100%', height: '100%' }} /> : <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#b3b3b3' }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>}</div>
                          <div className="sp-quick-item__title">{album.album}</div>
                          <div style={{ fontSize: 12, color: '#b3b3b3', paddingLeft: 8, paddingRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.artist}</div>
                          <button className="sp-quick-item__play" onClick={e => { e.stopPropagation(); if (album.songs.length > 0) playSong(album.songs[0], album.songs); }}><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* ✨ Trending Widget */}
                <TrendingWidget songs={songs as any} onPlaySong={(song) => playSong(song as any, songs)} onContextMenu={(song, x, y) => setContextMenu({ song, x, y })} />

                {/* 💡 Recommendations Widget */}
                <RecommendationsWidget
                  recommendations={generateRecommendations(songs as any, getRecentlyPlayed(100)).map(rec => ({
                    song: rec.song,
                    reason: rec.reason,
                  }))}
                  topArtist={getTopArtists(30)[0]?.artist || 'Your favorites'}
                  onContextMenu={(song, x, y) => setContextMenu({ song, x, y })}
                  onPlaySong={(song) => playSong(song as any, songs)}
                  onAddToQueue={(song) => setQueue(q => [...q, song as any])}
                />

                {/* 📻 Radio 24/7 */}
                <RadioWidget
                  currentStation={currentStation || undefined}
                  onSelectStation={selectStation}
                />

                {/* Carrosséis por álbum/artista estilo Netflix */}
                {carousels.map(({ title, songs: rowSongs }) => (
                  <SongCarousel
                    key={title}
                    title={title}
                    songs={rowSongs}
                    current={current}
                    onPlay={(song) => playSong(song, rowSongs)}
                    onContextMenu={(song, x, y) => setContextMenu({ song, x, y })}
                    getDownloadStatus={getStatus}
                    onDownload={downloadSong}
                    onGift={(song) => { setGiftingSong(song); setShowGiftingModal(true); }}
                  />
                ))}
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
            <div key={`${song.id}-${i}`} className={`sp-queue-item${i === currentIdx ? ' sp-queue-item--active' : ''}`} onClick={() => playSong(song, queue).then(() => setCurrentIdx(i))} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ song, x: e.clientX, y: e.clientY }); }}>
              <div className="sp-queue-item__art">{song.coverUrl ? <img src={song.coverUrl} alt={song.title} /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#b3b3b3' }}><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>}</div>
              <div className="sp-queue-item__info"><div className="sp-queue-item__title">{song.title}</div><div className="sp-queue-item__artist">{song.artist ?? '—'}</div></div>
              <button className="sp-queue-item__remove" onClick={e => { e.stopPropagation(); setQueue(q => q.filter((_, j) => j !== i)); }} disabled={i === currentIdx}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* FRIEND ACTIVITY PANEL */}
      <FriendActivity
        token={token}
        visible={showFriendFeed}
        onPlaySong={songId => {
          const s = songs.find(x => x.id === songId);
          if (s) playSong(s, songs);
        }}
      />

      {/* LYRICS OVERLAY — capa/vídeo à esquerda, letras à direita */}
      {showLyrics && (
        <LyricsOverlay>
          <div className="sp-lyrics-overlay">
            <div className="sp-lyrics-overlay__header">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{current?.title ?? 'Letra'}</span>
                  {current?.artist && <span style={{ color: '#b3b3b3', fontSize: 13 }}>{current.artist}</span>}
                </div>
                <button onClick={() => setShowLyrics(false)} style={{ color: '#b3b3b3', fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>✕</button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <LyricsPanelPremium songId={current?.id ?? null} currentTime={currentTime} token={token} coverUrl={current?.coverUrl} audioRef={audioRef} songTitle={current?.title} songArtist={current?.artist} />
            </div>
          </div>
        </LyricsOverlay>
      )}

      {/* PROFILE PAGE — próprio usuário */}
      {showProfilePage && (
        <div className="sp-profile-page-overlay">
          <ProfilePage user={user} songs={songs} token={token} onClose={() => setShowProfilePage(false)} onPlaySong={s => playSong(s, songs)} audioRef={audioRef} playing={playing} currentTheme={currentTheme} onThemeChange={theme => { setCurrentTheme(theme); applyTheme(theme); }} />
        </div>
      )}

      {/* PROFILE PAGE — outro usuário */}
      {viewingUserId && (
        <div className="sp-profile-page-overlay">
          <OtherProfilePage userId={viewingUserId} token={token} onClose={() => setViewingUserId(null)} onPlaySong={s => playSong(s, songs)} playing={playing} audioRef={audioRef} />
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
          }}
          onClose={() => setShowAvatarEdit(false)}
        />
      )}

      {/* STATS MODAL */}
      {showStatsModal && (
        <StatsModal
          stats={badgeStats as any}
          badges={allBadges}
          onClose={() => setShowStatsModal(false)}
        />
      )}

      {/* RECENTLY PLAYED MODAL */}
      {showRecentlyPlayedModal && (
        <RecentlyPlayedModal
          history={getRecentlyPlayed(50)}
          onClose={() => setShowRecentlyPlayedModal(false)}
        />
      )}

      {/* QUEUE MODAL */}
      {showQueueModal && (
        <QueueModal
          queue={queue}
          currentIdx={currentIdx}
          onClose={() => setShowQueueModal(false)}
          onPlayFromQueue={(idx) => {
            if (idx >= 0 && idx < queue.length) {
              setCurrentIdx(idx);
              playSong(queue[idx], queue);
            }
          }}
        />
      )}

      {/* EQUALIZER MODAL */}
      {showEqualizerModal && (
        <EqualizerModal
          settings={equalizerSettings}
          onSettingsChange={setEqualizerSettings}
          onClose={() => setShowEqualizerModal(false)}
          onApplyPreset={(preset) => {
            const presets = {
              normal: { bass: 0, mid: 0, treble: 0, volume: 100 },
              bass: { bass: 8, mid: 4, treble: 0, volume: 100 },
              pop: { bass: 4, mid: 6, treble: 4, volume: 100 },
              rock: { bass: 6, mid: 2, treble: 8, volume: 100 },
              speech: { bass: -4, mid: 8, treble: 2, volume: 100 },
            };
            setEqualizerSettings(presets[preset]);
          }}
        />
      )}

      {/* WRAPPED MODAL */}
      {showWrappedModal && (
        <WrappedModal
          data={{
            topArtists: getTopArtists(365).slice(0, 10).map(a => ({ name: a.artist, plays: a.plays })),
            topGenres: [],
            totalMinutes: Math.round(getTotalPlayTime(365) / 60),
            topSong: getRecentlyPlayed(1)[0] ? { title: getRecentlyPlayed(1)[0].title, artist: getRecentlyPlayed(1)[0].artist || 'Unknown' } : { title: 'N/A', artist: 'N/A' },
            uniqueArtists: new Set(getRecentlyPlayed(365).map(e => e.artist)).size,
            adventureScore: badgeStats.adventureScore,
          }}
          onClose={() => setShowWrappedModal(false)}
        />
      )}

      {/* LISTENING PARTY MODAL */}
      {showPartyModal && party && (
        <ListeningPartyModal
          partyCode={party.partyCode}
          members={party.members}
          onClose={() => setShowPartyModal(false)}
          onInvite={() => {
            navigator.clipboard.writeText(`Join my Listening Party! Code: ${party.partyCode}`);
          }}
          onVote={(songId) => {
            console.log('Voted for:', songId);
          }}
        />
      )}

      {/* SONG GIFTING MODAL */}
      {showGiftingModal && giftingSong && (
        <SongGiftingModal
          title={giftingSong.title}
          onClose={() => {
            setShowGiftingModal(false);
            setGiftingSong(null);
          }}
          onSendGift={(recipientId, message) => {
            sendGift(giftingSong.id, giftingSong.title, recipientId, message);
          }}
        />
      )}

      {/* ═══ PHASE 5 MODALS ═══ */}
      {showMoodSelector && <MoodSelector onSelectMood={(_, emoji) => { setMoodEmoji(emoji); }} onClose={() => setShowMoodSelector(false)} />}
      {showAchievements && <AchievementsPanel achievements={achievements} unlockedCount={getUnlockedCount} onClose={() => setShowAchievements(false)} />}
      {showYearlyStats && <YearlyStatsModal stats={stats} onClose={() => setShowYearlyStats(false)} />}
      {showLyricsSearch && <LyricsSearch songs={songs} onSelectSong={song => playSong(song, songs)} onClose={() => setShowLyricsSearch(false)} />}
      {showGenreExplorer && <GenreExplorer onSelectGenre={genre => { alert(`Tocando ${genre}!`); setShowGenreExplorer(false); }} onClose={() => setShowGenreExplorer(false)} />}
      {showQRShare && currentQRPlaylist && <QRCodeShare playlistName={currentQRPlaylist.name} playlistId={currentQRPlaylist.id} onClose={() => setShowQRShare(false)} />}
      {showDarkModeSelector && <DarkModeSelector currentTheme={currentTheme} onThemeChange={theme => { setCurrentTheme(theme as any); applyTheme(theme as any); }} onClose={() => setShowDarkModeSelector(false)} />}

      {/* ═══ PHASE 6 MODALS (TOP 15 Features) ═══ */}
      {showTempoPanel && <TempoControlPanel tempo={tempoControl.tempo} onTempoChange={tempoControl.setPlaybackRate} onClose={() => setShowTempoPanel(false)} />}
      {showVisualizer && <AudioVisualizer3D playing={playing} currentTime={currentTime} duration={current?.duration || 0} />}
      {showSimilarArtists && <SimilarArtistsChain startArtist={queue[currentIdx]?.artist || 'Drake'} onClose={() => setShowSimilarArtists(false)} />}
      {showTheoryDisplay && currentTheory && <MusicTheoryDisplay theory={currentTheory} onClose={() => setShowTheoryDisplay(false)} />}
      {showListeningHeatmap && <ListeningHeatmap onClose={() => setShowListeningHeatmap(false)} />}
      {showFontSizePanel && <FontSizePanel onClose={() => setShowFontSizePanel(false)} />}
      {showKeyboardShortcuts && <KeyboardShortcutsPanel onClose={() => setShowKeyboardShortcuts(false)} />}
      {showDyslexiaFont && <DyslexiaFontPanel onClose={() => setShowDyslexiaFont(false)} />}
      {showSetlistBuilder && <SetlistBuilder onClose={() => setShowSetlistBuilder(false)} />}

      {/* MINI PLAYER — flutuante e arrastável, só aparece quando o usuário ativa */}
      {showMini && current && <MiniPlayer song={current} playing={playing} currentTime={currentTime} duration={duration} onPlay={() => setPlaying(p => !p)} onPrev={() => { if (currentIdx > 0) { playSong(queue[currentIdx - 1], queue); setCurrentIdx(i => i - 1); } }} onNext={() => { if (currentIdx < queue.length - 1) { playSong(queue[currentIdx + 1], queue); setCurrentIdx(i => i + 1); } }} onSeek={v => { if (audioRef.current) audioRef.current.currentTime = v; setCurrentTime(v); }} onClose={() => setShowMini(false)} />}

      {/* OFFLINE INDICATOR */}
      <OfflineIndicator isOnline={isOnline} syncProgress={syncProgress} />

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
              <button className="sp-player__like" title="Curtir" onClick={() => current && toggleFavorite(current.id)}
                style={{ color: current && isFavorite(current.id) ? 'var(--accent)' : undefined }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill={current && isFavorite(current.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </button>
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
          {current && (
            <SocialShareButton
              song={{ id: current.id, title: current.title, artist: current.artist }}
            />
          )}
          <button className="sp-player__btn" title="Letra" onClick={() => setShowLyrics(l => !l)} style={{ color: showLyrics ? '#1db954' : undefined }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
          </button>
          <button className="sp-player__btn" title="Microfone / Karaokê">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
          </button>
          <button className="sp-player__btn" title="Ver vídeo clipe" onClick={() => setShowLyrics(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 3v2h-2V3H8v2H6V3H4v18h16V3h-2zm0 16H6V8h12v11z"/></svg>
          </button>
          {current && (
            <button className="sp-player__btn" title="Presentear" onClick={() => { setGiftingSong(current); setShowGiftingModal(true); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15h-2v-2h2v2zm0-4h-2v-4h2v4zm4 4h-2v-2h2v2zm0-4h-2v-4h2v4zm4 4h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
            </button>
          )}
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

      {persistentPlayer}

      {/* CONTEXT MENU */}
      {contextMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 800 }} onClick={() => setContextMenu(null)}>
          <div style={{
            position: 'fixed', left: contextMenu.x, top: contextMenu.y,
            background: '#282828', borderRadius: 8, boxShadow: '0 16px 48px rgba(0,0,0,.8)',
            minWidth: 200, overflow: 'hidden', zIndex: 801,
          }} onClick={e => e.stopPropagation()}>
            {contextMenu.song ? (
              <>
                <button style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', color: '#fff', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.07)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  onClick={() => { playSong(contextMenu.song, songs); setContextMenu(null); }}>
                  ▶ Reproduzir
                </button>
                <button style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', color: isFavorite(contextMenu.song.id) ? 'var(--accent)' : '#fff', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.07)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  onClick={() => { toggleFavorite(contextMenu.song.id); setContextMenu(null); }}>
                  {isFavorite(contextMenu.song.id) ? '♥ Remover dos favoritos' : '♡ Adicionar aos favoritos'}
                </button>
                <div style={{ borderTop: '1px solid #3a3a3a', padding: '4px 0' }}>
                  <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 700, color: '#6a6a6a', textTransform: 'uppercase', letterSpacing: 1 }}>Adicionar à playlist</div>
                  {playlists.length > 0 ? (
                    <>
                      {playlists.map(pl => (
                        <button key={pl.id} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', color: '#fff', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.07)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                          onClick={async () => { 
                            try {
                              await addToPlaylist(pl.id, contextMenu.song.id);
                              alert(`✓ Música adicionada a "${pl.title}"`);
                            } catch (err) {
                              console.error('Erro ao adicionar música:', err);
                            }
                            setContextMenu(null);
                          }}>
                          {pl.title}
                        </button>
                      ))}
                      <button style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', color: '#1db954', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', borderTop: '1px solid #3a3a3a' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(29,185,84,.15)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        onClick={() => { setShowCreatePlaylist(true); setContextMenu(null); }}>
                        ✨ Criar nova playlist
                      </button>
                    </>
                  ) : (
                    <button style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', color: '#1db954', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(29,185,84,.15)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      onClick={() => { setShowCreatePlaylist(true); setContextMenu(null); }}>
                      ✨ Criar nova playlist
                    </button>
                  )}
                </div>
                {isPremium && (
                  <button style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', color: '#fff', fontSize: 14, background: 'none', borderRight: 'none', borderBottom: 'none', borderLeft: 'none', cursor: 'pointer', borderTop: '1px solid #3a3a3a' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.07)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    onClick={() => { downloadSong(contextMenu.song.id); setContextMenu(null); }}>
                    ⬇ Baixar
                  </button>
                )}
              </>
            ) : (
              <>
                <button style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', color: '#fff', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.07)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  onClick={() => { setShowStatsModal(true); setContextMenu(null); }}>
                  📊 Estatísticas
                </button>
                <button style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', color: '#fff', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.07)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  onClick={() => { setShowQueueModal(true); setContextMenu(null); }}>
                  📋 Fila
                </button>
                <button style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', color: '#fff', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.07)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  onClick={() => { setShowFriendFeed(f => !f); setContextMenu(null); }}>
                  👥 Atividade de amigos
                </button>
                <button style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', color: '#fff', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.07)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  onClick={() => { setShowNotif(true); setContextMenu(null); }}>
                  🔔 Notificações
                </button>
                <button style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', color: '#fff', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.07)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  onClick={() => { installApp(); setContextMenu(null); }}>
                  ⬇ Instalar aplicativo
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* PUSH TOASTS — WhatsApp style, bottom-right */}
      <PushToastContainer />
    </div>
  );
}
