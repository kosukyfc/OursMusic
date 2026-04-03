export interface StorageFile {
  path: string;
  size: number;
  mimeType: string;
}

export interface StorageAdapter {
  upload(file: Buffer, path: string, mimeType: string): Promise<string>;
  getSignedUrl(path: string, ttlSeconds: number): Promise<string>;
  delete(path: string): Promise<void>;
  listFiles(prefix: string): Promise<StorageFile[]>;
}
