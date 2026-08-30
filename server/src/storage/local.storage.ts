import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { IStorageProvider, UploadParams, UploadResult } from './storage.interface';
import { env } from '../config/env';

export class LocalStorageProvider implements IStorageProvider {
  private baseDir: string;

  constructor(baseDir = env.LOCAL_UPLOAD_DIR) {
    this.baseDir = path.isAbsolute(baseDir) ? baseDir : path.join(process.cwd(), baseDir);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private resolvePath(storageKey: string): string {
    // Sanitize storageKey to prevent path traversal
    const safeKey = storageKey.replace(/\.\./g, '').replace(/^\/+/, '');
    return path.join(this.baseDir, safeKey);
  }

  async uploadFile(params: UploadParams): Promise<UploadResult> {
    const fullPath = this.resolvePath(params.storageKey);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, params.buffer);

    return {
      storageKey: params.storageKey,
      url: `/uploads/${params.storageKey}`,
      size: params.buffer.length,
      mimeType: params.mimeType,
    };
  }

  async deleteFile(storageKey: string): Promise<void> {
    const fullPath = this.resolvePath(storageKey);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  async getFileUrl(storageKey: string): Promise<string> {
    return `/uploads/${storageKey}`;
  }

  async getSignedDownloadUrl(storageKey: string, originalName: string): Promise<string> {
    return `/api/files/download/${encodeURIComponent(storageKey)}?filename=${encodeURIComponent(originalName)}`;
  }

  async getFileStream(storageKey: string): Promise<Readable | null> {
    const fullPath = this.resolvePath(storageKey);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    return fs.createReadStream(fullPath);
  }
}
