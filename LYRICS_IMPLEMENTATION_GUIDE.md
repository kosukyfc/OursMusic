# 🎵 Sistema de Lyrics Karaokê - Guia de Implementação

> Documentação completa para implementação do sistema de lyrics ultra moderno e premium em todas as plataformas

## 📑 Índice

1. [Instalação e Setup](#instalação-e-setup)
2. [Arquitetura](#arquitetura)
3. [Componentes Principais](#componentes-principais)
4. [Integração Web (React)](#integração-web-react)
5. [Integração Backend (NestJS)](#integração-backend-nestjs)
6. [Integração Mobile (Flutter)](#integração-mobile-flutter)
7. [API Endpoints](#api-endpoints)
8. [Configuração de Animações](#configuração-de-animações)
9. [Performance & Otimizações](#performance--otimizações)
10. [Troubleshooting](#troubleshooting)

---

## 🚀 Instalação e Setup

### Web (React)

**Pré-requisitos**:
- Node.js 18+
- React 19+
- Vite 5+

**Instalação**:
```bash
cd web
npm install
```

**Importe no seu componente**:
```typescript
import LyricsDisplay from '@/components/LyricsDisplay/LyricsDisplay';
import MusicPlayerWithLyrics from '@/components/LyricsDisplay/MusicPlayerWithLyrics';
import { useLyricsSync } from '@/hooks/useLyricsSync';
import { useResponsiveLyrics } from '@/hooks/useResponsiveLyrics';
```

### Backend (NestJS)

**Dependências**:
```bash
npm install @nestjs/cache-manager cache-manager
```

**Integre o módulo**:
```typescript
// app.module.ts
import { LyricsModule } from './lyrics/lyrics.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      ttl: 60 * 60 * 24 * 7, // 7 dias
    }),
    LyricsModule,
    // ... outros módulos
  ],
})
export class AppModule {}
```

### Mobile (Flutter)

```bash
cd mobile
flutter pub get
```

---

## 🏗️ Arquitetura

### Estrutura de Pastas (Web)

```
web/src/
├── components/
│   └── LyricsDisplay/
│       ├── LyricsDisplay.tsx           # Componente principal
│       ├── VerseLine.tsx               # Verso individual
│       └── MusicPlayerWithLyrics.tsx  # Integração completa
├── hooks/
│   ├── useLyricsSync.ts               # Sincronização com áudio
│   ├── useResponsiveLyrics.ts         # Responsividade
│   └── useSyncCalibration.ts          # Calibração de offset
├── types/
│   └── lyrics.ts                      # Tipos TypeScript
├── utils/
│   └── lyricsParser.ts                # Parse de múltiplos formatos
└── styles/
    └── lyrics-animations.css          # Animações 60 FPS
```

### Fluxo de Dados

```
┌─ Audio Element <audio>
│
├─ useLyricsSync Hook
│  ├─ requestAnimationFrame (60 FPS)
│  ├─ calculatePlayerState()
│  └─ updateVerseProgress()
│
├─ LyricsDisplay Component
│  ├─ Renderiza verso atual (destacado)
│  ├─ Renderiza próximo verso (prep)
│  └─ Aplica animações CSS
│
└─ CSS (GPU Accelerated)
   ├─ Transform: translateY
   ├─ Opacity: fade
   └─ Filter: blur
```

---

## 📦 Componentes Principais

### 1. LyricsDisplay (Componente Principal)

```typescript
<LyricsDisplay
  lyrics={lyricsData}
  audioElement={audioRef.current}
  onVerseChange={(verse, index) => console.log('Verso:', verse)}
  syncOffset={0}
  theme="auto"
  fontScale={1}
  debug={false}
  animationConfig={{
    transitionDuration: 800,
    easing: 'smooth-in-out',
    enableBlur: true,
    enableScaleUp: true,
    wordLevelSync: true,
  }}
/>
```

**Props**:
| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| lyrics | LyricsData | - | Dados das letras |
| audioElement | HTMLAudioElement | - | Elemento de áudio para sync |
| onVerseChange | Function | - | Callback ao mudar verso |
| syncOffset | number | 0 | Offset de sincronização (ms) |
| theme | 'dark' \| 'light' \| 'auto' | 'auto' | Tema visual |
| fontScale | number | 1 | Escala de fonte customizada |
| debug | boolean | false | Mostrar debug info |

### 2. useLyricsSync (Hook)

```typescript
const {
  playerState,      // Estado atual do player
  loadingState,     // Estado de carregamento
  error,            // Erro (se houver)
  animationConfig,  // Config de animação em uso
  setSyncOffset,    // Ajusta offset
  manualSync,       // Sincroniza manualmente
  metrics,          // FPS, latência, etc
} = useLyricsSync({
  lyrics,
  audioElement,
  onVerseChange,
  syncOffset: 0,
});
```

### 3. useResponsiveLyrics (Hook)

```typescript
const {
  deviceInfo,        // Informações do dispositivo
  screenSize,        // 'mobile' | 'tablet' | 'desktop' | 'tv'
  responsiveConfig,  // Config layout
  cssVariables,      // CSS vars para aplicar
  htmlClassName,     // Classes CSS
} = useResponsiveLyrics({
  fontScale: 1,
  onScreenSizeChange: (size) => console.log(size),
});
```

---

## 💻 Integração Web (React)

### Uso Básico

```typescript
import React, { useRef } from 'react';
import MusicPlayerWithLyrics from '@/components/LyricsDisplay/MusicPlayerWithLyrics';

export default function MusicPage() {
  return (
    <MusicPlayerWithLyrics
      trackId="spotify-12345"
      audioUrl="/music/track.mp3"
      apiBaseUrl="/api"
    />
  );
}
```

### Uso Avançado com Controles Custom

```typescript
import React, { useRef, useState } from 'react';
import LyricsDisplay from '@/components/LyricsDisplay/LyricsDisplay';
import { useLyricsSync } from '@/hooks/useLyricsSync';
import { useResponsiveLyrics } from '@/hooks/useResponsiveLyrics';
import { LyricsData } from '@/types/lyrics';

export default function AdvancedMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [syncOffset, setSyncOffset] = useState(0);

  // Carrega letras
  React.useEffect(() => {
    async function loadLyrics() {
      const response = await fetch('/api/v1/lyrics-premium/track-123?title=Song&artist=Artist');
      const data = await response.json();
      if (data.success) {
        setLyrics(data.data);
      }
    }
    loadLyrics();
  }, []);

  return (
    <>
      <LyricsDisplay
        lyrics={lyrics}
        audioElement={audioRef.current}
        syncOffset={syncOffset}
        onVerseChange={(verse, index) => {
          console.log(`Verso ${index}:`, verse.text);
          // Haptic feedback
          navigator.vibrate?.(100);
        }}
      />

      <audio
        ref={audioRef}
        src="/music/track.mp3"
        autoPlay
        crossOrigin="anonymous"
      />

      {/* Controle de sync offset */}
      <input
        type="range"
        min={-500}
        max={500}
        step={10}
        value={syncOffset}
        onChange={(e) => setSyncOffset(Number(e.target.value))}
      />
    </>
  );
}
```

---

## 🔌 Integração Backend (NestJS)

### Configurar Prisma

**schema.prisma**:
```prisma
model Lyrics {
  id            String   @id @default(cuid())
  trackId       String   @unique
  title         String
  artist        String
  content       String   // JSON string de LyricsData
  source        String   // 'genius', 'musixmatch', 'user', 'empty'
  language      String
  hasWordSync   Boolean
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

**Migration**:
```bash
npx prisma migrate dev --name add_lyrics_table
```

### Registrar Módulo

```typescript
// main.ts
import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();
```

### Variáveis de Ambiente (.env)

```env
# Lyrics API Keys
GENIUS_ACCESS_TOKEN=your_genius_token_here
MUSIXMATCH_API_KEY=your_musixmatch_key_here

# Cache
CACHE_TTL=604800000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/music_db
```

---

## 📡 API Endpoints

### GET `/api/v1/lyrics-premium/:trackId`

Obtém letras sincronizadas de uma música.

**Parâmetros**:
```
trackId: string (path)
title: string (query, obrigatório)
artist: string (query, obrigatório)
albumArt: string (query, opcional)
bpm: number (query, opcional)
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "trackId": "spotify-12345",
    "title": "Song Name",
    "artist": "Artist Name",
    "albumArt": "https://...",
    "bpm": 120,
    "duration": 240000,
    "lyrics": [
      {
        "id": "verse_1",
        "text": "Primeira linha",
        "startTime": 0,
        "endTime": 2000,
        "type": "verse",
        "words": [
          { "word": "Primeira", "startTime": 0, "endTime": 800 },
          { "word": "linha", "startTime": 800, "endTime": 2000 }
        ]
      }
    ],
    "language": "pt-BR",
    "hasWordSync": true,
    "updatedAt": "2026-04-16T12:00:00Z"
  },
  "cached": false,
  "timestamp": 1713270000000
}
```

### POST `/api/v1/lyrics-premium/:trackId/calibrate`

Calibra sincronização de letras.

**Body**:
```json
{
  "verseStartTime": 0,
  "audioTime": 50
}
```

**Response** (200):
```json
{
  "offset": 50,
  "confidence": 0.95
}
```

### PUT `/api/v1/lyrics-premium/:trackId`

Salva letras customizadas (requer autenticação JWT).

### GET `/api/v1/lyrics-premium/:trackId/export/lrc`

Exporta letras em formato LRC.

---

## 🎨 Configuração de Animações

### CSS Variables Disponíveis

```css
/* Cores Dark Mode */
--lyrics-bg-primary: #0a0e27;
--lyrics-text-primary: #ffffff;
--lyrics-accent-highlight: #10b981;
--lyrics-accent-glow: rgba(16, 185, 129, 0.8);

/* Animação */
--lyrics-animation-duration: 800ms;
--lyrics-animation-easing: cubic-bezier(0.25, 0.46, 0.45, 0.94);
--lyrics-glow-intensity: 1;
--lyrics-blur-amount: 8px;

/* Responsividade */
--lyrics-font-size-current: 24px;
--lyrics-font-size-next: 18px;
--lyrics-album-art-size: 120px;
```

### Personalizar Tema

```typescript
const customConfig: Partial<LyricsAnimationConfig> = {
  transitionDuration: 1000,
  easing: 'ease-in-out',
  glowIntensity: 1.5,
  enableBlur: true,
  enableScaleUp: true,
  wordLevelSync: true,
};

<LyricsDisplay
  lyrics={lyrics}
  audioElement={audioRef.current}
  animationConfig={customConfig}
/>
```

---

## ⚡ Performance & Otimizações

### Checklist de Performance

- ✅ **60 FPS**: Animações com GPU acceleration (transform + opacity)
- ✅ **Virtual Scrolling**: Renderiza apenas 3 versos (anterior, atual, próximo)
- ✅ **RequestAnimationFrame**: Sincronização com refresh rate
- ✅ **Lazy Loading**: Album art carregado sob demanda
- ✅ **Code Splitting**: Componentes importados dinamicamente
- ✅ **Caching**: 7 dias de cache via Redis/Memory
- ✅ **Bundle Size**: ~50KB gzipped

### Métricas de Monitoramento

```typescript
const { metrics } = useLyricsSync(...);

console.log(`FPS: ${metrics.fps}`);                      // Target: 60
console.log(`Sync Latency: ${metrics.syncLatency}ms`);   // Target: <50ms
console.log(`Sync Accuracy: ${metrics.syncAccuracy}%`);  // Target: >95%
```

---

## 🔧 Troubleshooting

### Problema: Letras desincronizadas do áudio

**Solução**:
1. Use o botão "Calibrar" no player
2. Ajuste `syncOffset` via slider
3. Verifique BPM da música

```typescript
// Calibração manual
const { calibrate } = useSyncCalibration(audioRef.current);
const offset = await calibrate(currentVerseStartTime);
setSyncOffset(offset);
```

### Problema: Animações não suaves / lag

**Solução**:
1. Habilite debug mode para ver FPS
2. Verifique performance GPU (DevTools)
3. Reduza `glowIntensity`
4. Aumente `transitionDuration`

### Problema: Letras vazias / não encontradas

**Solução**:
1. Verifique título e artista
2. Confirme API keys (Genius, Musixmatch)
3. Habilite debug logging
4. Check cache: `GET /api/v1/lyrics-premium/health`

### Problema: Layout incorreto em dispositivos

**Solução**:
1. Verifique viewport meta tag
2. Teste com DevTools device emulation
3. Limpe cache CSS
4. Inspecione CSS variables aplicadas

---

## 🌍 Suporte Multi-Plataforma

### Web
- ✅ Desktop (Windows, macOS, Linux)
- ✅ Tablet (iPad, Android tablets)
- ✅ Smartphone (iPhone, Android)
- ✅ PWA (Progressive Web App)

### Mobile
- ✅ iOS (React Native / WebView)
- ✅ Android (React Native / Flutter)
- ✅ Smartwatch (WatchOS / WearOS)

### TV & IoT
- ✅ Smart TV (Tizen, webOS, Roku)
- ✅ Streaming devices (Apple TV, Fire Stick)
- ✅ Custom devices

---

## 📚 Referências

- [LyricsData Type Definition](./web/src/types/lyrics.ts)
- [LyricsSync Hook](./web/src/hooks/useLyricsSync.ts)
- [Responsive Hook](./web/src/hooks/useResponsiveLyrics.ts)
- [CSS Animations](./web/src/styles/lyrics-animations.css)
- [Backend API](./backend/src/lyrics/)

---

**Versão**: 1.0  
**Última atualização**: 16 de abril de 2026  
**Status**: Pronto para produção ✅
