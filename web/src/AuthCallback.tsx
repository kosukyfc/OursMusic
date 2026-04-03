import { useEffect } from 'react';

/**
 * Handles the OAuth2 callback redirect from the backend.
 * URL format: /auth/callback?token=...&user=...
 */
export function AuthCallback({ onAuth }: { onAuth: (token: string, user: any) => void }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userRaw = params.get('user');

    if (token && userRaw) {
      try {
        const user = JSON.parse(decodeURIComponent(userRaw));
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        onAuth(token, user);
      } catch {
        // malformed — go to login
      }
    }
    // Clean URL
    window.history.replaceState({}, '', '/');
  }, []);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#121212', color: '#fff', fontSize: 16,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🎵</div>
        Autenticando com Google...
      </div>
    </div>
  );
}
