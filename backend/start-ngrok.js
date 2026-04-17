// ngrok script (comentado - usando apenas localhost):
/*
const ngrok = require('@ngrok/ngrok');
const fs = require('fs');
const path = require('path');

let listener = null;

async function startNgrok() {
  try {
    console.log('🚀 Iniciando tunnel ngrok...\n');

    // Conectar ao backend
    listener = await ngrok.connect({
      addr: 3000,
      authtoken: '3C9SGL9QkKCxX1SXH6M3rWaeOKt_3BADZVEjH9ppibq5LgAfs',
    });

    const backendUrl = listener.url();
    console.log(`✅ Backend tunnel: ${backendUrl}`);

    // Salvar URLs em arquivo
    const urlFile = path.join(__dirname, 'NGROK_URL.txt');
    const content = `Backend: ${backendUrl}\nstartTime: ${new Date().toISOString()}\n`;
    fs.writeFileSync(urlFile, content);
    console.log(`📝 URL salva em: ${urlFile}\n`);

    console.log('💡 Atualize o .env com:');
    console.log(`   FRONTEND_URL=${backendUrl}`);
    console.log('\n🔒 ngrok está rodando (CTRL+C para parar)...\n');

  } catch (error) {
    console.error('❌ Erro ao iniciar ngrok:', error.message);
    setTimeout(startNgrok, 5000);
  }
}

// Iniciar
startNgrok();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Encerrando ngrok...');
  if (listener) await listener.close();
  await ngrok.disconnect();
  process.exit(0);
});
*/

// localhost only - ngrok disabled
console.log('✅ Using localhost only (ngrok disabled)');
