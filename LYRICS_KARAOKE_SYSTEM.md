# Sistema de Lyrics Karaokê Ultra Moderno - Especificação Técnica v1.0

> Experiência cinematográfica de karaokê sincronizada para iOS, Android, Web, Desktop, Tablet, Smart TV e Smartwatch

## 📋 Visão Geral

Um sistema premium de exibição de letras com sincronização em tempo real, animações 60 FPS e design responsivo idêntico ao Apple Music Lyrics 2026 + Spotify Lyrics advanced.

---

## 🎬 Comportamento de Animação (Karaokê Avançado)

### Ciclo de Animação Principal

```
[VERSO 1 FORA DO TOPO]
    ↓ (fade-in + scale-up leve)
[VERSO 1 SUBINDO PARA CENTRO]
    ↓ (chega ao centro, recebe highlight)
[VERSO 1 DESTACADO NO CENTRO] ← CANTANDO AGORA (GREEN NEON GLOW)
    ↓ (scroll ascendente fluido)
[VERSO 1 SAINDO PARA CIMA]
    ↓ (fade-out + blur)
[VERSO 1 DESAPARECIDO DO TOPO]
```

### Características de Animação

1. **Linha Atual (Verso sendo cantado)**
   - ✅ Centralizada verticalmente na tela
   - ✅ Highlighted com barra verde neon (glow intenso + suave)
   - ✅ Fonte maior (escala 1.2x do próximo verso)
   - ✅ Cor: branco puro com opacidade 100%
   - ✅ Glow: `box-shadow: 0 0 20px rgba(16, 185, 129, 0.8), inset 0 0 20px rgba(16, 185, 129, 0.3)`
   - ✅ Border-radius: 12px
   - ✅ Padding suave: 24px

2. **Próximo Verso (Preparação)**
   - ✅ Começa 400px abaixo do centro
   - ✅ Fade-in gradual: 0% → 60% opacity
   - ✅ Scale-up leve: 0.95 → 1.0
   - ✅ Cor: branco com 60% opacidade
   - ✅ Font-weight: 400 (vs 600 do verso atual)

3. **Verso Anterior (Saída)**
   - ✅ Scroll ascendente contínuo
   - ✅ Fade-out: 100% → 0% opacity
   - ✅ Blur progressivo: 0px → 8px
   - ✅ Efeito "horizonte": desaparece suavemente

4. **Verso Próximo → Verso Atual (Transição)**
   - ✅ Duração: controlada por BPM (padrão: 0.8s/verso)
   - ✅ Easing: `cubic-bezier(0.25, 0.46, 0.45, 0.94)` (smooth)
   - ✅ Sincronização: timestamps por verso
   - ✅ Compensação: +50ms antes do timestamp para suavidade visual

### Velocidade de Scroll (BPM-Aware)

```
Duração por verso = (60 / BPM) * (batidas por verso)
Exemplo: 120 BPM, 4 batidas = 2 segundos por verso
```

---

## 🎨 Estilo Visual Geral

### Paleta de Cores

```
Dark Mode (Principal):
  - Background Primary: #0A0E27 (gradient to #1A1F3A)
  - Text Primary: #FFFFFF (100% opacity)
  - Text Secondary: #B0B0B0 (60% opacity)
  - Accent Highlight: #10B981 (Green Neon)
  - Glow: rgba(16, 185, 129, 0.8)
  - Album Blur BG: rgba(10, 14, 39, 0.4) overlay

Light Mode:
  - Background Primary: #FFFFFF → #F5F5F7
  - Text Primary: #1D1D1F (100% opacity)
  - Text Secondary: #6F6F77 (60% opacity)
  - Accent Highlight: #34C759 (Apple Green)
```

### Tipografia

```
Font Family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif
Font Weights: 400 (regular), 600 (highlight), 700 (title)

Tamanhos por Dispositivo:
  - Verso Atual: 24px (mobile) → 48px (desktop)
  - Verso Próximo: 20px (mobile) → 40px (desktop)
  - Título: 18px (mobile) → 32px (desktop)
  - Artista: 14px (mobile) → 18px (desktop)

Letter Spacing: 0.5px (normal), 0.3px (title)
Line Height: 1.5 (versos), 1.2 (títulos)
```

### Componentes Visuais

- **Album Art**: 120px × 120px (mobile) → 300px × 300px (desktop)
  - Border-radius: 16px
  - Box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3)
  - Blur background: saturate(1.2) + blur(40px)

- **Barra de Destaque (Green Neon)**
  - Width: 100% do verso + 16px padding
  - Height: auto (content-aware)
  - Border-radius: 12px
  - Glow intenso: animação pulsante sutil
  - Opacity: 1.0

- **Player Controls**
  - Size: 40px × 40px (ícones)
  - Posição: inferior ou flutuante
  - Opcidade hover: 100% → 80%
  - Transição: 200ms smooth

---

## 📱 Responsividade por Plataforma

### 1. Smartphone (iPhone/Android)
- **Orientação**: Vertical (portrait) prioritária
- **Layout**: Full-screen vertical
- **Verso Atual**: 24px, bold
- **Album Art**: 120px × 120px, topo
- **Controls**: Inferior flutuante, touch-friendly (44px min)
- **Verso Spacing**: 20px entre linhas
- **Safe Area**: respeitado (notch, home indicator)
- **Exemplo**: iPhone 15 Pro (393×852px)

### 2. Tablet
- **Orientação**: Horizontal e vertical adaptáveis
- **Layout**: Horizontal: album art esquerda (40%), lyrics centro (60%)
- **Verso Atual**: 32px
- **Album Art**: 200px × 200px
- **Controls**: Canto inferior direito
- **Exemplo**: iPad Pro 11" (1194×834px)

### 3. Desktop / Web
- **Resolução**: 1920×1080 até 3840×2160 (8K)
- **Layout**: Album esquerda (30%), lyrics centro (70%)
- **Verso Atual**: 48px
- **Album Art**: 300px × 300px
- **Player Completo**: Visível na base
- **Sidebar Opcional**: Artist info, playlist, etc.
- **Exemplo**: MacBook Pro 16" (3456×2234px)

### 4. Smart TV
- **Resolução**: 1920×1080 até 4K
- **Layout**: Landscape maximizado
- **Verso Atual**: 56px+
- **Album Art**: 400px × 400px
- **Controls**: Remoto (setas, OK, voltar)
- **Fonte**: Extra grande para visualização distante
- **Exemplo**: Samsung QLED 65" (3840×2160px)

### 5. Smartwatch
- **Resolução**: 240×240 até 466×500
- **Layout**: Vertical circular (watchOS) ou quadrado (WearOS)
- **Verso Atual**: 14-16px apenas (2-3 linhas máximo)
- **Album Art**: Miniatura circular (60px)
- **Highlight**: Green neon apenas (simples)
- **Controls**: Gestos + botões físicos
- **Exemplo**: Apple Watch Ultra (396×476px)

---

## 🔄 Sincronização com Áudio (Timestamps)

### Formato de Letra com Timestamps

```json
{
  "trackId": "12345",
  "title": "Song Name",
  "artist": "Artist Name",
  "albumArt": "https://...",
  "bpm": 120,
  "lyrics": [
    {
      "id": "verse_1",
      "text": "Primeira linha da letra",
      "startTime": 0,
      "endTime": 2000,
      "words": [
        { "word": "Primeira", "startTime": 0, "endTime": 400 },
        { "word": "linha", "startTime": 400, "endTime": 800 },
        { "word": "da", "startTime": 800, "endTime": 1000 },
        { "word": "letra", "startTime": 1000, "endTime": 2000 }
      ]
    },
    {
      "id": "verse_2",
      "text": "Segunda linha da letra",
      "startTime": 2000,
      "endTime": 4000,
      "words": [...]
    }
  ]
}
```

### Sincronização de Palavra (Avançado)

Quando sincronização por palavra está disponível:
- Highlight gradual por palavra
- Efeito de barra preenchida da esquerda para direita
- Animação smooth: `transition: all 0.15s linear`

---

## ⚡ Performance & Otimizações

### Targets de Performance

- **Frame Rate**: 60 FPS (zero frames dropped)
- **Latência**: <50ms entre timestamp de áudio e display
- **Bundle Size**: <50KB (gzipped)
- **Memory**: <15MB (mobile)
- **CPU**: <5% (idle), <15% (animando)

### Otimizações

1. **Rendering**
   - Virtual scrolling (render apenas 3 linhas: anterior, atual, próxima)
   - RequestAnimationFrame para animações
   - Transform + opacity (GPU accelerated)
   - Avoid layout thrashing

2. **Memory**
   - Object pooling para versos reutilizáveis
   - Lazy load album art
   - Cleanup de event listeners

3. **Network**
   - Lyrics pre-cached durante reprodução
   - Compressão GZIP
   - CDN para album art

---

## 🛠️ Arquitetura Técnica

### Estrutura de Camadas

```
┌─────────────────────────────────────┐
│      UI Layer (Platform-Specific)   │
│  React / Flutter / SwiftUI / etc    │
├─────────────────────────────────────┤
│     Lyrics Manager (Agnostic)       │
│  - LyricsSync                       │
│  - LyricsAnimation                  │
│  - ResponsiveLayout                 │
├─────────────────────────────────────┤
│       API Layer (Backend)           │
│  - GET /lyrics/:trackId             │
│  - POST /lyrics/sync                │
│  - Caching + CDN                    │
├─────────────────────────────────────┤
│     Data Layer (Database)           │
│  - Prisma (Lyrics table)            │
│  - Redis (Cache)                    │
└─────────────────────────────────────┘
```

### Componentes Principais

1. **LyricsDisplay** (React)
   - Estado: currentVerse, nextVerse, currentTime
   - Props: track, lyrics, isPlaying
   - Render: verso atual centralizado + próximo

2. **LyricsSync** (Hook/Service)
   - Sincroniza currentTime com versos
   - Calcula interpolação de animação
   - Trigger de callbacks

3. **LyricsAnimation** (CSS/Framer)
   - Gerencia transições entre versos
   - Aplica efeitos de fade/blur
   - Controlado por BPM

4. **ResponsiveLayout** (Media Queries + JS)
   - Adapta layout por screen size
   - Ajusta font sizes
   - Reposiciona elementos

---

## 📦 Arquivos Implementação

```
web/src/
├── components/
│   └── LyricsDisplay/
│       ├── LyricsDisplay.tsx (componente principal)
│       ├── VerseLine.tsx (verso individual)
│       └── LyricsDisplay.module.css (estilos)
├── hooks/
│   ├── useLyricsSync.ts (sincronização)
│   └── useResponsiveLyrics.ts (responsividade)
├── types/
│   └── lyrics.ts (tipos TypeScript)
├── styles/
│   └── lyrics-animations.css (animações globais)
└── utils/
    └── lyricsParser.ts (parse de letras)

backend/src/
├── lyrics/
│   ├── lyrics.service.ts
│   ├── lyrics.controller.ts
│   ├── dto/
│   └── entities/
├── prisma/
│   └── schema.prisma (modelo de dados)
└── cache/
    └── lyrics.cache.ts

mobile/lib/
├── widgets/
│   └── lyrics_display/
│       ├── lyrics_display_widget.dart
│       └── lyrics_animation.dart
├── models/
│   └── lyrics_model.dart
├── services/
│   └── lyrics_service.dart
└── utils/
    └── lyrics_responsive.dart
```

---

## 🎯 Checklist de Implementação

- [ ] Backend API endpoints
- [ ] Database schema
- [ ] React components (Web)
- [ ] Flutter widgets (Mobile)
- [ ] Animation system
- [ ] Sync mechanism
- [ ] Responsive layouts
- [ ] Dark/Light theme
- [ ] Performance testing (60 FPS)
- [ ] Cross-platform testing
- [ ] Documentation
- [ ] Production deployment

---

## 📊 KPIs & Métricas

- **Sincronização**: ±50ms de precisão
- **Frame Rate**: 59-60 FPS mantido
- **Time to Interactive**: <2s
- **Latência de Entrada**: <100ms
- **Taxa de Erro de Sync**: <0.1%

---

**Versão**: 1.0
**Última atualização**: 16 de abril de 2026
**Status**: Ready for Implementation ✅
