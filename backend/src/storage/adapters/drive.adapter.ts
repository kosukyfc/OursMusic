import { Injectable } from '@nestjs/common';
import { google, drive_v3 } from 'googleapis';
import { StorageAdapter, StorageFile } from '../storage.interface';

@Injectable()
export class DriveAdapter implements StorageAdapter {
  private accessToken: string;
  private drive: drive_v3.Drive;

  /** Root folder name in Google Drive */
  private readonly ROOT_FOLDER = 'Music Library';

  setAccessToken(token: string): void {
    this.accessToken = token;
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    this.drive = google.drive({ version: 'v3', auth });
  }

  private getDrive(): drive_v3.Drive {
    if (!this.drive) {
      throw new Error('Access token not set. Call setAccessToken() before using DriveAdapter.');
    }
    return this.drive;
  }

  /**
   * Finds a folder by name inside a parent (or root if no parentId).
   * Returns the folder ID or null if not found.
   */
  async findFolder(name: string, parentId?: string): Promise<string | null> {
    const drive = this.getDrive();
    const q = parentId
      ? `mimeType='application/vnd.google-apps.folder' and name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed=false`
      : `mimeType='application/vnd.google-apps.folder' and name='${name.replace(/'/g, "\\'")}' and trashed=false`;

    const res = await drive.files.list({ q, fields: 'files(id)', pageSize: 1 });
    return res.data.files?.[0]?.id ?? null;
  }

  /**
   * Finds or creates a folder by name inside a parent.
   * Returns the folder ID.
   */
  async ensureFolder(name: string, parentId?: string): Promise<string> {
    const existing = await this.findFolder(name, parentId);
    if (existing) return existing;

    const drive = this.getDrive();
    const res = await drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId ? { parents: [parentId] } : {}),
      },
      fields: 'id',
    });
    return res.data.id!;
  }

  /**
   * Ensures the full path: Music Library / Artist / Album
   * Returns the album folder ID.
   */
  async ensureArtistAlbumFolder(artist: string, album: string): Promise<string> {
    const rootId = await this.ensureFolder(this.ROOT_FOLDER);
    const artistId = await this.ensureFolder(this.sanitizeName(artist), rootId);
    const albumId = await this.ensureFolder(this.sanitizeName(album), artistId);
    return albumId;
  }

  /**
   * Uploads a file into a specific Drive folder and makes it publicly readable.
   * Returns the Drive file ID.
   */
  async uploadToFolder(
    file: Buffer,
    fileName: string,
    mimeType: string,
    folderId: string,
  ): Promise<string> {
    const { Readable } = await import('stream');
    const stream = Readable.from(file);

    const res = await this.getDrive().files.create({
      requestBody: {
        name: fileName,
        mimeType,
        parents: [folderId],
      },
      media: { mimeType, body: stream },
      fields: 'id',
    });

    const fileId = res.data.id!;

    // Make the file publicly readable so any user can stream it
    await this.getDrive().permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    return fileId;
  }

  /**
   * Uploads a JSON metadata file into a folder.
   * Returns the Drive file ID.
   */
  async uploadMetadata(metadata: object, folderId: string): Promise<string> {
    const { Readable } = await import('stream');
    const json = JSON.stringify(metadata, null, 2);
    const stream = Readable.from(Buffer.from(json, 'utf-8'));

    const res = await this.getDrive().files.create({
      requestBody: {
        name: 'metadata.json',
        mimeType: 'application/json',
        parents: [folderId],
      },
      media: { mimeType: 'application/json', body: stream },
      fields: 'id',
    });
    return res.data.id!;
  }

  // ── StorageAdapter interface ──────────────────────────────────────────────

  /** Generic upload — places file in root Music Library folder (no artist/album). */
  async upload(file: Buffer, path: string, mimeType: string): Promise<string> {
    const rootId = await this.ensureFolder(this.ROOT_FOLDER);
    const fileName = path.split('/').pop() ?? path;
    return this.uploadToFolder(file, fileName, mimeType, rootId);
  }

  async getSignedUrl(fileId: string, _ttlSeconds: number): Promise<string> {
    // Return the public direct download URL — files are made public on upload
    return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  }

  async makePublic(fileId: string): Promise<void> {
    await this.getDrive().permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });
  }

  async delete(fileId: string): Promise<void> {
    await this.getDrive().files.delete({ fileId });
  }

  async listFiles(prefix: string): Promise<StorageFile[]> {
    const files: StorageFile[] = [];
    let pageToken: string | undefined;

    const query = prefix
      ? `mimeType contains 'audio' and '${prefix}' in parents and trashed=false`
      : `mimeType contains 'audio' and trashed=false`;

    do {
      const response = await this.getDrive().files.list({
        q: query,
        fields: 'nextPageToken, files(id, name, size, mimeType)',
        pageToken,
      });

      for (const f of response.data.files ?? []) {
        files.push({
          path: f.id!,
          size: f.size ? parseInt(f.size, 10) : 0,
          mimeType: f.mimeType ?? 'audio/mpeg',
        });
      }

      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    return files;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Removes characters invalid in Drive folder names. */
  private sanitizeName(name: string): string {
    return name.replace(/[/\\:*?"<>|]/g, '_').trim() || 'Unknown';
  }
}
