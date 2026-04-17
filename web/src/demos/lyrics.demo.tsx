/**
 * Arquivo de Testes Rápidos - Demo do Sistema de Lyrics
 * Copie este arquivo ou use como referência para testar a implementação
 */

import React, { useRef, useState } from 'react';
import {
  LyricsDisplay,
  MusicPlayerWithLyrics,
  exampleLyricsPortuguese,
  exampleLyricsEnglish,
  useResponsiveLyrics,
  useLyricsSync,
} from '@/lyrics';

/**
 * Demo 1: Uso Básico com Dados de Exemplo
 */
export function LyricsDemo_Basic() {
  const audioRef = useRef<HTMLAudioElement>(null);

  return (
    <>
      <LyricsDisplay
        lyrics={exampleLyricsPortuguese}
        audioElement={audioRef.current}
        theme="dark"
        debug={true}
        showHeader={true}
        showAlbumArt={true}
        showControls={true}
      />

      <audio
        ref={audioRef}
        src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
        crossOrigin="anonymous"
      />
    </>
  );
}

/**
 * Demo 2: Com Sincronização Manual
 */
export function LyricsDemo_ManualSync() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [syncOffset, setSyncOffset] = useState(0);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const { metrics } = useLyricsSync({
    lyrics: exampleLyricsPortuguese,
    audioElement: audioRef.current,
    syncOffset,
    debug: true,
  });

  return (
    <div style={{ position: 'relative' }}>
      <LyricsDisplay
        lyrics={exampleLyricsPortuguese}
        audioElement={audioRef.current}
        syncOffset={syncOffset}
        theme={theme}
        debug={true}
      />

      <audio
        ref={audioRef}
        src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
        crossOrigin="anonymous"
        autoPlay
      />

      {/* Controles */}
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          background: 'rgba(0, 0, 0, 0.8)',
          color: '#fff',
          padding: '15px',
          borderRadius: '8px',
          zIndex: 1000,
          minWidth: '250px',
        }}
      >
        <div style={{ marginBottom: '15px' }}>
          <label>
            <strong>Sync Offset: {syncOffset}ms</strong>
          </label>
          <input
            type="range"
            min={-500}
            max={500}
            step={10}
            value={syncOffset}
            onChange={(e) => setSyncOffset(Number(e.target.value))}
            style={{ width: '100%', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: 'none',
              background: '#10b981',
              color: '#fff',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Tema: {theme.toUpperCase()}
          </button>
        </div>

        <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
          <div>FPS: {metrics.fps}</div>
          <div>Latency: {metrics.syncLatency.toFixed(1)}ms</div>
          <div>Accuracy: {metrics.syncAccuracy.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Demo 3: Multi-Idioma
 */
export function LyricsDemo_MultiLanguage() {
  const [language, setLanguage] = useState<'pt-BR' | 'en-US'>('pt-BR');
  const audioRef = useRef<HTMLAudioElement>(null);

  const lyrics = language === 'pt-BR' ? exampleLyricsPortuguese : exampleLyricsEnglish;

  return (
    <>
      <LyricsDisplay
        lyrics={lyrics}
        audioElement={audioRef.current}
        theme="dark"
        debug={false}
      />

      <audio
        ref={audioRef}
        src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
        crossOrigin="anonymous"
      />

      {/* Language Selector */}
      <div
        style={{
          position: 'fixed',
          top: 20,
          left: 20,
          display: 'flex',
          gap: '10px',
          zIndex: 1000,
        }}
      >
        <button
          onClick={() => setLanguage('pt-BR')}
          style={{
            padding: '10px 15px',
            background: language === 'pt-BR' ? '#10b981' : '#666',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          🇧🇷 Português
        </button>
        <button
          onClick={() => setLanguage('en-US')}
          style={{
            padding: '10px 15px',
            background: language === 'en-US' ? '#10b981' : '#666',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          🇬🇧 English
        </button>
      </div>
    </>
  );
}

/**
 * Demo 4: Responsividade em Todos os Tamanhos
 */
export function LyricsDemo_Responsive() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { screenSize, deviceInfo, responsiveConfig } = useResponsiveLyrics({
    debug: true,
  });

  return (
    <>
      <LyricsDisplay
        lyrics={exampleLyricsPortuguese}
        audioElement={audioRef.current}
        debug={true}
      />

      <audio
        ref={audioRef}
        src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
        crossOrigin="anonymous"
      />

      {/* Device Info */}
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          background: 'rgba(0, 0, 0, 0.9)',
          color: '#10b981',
          padding: '15px',
          borderRadius: '8px',
          fontSize: '12px',
          fontFamily: 'monospace',
          zIndex: 1000,
          maxWidth: '300px',
        }}
      >
        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>📱 Device Info</div>
        <div>Platform: {deviceInfo.platform}</div>
        <div>Size: {screenSize}</div>
        <div>Resolution: {deviceInfo.screenWidth}x{deviceInfo.screenHeight}</div>
        <div>DPR: {deviceInfo.screenDensity}x</div>
        <div>Touch: {deviceInfo.supportsTouchInput ? '✓' : '✗'}</div>
        <div>Safe Area: {deviceInfo.isSafeAreaAware ? '✓' : '✗'}</div>

        <div style={{ marginTop: '10px', borderTop: '1px solid #10b981' }}>
          <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>⚙️ Layout Config</div>
          <div>Font Size: {responsiveConfig.currentVerseFontSize}px</div>
          <div>Album Art: {responsiveConfig.albumArtSize}px</div>
          <div>Mode: {responsiveConfig.layoutMode}</div>
        </div>
      </div>
    </>
  );
}

/**
 * Demo 5: Player Integrado (Recomendado para Produção)
 */
export function LyricsDemo_IntegratedPlayer() {
  return (
    <MusicPlayerWithLyrics
      trackId="example-001"
      audioUrl="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
    />
  );
}

/**
 * Demo 6: Com Callbacks Customizados
 */
export function LyricsDemo_WithCallbacks() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentVerse, setCurrentVerse] = useState(0);
  const [eventLog, setEventLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setEventLog((prev) => [msg, ...prev.slice(0, 9)]);
  };

  return (
    <>
      <LyricsDisplay
        lyrics={exampleLyricsPortuguese}
        audioElement={audioRef.current}
        debug={true}
        onVerseChange={(verse, index) => {
          setCurrentVerse(index);
          addLog(`[${new Date().toLocaleTimeString()}] Verso ${index}: ${verse.text}`);

          // Haptic feedback
          if ('vibrate' in navigator) {
            navigator.vibrate(100);
          }
        }}
        onError={(error) => {
          addLog(`❌ Erro: ${error.message}`);
        }}
        onTimeUpdate={(time) => {
          // Opcional: fazer algo com o tempo
        }}
      />

      <audio
        ref={audioRef}
        src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
        crossOrigin="anonymous"
        autoPlay
      />

      {/* Event Log */}
      <div
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          background: 'rgba(0, 0, 0, 0.95)',
          color: '#10b981',
          padding: '15px',
          borderRadius: '8px',
          fontSize: '11px',
          fontFamily: 'monospace',
          maxWidth: '300px',
          maxHeight: '300px',
          overflow: 'auto',
          zIndex: 1000,
        }}
      >
        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>📋 Event Log</div>
        {eventLog.map((log, i) => (
          <div key={i} style={{ marginBottom: '4px' }}>
            {log}
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * Export padrão (use no seu App.tsx ou página)
 */
export default LyricsDemo_IntegratedPlayer;

/**
 * INSTRUÇÕES DE TESTE:
 *
 * 1. Copie um dos componentes Demo acima
 * 2. Importe em sua página:
 *    import { LyricsDemo_Basic } from '@/demos/lyrics.demo'
 * 3. Use no seu componente:
 *    <LyricsDemo_Basic />
 * 4. Ou use o índice default:
 *    import LyricsDemo from '@/demos/lyrics.demo'
 *    <LyricsDemo />
 *
 * TESTES RECOMENDADOS:
 * ✅ Teste em diferentes tamanhos de tela (DevTools)
 * ✅ Teste responsividade (resize window)
 * ✅ Teste sync offset (slider)
 * ✅ Teste tema escuro/claro
 * ✅ Teste em múltiplos idiomas
 * ✅ Verifique FPS (debug overlay)
 * ✅ Teste em dispositivo móvel real
 * ✅ Teste em tablet
 * ✅ Teste callbacks e events
 */
