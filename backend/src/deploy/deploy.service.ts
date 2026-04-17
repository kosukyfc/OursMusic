import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import AdmZip from 'adm-zip';

export interface DeployEvent {
  type: 'info' | 'success' | 'error' | 'warning' | 'file' | 'done';
  message: string;
  progress?: number;
  file?: string;
  dest?: string;
}

@Injectable()
export class DeployService {
  constructor(private readonly config: ConfigService) {}

  private get rootPath(): string {
    return this.config.get<string>('DEPLOY_ROOT_PATH') ?? process.cwd();
  }

  private get backupPath(): string {
    return path.join(this.rootPath, 'backup_deploy');
  }

  async *runDeploy(zipBuffer: Buffer, versionTag: string, _k1: boolean, _k2: boolean): AsyncGenerator<DeployEvent> {
    const t0 = Date.now();
    yield { type: 'info', message: 'Deploy iniciado em ' + new Date().toLocaleString('pt-BR'), progress: 0 };
    let zip: AdmZip;
    try { zip = new AdmZip(zipBuffer); } catch {
      yield { type: 'error', message: 'ZIP invalido.', progress: 100 };
      yield { type: 'done', message: 'deploy_error', progress: 100 }; return;
    }
    const cl = this.readChangelog(zip);
    if (cl) yield { type: 'info', message: 'CHANGELOG:\n' + cl };
    const entries = zip.getEntries().filter(e => !e.isDirectory);
    const { modified, added } = this.analyseChanges(entries);
    yield { type: 'info', message: entries.length + ' arquivo(s) | ' + modified + ' modificado(s) | ' + added + ' novo(s)', progress: 8 };
    yield { type: 'info', message: 'Criando backup...', progress: 10 };
    try {
      const bf = await this.createBackup(versionTag);
      yield { type: 'success', message: 'Backup: ' + path.basename(bf), progress: 25 };
    } catch (e: any) {
      yield { type: 'error', message: 'Falha backup: ' + e.message, progress: 100 };
      yield { type: 'done', message: 'deploy_error', progress: 100 }; return;
    }
    yield { type: 'info', message: 'Extraindo...', progress: 30 };
    let done = 0; let ok = 0; let err = 0;
    for (const entry of entries) {
      const n = entry.entryName;
      if (['CHANGELOG.md','changelog.md','deploy.json'].includes(n)) { done++; continue; }
      const dest = this.resolveDestination(n);
      if (!dest) { yield { type: 'warning', message: 'Ignorado: ' + n }; done++; continue; }
      try {
        const dir = path.dirname(dest);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(dest, entry.getData());
        ok++;
        yield { type: 'file', message: 'OK: ' + n, file: n, dest, progress: 30 + Math.round((++done / entries.length) * 60) };
      } catch (e: any) {
        err++;
        yield { type: 'error', message: 'ERRO: ' + n + ' - ' + e.message, progress: 30 + Math.round((++done / entries.length) * 60) };
      }
    }
    if (versionTag) { try { fs.writeFileSync(path.join(this.rootPath, 'deploy_version.txt'), versionTag); } catch {} }
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    yield { type: 'success', message: 'Concluido em ' + elapsed + 's — ' + ok + ' ok, ' + err + ' erros', progress: 100 };
    yield { type: 'done', message: 'deploy_complete', progress: 100 };
  }

  listBackups(): { name: string; size: number; date: string }[] {
    if (!fs.existsSync(this.backupPath)) return [];
    return fs.readdirSync(this.backupPath)
      .filter(f => f.startsWith('backup_') && f.endsWith('.zip'))
      .map(f => { const full = path.join(this.backupPath, f); const s = fs.statSync(full); return { name: f, size: s.size, date: s.mtime.toISOString() }; })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  private readChangelog(zip: AdmZip): string | null {
    const e = zip.getEntry('CHANGELOG.md') ?? zip.getEntry('changelog.md');
    return e ? e.getData().toString('utf-8').slice(0, 2000) : null;
  }

  private analyseChanges(entries: ReturnType<AdmZip['getEntries']>): { modified: number; added: number } {
    let modified = 0; let added = 0;
    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const dest = this.resolveDestination(entry.entryName);
      if (!dest) continue;
      if (fs.existsSync(dest)) {
        const a = crypto.createHash('md5').update(fs.readFileSync(dest)).digest('hex');
        const b = crypto.createHash('md5').update(entry.getData()).digest('hex');
        if (a !== b) modified++;
      } else { added++; }
    }
    return { modified, added };
  }

  private resolveDestination(entryName: string): string | null {
    const n = entryName.replace(/\\\\/g, '/');
    let rel = n;
    if (n.startsWith('frontend/')) rel = n.slice(9);
    else if (n.startsWith('backend/')) rel = n.slice(8);
    if (!rel) return null;
    const dest = path.resolve(this.rootPath, rel);
    return dest.startsWith(path.resolve(this.rootPath)) ? dest : null;
  }

  private async createBackup(tag: string): Promise<string> {
    if (!fs.existsSync(this.backupPath)) fs.mkdirSync(this.backupPath, { recursive: true });
    const fn = 'backup_' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.zip';
    const zp = path.join(this.backupPath, fn);
    const zip = new AdmZip();
    this.addDirToZip(zip, this.rootPath, '', [this.backupPath]);
    zip.addFile('version.json', Buffer.from(JSON.stringify({ timestamp: new Date().toISOString(), version_tag: tag })));
    zip.writeZip(zp);
    return zp;
  }

  private addDirToZip(zip: AdmZip, dir: string, prefix: string, exclude: string[]): void {
    if (!fs.existsSync(dir)) return;
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      if (exclude.some(e => full.startsWith(e))) continue;
      const entry = prefix ? prefix + '/' + item : item;
      try {
        if (fs.statSync(full).isDirectory()) this.addDirToZip(zip, full, entry, exclude);
        else zip.addFile(entry, fs.readFileSync(full));
      } catch {}
    }
  }
}
