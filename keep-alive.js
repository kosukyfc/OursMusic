/**
 * Keep-Alive Script para Render
 * Faz pings a cada 5 minutos para manter o backend acordado
 */

const https = require('https');
const http = require('http');

const BACKEND_URL = process.env.RENDER_BACKEND_URL || 'https://oursmusic-backend.onrender.com';
const PING_INTERVAL = parseInt(process.env.PING_INTERVAL || '300000'); // 5 minutos
const ENDPOINTS = ['/api/docs', '/api', '/health'];

let successCount = 0;
let failCount = 0;

function ping() {
  const endpoint = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
  const url = `${BACKEND_URL}${endpoint}`;
  
  const protocol = url.startsWith('https') ? https : http;
  
  protocol.get(url, { timeout: 10000 }, (res) => {
    const timestamp = new Date().toISOString();
    successCount++;
    console.log(`[${timestamp}] ✅ Ping OK (${res.statusCode}) - ${endpoint} | Sucessos: ${successCount}`);
  }).on('error', (err) => {
    const timestamp = new Date().toISOString();
    failCount++;
    console.log(`[${timestamp}] ❌ Ping falhou (${err.code}) | Falhas: ${failCount}`);
  }).on('timeout', function() {
    this.destroy();
    console.log(`[${new Date().toISOString()}] ⏱️  Timeout no ping`);
  });
}

console.log(`🚀 Keep-Alive iniciado`);
console.log(`📍 URL: ${BACKEND_URL}`);
console.log(`⏰ Intervalo: ${PING_INTERVAL / 1000} segundos`);
console.log(`🔄 Endpoints testados: ${ENDPOINTS.join(', ')}\n`);

// Enviar ping inicial
ping();

// Configurar pings periódicos
setInterval(ping, PING_INTERVAL);

// Stats a cada 30 minutos
setInterval(() => {
  console.log(`\n📊 STATS: Sucessos: ${successCount} | Falhas: ${failCount}\n`);
}, 30 * 60 * 1000);

// Manter o script rodando
process.on('SIGINT', () => {
  console.log('\n🛑 Keep-Alive interrompido');
  console.log(`📊 Stats finais: Sucessos: ${successCount} | Falhas: ${failCount}`);
  process.exit(0);
});
