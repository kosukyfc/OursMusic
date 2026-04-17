import { useEffect } from 'react';

/**
 * Handles the OAuth2 callback redirect from the backend.
 * O token já está no cookie HttpOnly — apenas o user vem na URL.
 * URL format: /auth/callback?user=...
 */
export function AuthCallback({ onAuth }: { onAuth: (user: any) => void }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userRaw = params.get('user');

    if (userRaw) {
      try {
        const user = JSON.parse(decodeURIComponent(userRaw));
        onAuth(user);
      } catch {
        // malformed — go to login
      }
    }
    // Limpa URL imediatamente
    window.history.replaceState({}, '', '/');
  }, []);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#121212', color: '#fff', fontSize: 16,
    }}>
      <div style={{ textAlign: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: 16 }}>
          <rect width="32" height="32" rx="7" fill="url(#cb-grad)"/>
          <defs>
            <linearGradient id="cb-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7c3aed"/>
              <stop offset="100%" stopColor="#4f46e5"/>
            </linearGradient>
          </defs>
          <rect x="5"  y="12" width="3" height="8"  rx="1.5" fill="white" opacity="0.95"/>
          <rect x="10" y="8"  width="3" height="16" rx="1.5" fill="white" opacity="0.95"/>
          <rect x="15" y="5"  width="3" height="22" rx="1.5" fill="white" opacity="0.95"/>
          <rect x="20" y="9"  width="3" height="14" rx="1.5" fill="white" opacity="0.95"/>
          <rect x="25" y="13" width="3" height="6"  rx="1.5" fill="white" opacity="0.95"/>
        </svg>
        <div>Autenticando com Google...</div>
      </div>
    </div>
  );
}
