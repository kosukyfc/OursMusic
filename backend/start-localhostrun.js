#!/usr/bin/env node

/**
 * Alternativa: localhost.run (mais confiável que ngrok)
 * Requer ssh instalado no sistema
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando tunnel via localhost.run...\n');
console.log('⚠️  Requer SSH. Use em WSL ou instale OpenSSH.\n');
console.log('Comando manual:');
console.log('  ssh -R 80:localhost:3000 localhost.run\n');

const cmd = 'ssh';
const args = ['-R', '80:localhost:3000', 'localhost.run'];

const tunnel = spawn(cmd, args, {
  stdio: ['inherit', 'inherit', 'inherit']
});

tunnel.on('close', (code) => {
  console.log(`\n🛑 localhost.run tunnel fechado (código ${code})`);
  process.exit(code);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando tunnel...');
  tunnel.kill();
  process.exit(0);
});
