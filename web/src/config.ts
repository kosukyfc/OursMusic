// URL da API HTTP
// - Dev: '/api' = usa proxy do Vite (/api/* → localhost:3000/*)
// - Prod: URL completa do backend (ex: https://oursmusics.shop)
export const API_URL = import.meta.env.VITE_API_URL || '/api';

// URL do WebSocket — sempre direto para o backend
export const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

// Headers extras para túneis ngrok (comentado - usando apenas localhost):
// const isNgrok = API_URL.includes('ngrok');
// export const EXTRA_HEADERS: Record<string, string> = isNgrok
//   ? { 'ngrok-skip-browser-warning': 'true' }
//   : {};

// localhost only:
export const EXTRA_HEADERS: Record<string, string> = {};
