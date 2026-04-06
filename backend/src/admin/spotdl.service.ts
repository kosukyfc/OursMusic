import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StorageAdapterFactory } from '../storage/storage-adapter.factory';
import { StorageType } from '@prisma/client';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const SPOTDL = 'C:\\Users\\Administrator\\AppData\\Local\\Programs\\Python\\Python311\\Scripts\\spotdl.exe';
const FFMPEG = 'C:\\Users\\Administrator\\.spotdl\\ffmpeg.exe';

export interface SpotdlProgress {
  status: 'downloading' | 'processing' | 'uploading' | 'done' | 'error';
  current: number;
  total: number;
  track?: string;
  error?: string;
}

@Injectable()
export class SpotdlService {
  private readonly logger = new Logger(SpotdlService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageAdapterFactory: StorageAdapterFactory,
    private readonly config: ConfigService,
  ) {}

  /**
   * Baixa faixas de um link do Spotify (faixa, álbum ou playlist)
   * e salva no S3 + banco de dados.
   * Chama onProgress a cada atualização.
   */
  async downloadFromSpotify(
    spotifyUrl: string,
    userId: string,
    onProgress: (p: SpotdlProgress) => void,
  ): Promise<{ imported: number; skipped: number; errors: number }> {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spotdl-'));
    let imported = 0, skipped = 0, errors = 0;

    try {
      // 1. Roda spotdl para baixar as faixas
      const files = await this.runSpotdl(spotifyUrl, tmpDir, onProgress);

      if (files.length === 0) {
        onProgress({ status: 'error', current: 0, total: 0, error: 'Nenhuma faixa baixada' });
        return { imported: 0, skipped: 0, errors: 1 };
      }

      // 2. Para cada arquivo baixado, faz upload e salva no banco
      for (let i = 0; i < files.length; i++) {
        const filePath = files[i];
        const fileName = path.basename(filePath);

        onProgress({ status: 'uploading', current: i + 1, total: files.length, track: fileName });

        try {
          // Extrai metadados do nome do arquivo (spotdl usa "Artista - Título.mp3")
          const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');
          const parts = nameWithoutExt.split(' - ');
          const artist = parts.length > 1 ? parts[0].trim() : null;
          const title = parts.length > 1 ? parts.slice(1).join(' - ').trim() : nameWithoutExt;

          // Verifica duplicata
          const existing = await this.prisma.song.findFirst({
            where: { title: { equals: title, mode: 'insensitive' }, artist: artist ? { equals: artist, mode: 'insensitive' } : undefined },
          });
          if (existing) { skipped++; continue; }

          // Lê o arquivo
          const buffer = fs.readFileSync(filePath);
          const mimeType = filePath.endsWith('.mp3') ? 'audio/mpeg' : 'audio/ogg';

          // Upload para S3
          const adapter = this.storageAdapterFactory.getAdapter(StorageType.s3);
          const storagePath = await adapter.upload(
            buffer,
            `${artist ?? 'Unknown'}/${title}/${fileName}`,
            mimeType,
          );

          // Tenta extrair duração do arquivo de metadados JSON gerado pelo spotdl
          let duration = 0;
          let coverUrl: string | null = null;
          const jsonPath = filePath.replace(/\.[^.]+$/, '.spotdl');
          if (fs.existsSync(jsonPath)) {
            try {
              const meta = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
              duration = Math.round((meta.duration ?? 0) / 1000);
              coverUrl = meta.cover_url ?? null;
            } catch (_) {}
          }

          // Salva no banco
          await this.prisma.song.create({
            data: {
              title,
              artist,
              coverUrl,
              duration: duration || 180, // fallback 3min
              storageType: StorageType.s3,
              storagePath,
              fileSize: BigInt(buffer.length),
              mimeType,
              uploadedBy: userId,
              available: true,
            },
          });

          imported++;
        } catch (e) {
          this.logger.error(`Erro ao processar ${fileName}: ${e}`);
          errors++;
        }
      }

      onProgress({ status: 'done', current: files.length, total: files.length });
      return { imported, skipped, errors };
    } finally {
      // Limpa arquivos temporários
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
    }
  }

  private runSpotdl(url: string, outDir: string, onProgress: (p: SpotdlProgress) => void): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const args = [
        'download', url,
        '--output', outDir,
        '--ffmpeg', FFMPEG,
        '--format', 'mp3',
        '--bitrate', '320k',
        '--print-errors',
        '--no-cache',
      ];

      this.logger.log(`Running spotdl: ${SPOTDL} ${args.join(' ')}`);
      const proc = spawn(SPOTDL, args, { cwd: outDir });

      let total = 0;
      let current = 0;
      let currentTrack = '';

      proc.stdout.on('data', (data: Buffer) => {
        const line = data.toString();
        this.logger.debug(`spotdl: ${line.trim()}`);

        // Detecta início de download
        if (line.includes('Downloading')) {
          const match = line.match(/Downloading\s+"?(.+?)"?\s/);
          if (match) { currentTrack = match[1]; current++; }
          onProgress({ status: 'downloading', current, total: Math.max(total, current), track: currentTrack });
        }
        // Detecta total de faixas
        if (line.includes('Found') && line.includes('song')) {
          const match = line.match(/Found (\d+)/);
          if (match) total = parseInt(match[1]);
        }
        // Detecta conversão
        if (line.includes('Converting')) {
          onProgress({ status: 'processing', current, total: Math.max(total, current), track: currentTrack });
        }
      });

      proc.stderr.on('data', (data: Buffer) => {
        this.logger.warn(`spotdl stderr: ${data.toString().trim()}`);
      });

      proc.on('close', (code) => {
        // Coleta todos os mp3 baixados
        const files = fs.readdirSync(outDir)
          .filter(f => f.endsWith('.mp3') || f.endsWith('.ogg') || f.endsWith('.flac'))
          .map(f => path.join(outDir, f));

        if (files.length === 0 && code !== 0) {
          reject(new Error(`spotdl saiu com código ${code} e nenhum arquivo foi baixado`));
        } else {
          resolve(files);
        }
      });

      proc.on('error', reject);
    });
  }
}
