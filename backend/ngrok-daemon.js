#!/usr/bin/env node

/**
 * Script ngrok (comentado - usando apenas localhost)
 */

/*
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let ngrokProcess = null;

function startNgrok() {
  console.log('\n🚀 Iniciando ngrok CLI...');
  
  ngrokProcess = spawn('ngrok', [
    'http', 
    '3000',
    '--authtoken', '3C9SGL9QkKCxX1SXH6M3rWaeOKt_3BADZVEjH9ppibq5LgAfs',
    '--region', 'us',
    '--log', 'stdout'
  ], {
    stdio: process.env.DEBUG ? 'inherit' : 'ignore',
    detached: true
  });

  ngrokProcess.on('exit', (code) => {
    console.log(`⚠️  ngrok saiu com código ${code}`);
    setTimeout(startNgrok, 5000);
  });

  ngrokProcess.on('error', (err) => {
    console.error('❌ Erro ao iniciar ngrok:', err.message);
    setTimeout(startNgrok, 5000);
  });

  console.log(`✅ ngrok iniciado (PID: ${ngrokProcess.pid})`);
}

// Iniciar
startNgrok();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando ngrok...');
  if (ngrokProcess) {
    process.kill(-ngrokProcess.pid);
  }
  process.exit(0);
});

// Keep process alive
setInterval(() => {
  if (!ngrokProcess || ngrokProcess.killed) {
    console.log('\n⚠️  ngrok não está rodando, tentando reiniciar...');
    startNgrok();
  }
}, 10000);

console.log('🔒 ngrok em modo background. Pressione Ctrl+C para parar.\n');
