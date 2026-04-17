/**
 * Keep-Alive Script para Render
 * Faz pings a cada 5 minutos para manter o backend acordado
 */

const https = require('https');

const BACKEND_URL = 'https://oursmusic-backend.onrender.com';
const PING_INTERVAL = 5 * 60 * 1000; // 5 minutos

function ping() {
  https.get(`${BACKEND_URL}/health`, (res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Ping enviado - Status: ${res.statusCode}`);
  }).on('error', (err) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Ping falhou - Tentando novamente...`);
  });
}

// Enviar ping inicial
console.log(`🚀 Keep-Alive iniciado para ${BACKEND_URL}`);
console.log(`⏰ Ping a cada 5 minutos`);
ping();

// Configurar pings periódicos
setInterval(ping, PING_INTERVAL);

// Manter o script rodando
process.on('SIGINT', () => {
  console.log('\n🛑 Keep-Alive interrompido');
  process.exit(0);
});
