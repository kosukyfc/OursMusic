import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { StorageAdapter, StorageFile } from '../storage.interface';

@Injectable()
export class S3Adapter implements StorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string | null;

  constructor(private readonly configService: ConfigService) {
    const endpoint = configService.get<string>('S3_ENDPOINT');
    this.bucket = configService.get<string>('S3_BUCKET_NAME') ?? 'music';
    this.publicUrl = configService.get<string>('S3_PUBLIC_URL') ?? null;

    this.client = new S3Client({
      region: configService.get<string>('AWS_REGION') ?? 'us-east-1',
      credentials: {
        accessKeyId: configService.get<string>('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: configService.get<string>('AWS_SECRET_ACCESS_KEY')!,
      },
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    });
  }

  async upload(file: Buffer, path: string, mimeType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: path,
        Body: file,
        ContentType: mimeType,
      }),
    );
    return path;
  }

  async getSignedUrl(path: string, _ttlSeconds: number): Promise<string> {
    // For public buckets (Supabase), return the direct public URL — no signing needed
    if (this.publicUrl) {
      return `${this.publicUrl}/${path}`;
    }
    // Fallback: construct URL from endpoint
    const endpoint = this.configService.get<string>('S3_ENDPOINT') ?? '';
    return `${endpoint}/${this.bucket}/${path}`;
  }

  async delete(path: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: path,
      }),
    );
  }

  async listFiles(prefix: string): Promise<StorageFile[]> {
    const files: StorageFile[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );

      for (const obj of response.Contents ?? []) {
        if (obj.Key) {
          files.push({
            path: obj.Key,
            size: obj.Size ?? 0,
            mimeType: 'audio/mpeg',
          });
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return files;
  }
}
