/**
 * ClerkAuthGate — componentes oficiais do Clerk com tema customizado.
 * Usa <SignIn> e <SignUp> do Clerk (email, telefone, username, Google, etc.)
 * com o visual do design original: fundo escuro, roxo, barras animadas.
 */

import { SignIn, SignUp, useAuth, useUser } from '@clerk/clerk-react';
import { useState, useEffect, useMemo } from 'react';
import { API_URL, EXTRA_HEADERS } from '../config';

// ── Tema que replica o design original ───────────────────────────────────────
const theme = {
  variables: {
    colorPrimary:                 '#7c3aed',
    colorBackground:              '#282828',
    colorText:                    '#ffffff',
    colorTextSecondary:           '#b3b3b3',
    colorTextOnPrimaryBackground: '#ffffff',
    colorInputBackground:         '#3e3e3e',
    colorInputText:               '#ffffff',
    colorNeutral:                 '#535353',
    colorDanger:                  '#f15e6c',
    colorSuccess:                 '#1db954',
    colorShimmer:                 '#3e3e3e',
    fontFamily:                   'inherit',
    fontSize:                     '14px',
    borderRadius:                 '8px',
    spacingUnit:                  '14px',
  },
  elements: {
    // ── card ──────────────────────────────────────────────────────────────
    card: {
      background:   '#282828',
      boxShadow:    '0 24px 64px rgba(0,0,0,.8)',
      borderRadius: '12px',
      border:       'none',
      padding:      '28px 36px',
      gap:          '14px',
      width:        '100%',
      maxWidth:     '420px',
    },
    cardBox: { boxShadow: 'none', width: '100%', maxWidth: '420px' },

    // ── cabeçalho ─────────────────────────────────────────────────────────
    headerTitle: {
      fontSize:      '24px',
      fontWeight:    '800',
      letterSpacing: '-0.5px',
      color:         '#ffffff',
      textAlign:     'center',
    },
    headerSubtitle: { fontSize: '14px', color: '#b3b3b3', textAlign: 'center' },

    // esconder logo do Clerk — usamos o nosso acima
    logoBox:   { display: 'none' },
    logoImage: { display: 'none' },

    // ── inputs ────────────────────────────────────────────────────────────
    formFieldInput: {
      background:   '#3e3e3e',
      border:       '1px solid transparent',
      borderRadius: '4px',
      padding:      '11px 14px',
      color:        '#ffffff',
      fontSize:     '14px',
      outline:      'none',
      transition:   'border-color 0.15s, box-shadow 0.15s',
    },
    formFieldInputShowPasswordButton: { color: '#9ca3af' },
    formFieldLabel: {
      fontSize:      '12px',
      fontWeight:    '700',
      color:         '#b3b3b3',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    formFieldHintText:  { color: '#b3b3b3', fontSize: '12px' },
    formFieldErrorText: { color: '#f15e6c', fontSize: '13px' },

    // ── botão primário — gradiente roxo ───────────────────────────────────
    formButtonPrimary: {
      background:    'linear-gradient(135deg, #7c3aed, #6d28d9)',
      color:         '#ffffff',
      fontWeight:    '700',
      fontSize:      '14px',
      letterSpacing: '0.08em',
      borderRadius:  '500px',
      padding:       '11px 14px',
      boxShadow:     '0 4px 18px rgba(124,58,237,0.4)',
      border:        'none',
      transition:    'transform 0.15s, background 0.15s, box-shadow 0.15s',
    },

    // ── botões sociais (Google, etc.) — outline roxo ──────────────────────
    socialButtonsBlockButton: {
      background:   'rgba(124,58,237,0.08)',
      color:        '#c4b5fd',
      border:       '1px solid rgba(124,58,237,0.4)',
      borderRadius: '500px',
      fontWeight:   '700',
      fontSize:     '14px',
      boxShadow:    '0 2px 10px rgba(124,58,237,0.1)',
      transition:   'transform 0.15s, background 0.15s, box-shadow 0.15s',
    },
    socialButtonsBlockButtonText: { color: '#c4b5fd', fontWeight: '700' },
    socialButtonsBlockButtonArrow: { color: '#c4b5fd' },

    // ── divisor "ou" ──────────────────────────────────────────────────────
    dividerLine: { background: '#535353' },
    dividerText: { color: '#6b7280', fontSize: '12px' },

    // ── links e rodapé — esconder os do Clerk (usamos os nossos) ─────────
    footerActionLink:   { display: 'none' },
    footerActionText:   { display: 'none' },
    footerPages:        { display: 'none' },
    footer:             { display: 'none' },
    footerAction:       { display: 'none' },
    badge:              { display: 'none' },
    otpCodeFieldInput: {
      background:    '#3e3e3e',
      border:        '1px solid #535353',
      borderRadius:  '8px',
      color:         '#ffffff',
      fontSize:      '20px',
      letterSpacing: '0.3em',
      textAlign:     'center',
    },

    // ── links internos ────────────────────────────────────────────────────
    identityPreviewEditButton: { color: '#a78bfa' },
    formResendCodeLink:        { color: '#a78bfa' },
    alternativeMethodsBlockButton: {
      color:        '#c4b5fd',
      border:       '1px solid rgba(124,58,237,0.4)',
      borderRadius: '500px',
      background:   'rgba(124,58,237,0.08)',
    },

    // ── alertas ───────────────────────────────────────────────────────────
    alert:          { background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: '8px' },
    alertText:      { color: '#c4b5fd', fontSize: '13px' },
    alertTextDanger:{ color: '#f15e6c' },

    // ── fundo geral ───────────────────────────────────────────────────────
    rootBox:    { width: '100%', maxWidth: '420px' },
    main:       { gap: '14px' },
    form:       { gap: '12px' },
  },
};

// ── Componente principal ──────────────────────────────────────────────────────

interface Props {
  onAuth: (user: any) => void;
}

export function ClerkAuthGate({ onAuth }: Props) {
  const { isSignedIn, getToken } = useAuth();
  const { user: clerkUser }      = useUser();
  const [syncing, setSyncing]    = useState(false);
  const [view,    setView]       = useState<'sign-in' | 'sign-up'>('sign-in');

  // Barras de áudio decorativas — idêntico ao design original
  const bgBars = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      height:   `${20 + Math.sin(i * 0.7) * 15 + (i % 7) * 4}vh`,
      delay:    `${(i * 0.08) % 1.2}s`,
      duration: `${0.8 + (i % 5) * 0.15}s`,
    })), []);

  // Após autenticação pelo Clerk, sincroniza com o backend
  useEffect(() => {
    if (!isSignedIn || !clerkUser || syncing) return;
    async function sync() {
      setSyncing(true);
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch(`${API_URL}/auth/clerk-sync`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...EXTRA_HEADERS },
          credentials: 'include',
        });
        if (res.ok) onAuth((await res.json()).user);
      } catch { /* silently fail */ }
      finally { setSyncing(false); }
    }
    sync();
  }, [isSignedIn, clerkUser]);

  if (syncing) {
    return (
      <div className="modal-overlay">
        <div className="auth-bg-bars" aria-hidden="true">
          {bgBars.map((b, i) => (
            <div key={i} className="auth-bg-bar"
              style={{ height: b.height, animationDelay: b.delay, animationDuration: b.duration }} />
          ))}
        </div>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
          <div style={{ position: 'absolute', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)', filter: 'blur(80px)', top: -120, left: -100, animation: 'orb-drift 8s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.28) 0%, transparent 70%)', filter: 'blur(80px)', bottom: -100, right: -80, animation: 'orb-drift 8s ease-in-out infinite alternate', animationDelay: '-4s' }} />
        </div>
        <div className="modal" style={{ alignItems: 'center', gap: 20 }}>
          <div style={{ width: 36, height: 36, border: '3px solid #3e3e3e', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: '#b3b3b3', fontSize: 14 }}>Sincronizando conta...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      {/* barras de áudio decorativas */}
      <div className="auth-bg-bars" aria-hidden="true">
        {bgBars.map((b, i) => (
          <div key={i} className="auth-bg-bar"
            style={{ height: b.height, animationDelay: b.delay, animationDuration: b.duration }} />
        ))}
      </div>

      {/* orbs de luz extras para o ClerkAuthGate */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0,
      }}>
        <div style={{
          position: 'absolute', width: 520, height: 520, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)',
          filter: 'blur(80px)', top: -120, left: -100,
          animation: 'orb-drift 8s ease-in-out infinite alternate',
        }} />
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,70,229,0.28) 0%, transparent 70%)',
          filter: 'blur(80px)', bottom: -100, right: -80,
          animation: 'orb-drift 8s ease-in-out infinite alternate',
          animationDelay: '-4s',
        }} />
        <div style={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.18) 0%, transparent 70%)',
          filter: 'blur(60px)', top: '40%', right: '10%',
          animation: 'orb-drift 10s ease-in-out infinite alternate',
          animationDelay: '-2s',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>

        {/* Logo — idêntico ao design original */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <svg width="44" height="44" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="7" fill="url(#cag-g)"/>
            <defs>
              <linearGradient id="cag-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#7c3aed"/>
                <stop offset="100%" stopColor="#4f46e5"/>
              </linearGradient>
            </defs>
            {[
              { x: 5,  baseH: 8,  baseY: 12, delay: '0s'    },
              { x: 10, baseH: 16, baseY: 8,  delay: '0.15s' },
              { x: 15, baseH: 22, baseY: 5,  delay: '0.3s'  },
              { x: 20, baseH: 14, baseY: 9,  delay: '0.45s' },
              { x: 25, baseH: 6,  baseY: 13, delay: '0.6s'  },
            ].map((b, i) => (
              <rect key={i} x={b.x} y={b.baseY} width="3" height={b.baseH} rx="1.5"
                fill="white" opacity="0.95"
                style={{
                  transformOrigin: `${b.x + 1.5}px ${b.baseY + b.baseH / 2}px`,
                  animation: 'auth-bar 0.9s ease-in-out infinite alternate',
                  animationDelay: b.delay,
                }}
              />
            ))}
          </svg>
          <style>{`
            @keyframes auth-bar {
              0%   { transform: scaleY(0.35); opacity: 0.5; }
              100% { transform: scaleY(1);    opacity: 1;   }
            }
          `}</style>
          <div className="modal__title" style={{ marginBottom: 0 }}>OursMusic</div>
        </div>

        {/* Componentes do Clerk com tema customizado */}
        {view === 'sign-in' ? (
          <SignIn
            routing="hash"
            appearance={theme}
            signUpUrl="#sign-up"
            afterSignInUrl="/"
          />
        ) : (
          <SignUp
            routing="hash"
            appearance={theme}
            signInUrl="#sign-in"
            afterSignUpUrl="/"
          />
        )}

        {/* Alternância manual */}
        <div className="modal__switch" style={{ marginTop: 12 }}>
          <span className="modal__switch-text">
            {view === 'sign-in' ? 'Não tem conta?' : 'Já tem conta?'}
          </span>
          <a onClick={() => setView(v => v === 'sign-in' ? 'sign-up' : 'sign-in')} style={{ cursor: 'pointer' }}>
            {view === 'sign-in' ? 'Cadastre-se' : 'Entrar'}
          </a>
        </div>
      </div>
    </div>
  );
}
