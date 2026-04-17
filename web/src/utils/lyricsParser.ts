/**
 * Utilidades para parsing, sincronização e transformação de dados de lyrics
 * Funciona com múltiplos formatos: LRC, SRT, JSON, Genius, Musixmatch
 */

import { LyricsVerse, LyricsData, LyricsWord, LyricsPlayerState } from '../types/lyrics';

/**
 * Formatos de arquivo de lyrics suportados
 * LRC: [mm:ss.xx]Text
 * SRT: Subtitle format
 * JSON: Estrutura LyricsData
 */

/**
 * Parse formato LRC (Lyrics Romanized Chinese)
 * Exemplo: [00:12.00]Primeira linha da música
 *          [00:24.50]Segunda linha
 */
export function parseLyricsLRC(lrcContent: string): LyricsVerse[] {
  const verseRegex = /\[(\d+):(\d+)\.(\d+)\](.+)/g;
  const verses: LyricsVerse[] = [];
  let match;
  let verseIndex = 0;

  while ((match = verseRegex.exec(lrcContent)) !== null) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const centiseconds = parseInt(match[3], 10);

    const startTime = (minutes * 60 + seconds) * 1000 + centiseconds * 10;
    
    // Estima duração até próximo verso (será ajustado depois)
    const estimatedDuration = 2000;

    verses.push({
      id: `verse_${verseIndex}`,
      text: match[4].trim(),
      startTime,
      endTime: startTime + estimatedDuration,
      type: undefined,
      words: undefined,
    });

    verseIndex++;
  }

  // Ajusta tempos de fim baseado no próximo verso
  for (let i = 0; i < verses.length - 1; i++) {
    verses[i].endTime = verses[i + 1].startTime;
  }

  // Último verso: adiciona 3 segundos
  if (verses.length > 0) {
    verses[verses.length - 1].endTime = verses[verses.length - 1].startTime + 3000;
  }

  return verses;
}

/**
 * Parse formato SRT (SubRip)
 * Exemplo:
 * 1
 * 00:00:12,000 --> 00:00:24,500
 * Primeira linha
 *
 * 2
 * 00:00:24,500 --> 00:00:37,000
 * Segunda linha
 */
export function parseLyricsSRT(srtContent: string): LyricsVerse[] {
  const srtRegex = /(\d+)\s+(\d+):(\d+):(\d+),(\d+)\s+-->\s+(\d+):(\d+):(\d+),(\d+)\s+(.+?)(?=\n\n|\Z)/gs;
  const verses: LyricsVerse[] = [];
  let match;
  let verseIndex = 0;

  while ((match = srtRegex.exec(srtContent)) !== null) {
    const startMinutes = parseInt(match[2], 10);
    const startSeconds = parseInt(match[3], 10);
    const startMilliseconds = parseInt(match[4], 10) * 1000 + parseInt(match[5], 10);
    const startTime = startMinutes * 60 * 1000 + startSeconds * 1000 + startMilliseconds;

    const endMinutes = parseInt(match[6], 10);
    const endSeconds = parseInt(match[7], 10);
    const endMilliseconds = parseInt(match[8], 10) * 1000 + parseInt(match[9], 10);
    const endTime = endMinutes * 60 * 1000 + endSeconds * 1000 + endMilliseconds;

    verses.push({
      id: `verse_${verseIndex}`,
      text: match[10].trim(),
      startTime,
      endTime,
      type: undefined,
      words: undefined,
    });

    verseIndex++;
  }

  return verses;
}

/**
 * Converte tempo em ms para formato MM:SS.MS
 */
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10);

  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}

/**
 * Converte formato MM:SS.MS para ms
 */
export function parseTime(timeStr: string): number {
  const [minSec, ms] = timeStr.split('.');
  const [minutes, seconds] = minSec.split(':').map(Number);
  return (minutes * 60 + seconds) * 1000 + (Number(ms) || 0) * 10;
}

/**
 * Calcula duração de um verso em relação a BPM
 * Exemplo: 120 BPM, 4 batidas = 2000ms
 */
export function calculateVerseDurationByBPM(bpm: number, beatsPerVerse: number = 4): number {
  return (beatsPerVerse / bpm) * 60 * 1000;
}

/**
 * Encontra o verso atual baseado no tempo de reprodução
 */
export function findCurrentVerse(
  lyrics: LyricsVerse[],
  currentTime: number
): { verse: LyricsVerse | null; index: number } {
  const index = lyrics.findIndex(
    (v) => currentTime >= v.startTime && currentTime < v.endTime
  );

  if (index === -1) {
    return { verse: null, index: -1 };
  }

  return { verse: lyrics[index], index };
}

/**
 * Calcula progresso do verso atual (0-1)
 */
export function calculateVerseProgress(verse: LyricsVerse, currentTime: number): number {
  if (verse.endTime <= verse.startTime) return 0;
  
  const progress = (currentTime - verse.startTime) / (verse.endTime - verse.startTime);
  return Math.max(0, Math.min(1, progress));
}

/**
 * Encontra a palavra atual dentro de um verso (para sincronização por palavra)
 */
export function findCurrentWord(
  verse: LyricsVerse,
  currentTime: number
): { word: LyricsWord | null; index: number } {
  if (!verse.words || verse.words.length === 0) {
    return { word: null, index: -1 };
  }

  const index = verse.words.findIndex(
    (w) => currentTime >= w.startTime && currentTime < w.endTime
  );

  if (index === -1) {
    return { word: null, index: -1 };
  }

  return { word: verse.words[index], index };
}

/**
 * Calcula o estado atual do player de lyrics
 */
export function calculateLyricsPlayerState(
  lyrics: LyricsVerse[],
  currentTime: number,
  isPlaying: boolean
): LyricsPlayerState {
  const { verse: currentVerse, index: currentIndex } = findCurrentVerse(lyrics, currentTime);

  const nextVerse =
    currentIndex >= 0 && currentIndex < lyrics.length - 1
      ? lyrics[currentIndex + 1]
      : null;

  const previousVerse = currentIndex > 0 ? lyrics[currentIndex - 1] : null;

  const verseProgress = currentVerse
    ? calculateVerseProgress(currentVerse, currentTime)
    : 0;

  return {
    currentVerse,
    nextVerse,
    previousVerse,
    currentTime,
    verseProgress,
    isPlaying,
    currentVerseIndex: currentIndex >= 0 ? currentIndex : 0,
    totalVerses: lyrics.length,
  };
}

/**
 * Sincroniza letras com offset de tempo (para compensar delay de áudio)
 */
export function offsetLyricsTime(lyrics: LyricsVerse[], offsetMs: number): LyricsVerse[] {
  return lyrics.map((verse) => ({
    ...verse,
    startTime: verse.startTime + offsetMs,
    endTime: verse.endTime + offsetMs,
    words: verse.words
      ? verse.words.map((word) => ({
          ...word,
          startTime: word.startTime + offsetMs,
          endTime: word.endTime + offsetMs,
        }))
      : undefined,
  }));
}

/**
 * Detecta o tipo de verso (verso, refrão, ponte, etc.) baseado em padrões
 */
export function detectVerseType(text: string, previousText?: string): LyricsVerse['type'] {
  const lowerText = text.toLowerCase();
  const lowerPrev = previousText?.toLowerCase() || '';

  if (
    lowerText.includes('chorus') ||
    lowerText.includes('refrão') ||
    lowerText === lowerPrev
  ) {
    return 'chorus';
  }
  if (
    lowerText.includes('bridge') ||
    lowerText.includes('ponte')
  ) {
    return 'bridge';
  }
  if (
    lowerText.includes('pre-chorus') ||
    lowerText.includes('pré-refrão')
  ) {
    return 'pre-chorus';
  }
  if (
    lowerText.includes('outro') ||
    lowerText.includes('final')
  ) {
    return 'outro';
  }
  if (
    lowerText.includes('intro') ||
    lowerText.includes('introdução')
  ) {
    return 'intro';
  }

  return 'verse';
}

/**
 * Valida estrutura de LyricsData
 */
export function validateLyricsData(data: unknown): data is LyricsData {
  if (!data || typeof data !== 'object') return false;

  const d = data as any;

  return (
    typeof d.trackId === 'string' &&
    typeof d.title === 'string' &&
    typeof d.artist === 'string' &&
    typeof d.albumArt === 'string' &&
    typeof d.bpm === 'number' &&
    Array.isArray(d.lyrics) &&
    d.lyrics.every(
      (v: any) =>
        typeof v.id === 'string' &&
        typeof v.text === 'string' &&
        typeof v.startTime === 'number' &&
        typeof v.endTime === 'number'
    )
  );
}

/**
 * Detecta linguagem do texto usando heurísticas simples
 */
export function detectLanguage(
  text: string
): 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR' | 'de-DE' | 'ja-JP' | 'zh-CN' {
  // Caracteres Japoneses
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
    return 'ja-JP';
  }

  // Caracteres Chineses
  if (/[\u4E00-\u9FFF]/.test(text)) {
    return 'zh-CN';
  }

  // Palavras-chave em português
  if (/\b(é|ção|ão|ações|que|você|para|com|sem)\b/i.test(text)) {
    return 'pt-BR';
  }

  // Palavras-chave em espanhol
  if (/\b(es|está|está|aunque|porque|vamos)\b/i.test(text)) {
    return 'es-ES';
  }

  // Palavras-chave em francês
  if (/\b(être|avoir|c'est|pour|avec)\b/i.test(text)) {
    return 'fr-FR';
  }

  // Palavras-chave em alemão
  if (/\b(ist|sein|werden|haben|nicht)\b/i.test(text)) {
    return 'de-DE';
  }

  // Padrão padrão: Inglês
  return 'en-US';
}

/**
 * Exporta letras em formato LRC
 */
export function exportLyricsAsLRC(lyrics: LyricsData): string {
  let lrcContent = `[ti:${lyrics.title}]\n`;
  lrcContent += `[ar:${lyrics.artist}]\n`;
  lrcContent += `[00:00.00]\n\n`;

  lyrics.lyrics.forEach((verse) => {
    const minutes = Math.floor(verse.startTime / 60000);
    const seconds = Math.floor((verse.startTime % 60000) / 1000);
    const centiseconds = Math.floor((verse.startTime % 1000) / 10);

    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;

    lrcContent += `${timeStr}${verse.text}\n`;
  });

  return lrcContent;
}
