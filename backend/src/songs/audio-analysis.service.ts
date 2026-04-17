/**
 * AudioAnalysisService
 *
 * Analisa um arquivo de áudio e extrai:
 *   - beatTimestamps: array de timestamps (ms) onde ocorrem as batidas
 *   - waveformData:   200 amostras de amplitude normalizada [0..1]
 *
 * Usa Python + librosa via subprocess. Se librosa não estiver disponível,
 * gera dados simulados baseados no BPM estimado.
 */

import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface AudioAnalysis {
  beatTimestamps: number[]; // ms
  waveformData: number[];   // 200 samples [0..1]
  bpm: number;
}

const PYTHON_SCRIPT = `
import sys, json, math, struct, wave, array as arr

def analyze(filepath):
    try:
        import librosa
        import numpy as np
        y, sr = librosa.load(filepath, sr=22050, mono=True, duration=None)
        # Beat tracking
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, units='frames')
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)
        beat_ms = [round(float(t) * 1000) for t in beat_times]
        # Waveform: 200 RMS samples
        hop = max(1, len(y) // 200)
        waveform = []
        for i in range(200):
            chunk = y[i*hop:(i+1)*hop]
            rms = float(np.sqrt(np.mean(chunk**2))) if len(chunk) > 0 else 0.0
            waveform.append(rms)
        # Normalize
        mx = max(waveform) if max(waveform) > 0 else 1.0
        waveform = [round(v / mx, 4) for v in waveform]
        bpm = float(tempo[0]) if hasattr(tempo, '__len__') else float(tempo)
        return {'beatTimestamps': beat_ms, 'waveformData': waveform, 'bpm': round(bpm, 1)}
    except Exception as e:
        # Fallback: simulate from duration using estimated 120 BPM
        import os
        size = os.path.getsize(filepath)
        duration_s = size / (128 * 1024 / 8)  # rough estimate at 128kbps
        bpm = 120.0
        interval_ms = round(60000 / bpm)
        beats = list(range(0, int(duration_s * 1000), interval_ms))
        import random
        random.seed(42)
        waveform = [round(0.3 + 0.7 * abs(math.sin(i * 0.15 + random.random() * 0.3)), 4) for i in range(200)]
        return {'beatTimestamps': beats, 'waveformData': waveform, 'bpm': bpm, 'fallback': True}

if __name__ == '__main__':
    result = analyze(sys.argv[1])
    print(json.dumps(result))
`;

@Injectable()
export class AudioAnalysisService {
  private readonly logger = new Logger(AudioAnalysisService.name);

  async analyze(audioBuffer: Buffer, mimeType: string): Promise<AudioAnalysis> {
    // Write buffer to temp file
    const ext = mimeType.includes('mp3') ? '.mp3' : mimeType.includes('ogg') ? '.ogg' : '.mp3';
    const tmpFile = path.join(os.tmpdir(), `audio-analysis-${Date.now()}${ext}`);
    const scriptFile = path.join(os.tmpdir(), `audio-analysis-${Date.now()}.py`);

    try {
      await fs.writeFile(tmpFile, audioBuffer);
      await fs.writeFile(scriptFile, PYTHON_SCRIPT);

      const result = await this.runPython(scriptFile, tmpFile);
      return result;
    } finally {
      await fs.unlink(tmpFile).catch(() => {});
      await fs.unlink(scriptFile).catch(() => {});
    }
  }

  async analyzeFile(filePath: string): Promise<AudioAnalysis> {
    const scriptFile = path.join(os.tmpdir(), `audio-analysis-${Date.now()}.py`);
    try {
      await fs.writeFile(scriptFile, PYTHON_SCRIPT);
      return await this.runPython(scriptFile, filePath);
    } finally {
      await fs.unlink(scriptFile).catch(() => {});
    }
  }

  private runPython(scriptFile: string, audioFile: string): Promise<AudioAnalysis> {
    return new Promise((resolve) => {
      const python = spawn('python', [scriptFile, audioFile], { timeout: 60000 });
      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (d) => { stdout += d.toString(); });
      python.stderr.on('data', (d) => { stderr += d.toString(); });

      python.on('close', (code) => {
        if (code !== 0 || !stdout.trim()) {
          this.logger.warn(`Audio analysis failed (code ${code}): ${stderr.slice(0, 200)}`);
          resolve(this.fallback());
          return;
        }
        try {
          const data = JSON.parse(stdout.trim());
          if (data.fallback) this.logger.warn('Audio analysis used fallback (librosa unavailable)');
          resolve({
            beatTimestamps: data.beatTimestamps ?? [],
            waveformData: data.waveformData ?? this.fallback().waveformData,
            bpm: data.bpm ?? 120,
          });
        } catch {
          this.logger.warn('Failed to parse audio analysis output');
          resolve(this.fallback());
        }
      });

      python.on('error', () => resolve(this.fallback()));
    });
  }

  /** Fallback when Python/librosa is unavailable */
  private fallback(): AudioAnalysis {
    const bpm = 120;
    const durationMs = 210000; // 3.5 min default
    const intervalMs = Math.round(60000 / bpm);
    const beats = Array.from({ length: Math.floor(durationMs / intervalMs) }, (_, i) => i * intervalMs);
    const waveform = Array.from({ length: 200 }, (_, i) =>
      Math.round((0.3 + 0.7 * Math.abs(Math.sin(i * 0.15))) * 10000) / 10000,
    );
    return { beatTimestamps: beats, waveformData: waveform, bpm };
  }
}
