/**
 * Dados de Exemplo para Testes do Sistema de Lyrics Karaokê
 * Use esses dados para testar a implementação em development
 */

import { LyricsData } from '../types/lyrics';

/**
 * Exemplo 1: Música em Português com sincronização completa
 */
export const exampleLyricsPortuguese: LyricsData = {
  trackId: 'example-pt-001',
  title: 'Noite de Harmonia',
  artist: 'Luna e Marte',
  albumArt: 'https://via.placeholder.com/300x300?text=Luna+e+Marte',
  bpm: 120,
  duration: 240000, // 4 minutos
  language: 'pt-BR',
  hasWordSync: true,
  source: 'example',
  updatedAt: new Date().toISOString(),
  lyrics: [
    {
      id: 'intro_1',
      text: 'Quando a noite chega',
      startTime: 0,
      endTime: 2000,
      type: 'intro',
      words: [
        { word: 'Quando', startTime: 0, endTime: 500 },
        { word: 'a', startTime: 500, endTime: 700 },
        { word: 'noite', startTime: 700, endTime: 1200 },
        { word: 'chega', startTime: 1200, endTime: 2000 },
      ],
    },
    {
      id: 'verse_1_1',
      text: 'Trazendo sussurros de esperança',
      startTime: 2000,
      endTime: 4000,
      type: 'verse',
      words: [
        { word: 'Trazendo', startTime: 2000, endTime: 2500 },
        { word: 'sussurros', startTime: 2500, endTime: 3200 },
        { word: 'de', startTime: 3200, endTime: 3400 },
        { word: 'esperança', startTime: 3400, endTime: 4000 },
      ],
    },
    {
      id: 'verse_1_2',
      text: 'As estrelas brilham para iluminar nosso caminho',
      startTime: 4000,
      endTime: 6500,
      type: 'verse',
      words: [
        { word: 'As', startTime: 4000, endTime: 4300 },
        { word: 'estrelas', startTime: 4300, endTime: 5000 },
        { word: 'brilham', startTime: 5000, endTime: 5500 },
        { word: 'para', startTime: 5500, endTime: 5800 },
        { word: 'iluminar', startTime: 5800, endTime: 6200 },
        { word: 'nosso', startTime: 6200, endTime: 6350 },
        { word: 'caminho', startTime: 6350, endTime: 6500 },
      ],
    },
    {
      id: 'chorus_1',
      text: 'Noite de harmonia, noite de luz',
      startTime: 6500,
      endTime: 9000,
      type: 'chorus',
      words: [
        { word: 'Noite', startTime: 6500, endTime: 7000 },
        { word: 'de', startTime: 7000, endTime: 7200 },
        { word: 'harmonia,', startTime: 7200, endTime: 8000 },
        { word: 'noite', startTime: 8000, endTime: 8400 },
        { word: 'de', startTime: 8400, endTime: 8600 },
        { word: 'luz', startTime: 8600, endTime: 9000 },
      ],
    },
    {
      id: 'chorus_2',
      text: 'Onde os corações se encontram em perfeita comunhão',
      startTime: 9000,
      endTime: 11500,
      type: 'chorus',
      words: [
        { word: 'Onde', startTime: 9000, endTime: 9400 },
        { word: 'os', startTime: 9400, endTime: 9600 },
        { word: 'corações', startTime: 9600, endTime: 10200 },
        { word: 'se', startTime: 10200, endTime: 10400 },
        { word: 'encontram', startTime: 10400, endTime: 11000 },
        { word: 'em', startTime: 11000, endTime: 11150 },
        { word: 'perfeita', startTime: 11150, endTime: 11250 },
        { word: 'comunhão', startTime: 11250, endTime: 11500 },
      ],
    },
    {
      id: 'bridge_1',
      text: 'Deixa a melodia nos envolver',
      startTime: 11500,
      endTime: 13500,
      type: 'bridge',
      words: [
        { word: 'Deixa', startTime: 11500, endTime: 12000 },
        { word: 'a', startTime: 12000, endTime: 12200 },
        { word: 'melodia', startTime: 12200, endTime: 12900 },
        { word: 'nos', startTime: 12900, endTime: 13100 },
        { word: 'envolver', startTime: 13100, endTime: 13500 },
      ],
    },
    {
      id: 'outro_1',
      text: 'Noite de harmonia...',
      startTime: 13500,
      endTime: 15000,
      type: 'outro',
      words: [
        { word: 'Noite', startTime: 13500, endTime: 14000 },
        { word: 'de', startTime: 14000, endTime: 14200 },
        { word: 'harmonia...', startTime: 14200, endTime: 15000 },
      ],
    },
  ],
};

/**
 * Exemplo 2: Música em Inglês (Pop/Rock)
 */
export const exampleLyricsEnglish: LyricsData = {
  trackId: 'example-en-001',
  title: 'Electric Dreams',
  artist: 'Neon Hearts',
  albumArt: 'https://via.placeholder.com/300x300?text=Neon+Hearts',
  bpm: 128,
  duration: 220000, // ~3:40
  language: 'en-US',
  hasWordSync: true,
  source: 'example',
  updatedAt: new Date().toISOString(),
  lyrics: [
    {
      id: 'verse_1',
      text: 'We rise like lightning through the endless sky',
      startTime: 0,
      endTime: 3000,
      type: 'verse',
      words: [
        { word: 'We', startTime: 0, endTime: 400 },
        { word: 'rise', startTime: 400, endTime: 900 },
        { word: 'like', startTime: 900, endTime: 1300 },
        { word: 'lightning', startTime: 1300, endTime: 2000 },
        { word: 'through', startTime: 2000, endTime: 2300 },
        { word: 'the', startTime: 2300, endTime: 2500 },
        { word: 'endless', startTime: 2500, endTime: 2800 },
        { word: 'sky', startTime: 2800, endTime: 3000 },
      ],
    },
    {
      id: 'chorus_1',
      text: 'Electric dreams, we shine so bright',
      startTime: 3000,
      endTime: 5500,
      type: 'chorus',
      words: [
        { word: 'Electric', startTime: 3000, endTime: 3700 },
        { word: 'dreams,', startTime: 3700, endTime: 4200 },
        { word: 'we', startTime: 4200, endTime: 4500 },
        { word: 'shine', startTime: 4500, endTime: 5000 },
        { word: 'so', startTime: 5000, endTime: 5200 },
        { word: 'bright', startTime: 5200, endTime: 5500 },
      ],
    },
  ],
};

/**
 * Exemplo 3: Música sem sincronização por palavra
 * (apenas timestamps de verso)
 */
export const exampleLyricsNoWordSync: LyricsData = {
  trackId: 'example-no-word-sync',
  title: 'Simple Tune',
  artist: 'The Minimalists',
  albumArt: 'https://via.placeholder.com/300x300?text=The+Minimalists',
  bpm: 100,
  duration: 180000,
  language: 'en-US',
  hasWordSync: false,
  source: 'example',
  updatedAt: new Date().toISOString(),
  lyrics: [
    {
      id: 'verse_1',
      text: 'This is a simple song',
      startTime: 0,
      endTime: 2000,
      type: 'verse',
    },
    {
      id: 'verse_2',
      text: 'With just basic lyrics',
      startTime: 2000,
      endTime: 4000,
      type: 'verse',
    },
    {
      id: 'chorus',
      text: 'No word sync included',
      startTime: 4000,
      endTime: 6000,
      type: 'chorus',
    },
  ],
};

/**
 * Exemplo 4: Lyrics em Espanhol
 */
export const exampleLyricsSpanish: LyricsData = {
  trackId: 'example-es-001',
  title: 'Corazón Salvaje',
  artist: 'Los Románticos',
  albumArt: 'https://via.placeholder.com/300x300?text=Los+Romanticos',
  bpm: 110,
  duration: 200000,
  language: 'es-ES',
  hasWordSync: true,
  source: 'example',
  updatedAt: new Date().toISOString(),
  lyrics: [
    {
      id: 'verse_1',
      text: 'Mi corazón late al ritmo de la pasión',
      startTime: 0,
      endTime: 3000,
      type: 'verse',
      words: [
        { word: 'Mi', startTime: 0, endTime: 500 },
        { word: 'corazón', startTime: 500, endTime: 1200 },
        { word: 'late', startTime: 1200, endTime: 1700 },
        { word: 'al', startTime: 1700, endTime: 1900 },
        { word: 'ritmo', startTime: 1900, endTime: 2400 },
        { word: 'de', startTime: 2400, endTime: 2600 },
        { word: 'la', startTime: 2600, endTime: 2800 },
        { word: 'pasión', startTime: 2800, endTime: 3000 },
      ],
    },
  ],
};

/**
 * Exemplo 5: Lyrics muito longas (full song)
 */
export const exampleLyricsFull: LyricsData = {
  trackId: 'example-full-001',
  title: 'The Journey',
  artist: 'Wanderer',
  albumArt: 'https://via.placeholder.com/300x300?text=Wanderer',
  bpm: 115,
  duration: 300000, // 5 minutos
  language: 'en-US',
  hasWordSync: true,
  source: 'example',
  updatedAt: new Date().toISOString(),
  lyrics: Array.from({ length: 20 }, (_, i) => ({
    id: `verse_${i + 1}`,
    text: `Line ${i + 1} of this example lyrics. Keep scrolling to see how it flows smoothly.`,
    startTime: i * 3000,
    endTime: (i + 1) * 3000,
    type: i % 3 === 0 ? 'chorus' : 'verse' as const,
    words: [
      { word: 'Line', startTime: i * 3000, endTime: i * 3000 + 500 },
      { word: `${i + 1}`, startTime: i * 3000 + 500, endTime: i * 3000 + 1000 },
    ],
  })),
};

/**
 * Selector para obter exemplo pelo idioma
 */
export function getExampleLyrics(language: 'pt-BR' | 'en-US' | 'es-ES'): LyricsData {
  switch (language) {
    case 'pt-BR':
      return exampleLyricsPortuguese;
    case 'es-ES':
      return exampleLyricsSpanish;
    case 'en-US':
    default:
      return exampleLyricsEnglish;
  }
}

/**
 * Todos os exemplos disponíveis
 */
export const ALL_EXAMPLES = [
  exampleLyricsPortuguese,
  exampleLyricsEnglish,
  exampleLyricsSpanish,
  exampleLyricsNoWordSync,
  exampleLyricsFull,
];
