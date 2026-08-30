import { IStorageProvider } from './storage.interface';
import { S3StorageProvider } from './s3.storage';
import { LocalStorageProvider } from './local.storage';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

class StorageService {
  private provider: IStorageProvider;

  constructor() {
    this.provider = this.initializeProvider();
  }

  private initializeProvider(): IStorageProvider {
    const isS3Configured = Boolean(
      env.STORAGE_BUCKET && env.STORAGE_ACCESS_KEY && env.STORAGE_SECRET_KEY,
    );

    if (
      (env.STORAGE_PROVIDER === 's3' || env.STORAGE_PROVIDER === 'r2') &&
      isS3Configured
    ) {
      logger.info(
        `Initializing S3/R2 Cloud Storage Provider for bucket: ${env.STORAGE_BUCKET}`,
      );
      return new S3StorageProvider({
        endpoint: env.STORAGE_ENDPOINT || undefined,
        region: env.STORAGE_REGION || 'us-east-1',
        bucket: env.STORAGE_BUCKET,
        accessKeyId: env.STORAGE_ACCESS_KEY,
        secretAccessKey: env.STORAGE_SECRET_KEY,
        publicUrl: env.STORAGE_PUBLIC_URL || undefined,
      });
    }

    logger.info('Using Local / Stateless Storage Provider');
    return new LocalStorageProvider(env.LOCAL_UPLOAD_DIR);
  }

  /**
   * Generates a collision-resistant, path-traversal-safe storage key.
   */
  generateStorageKey(projectId: string, originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const base = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50);
    const uniqueId = uuidv4();
    return `projects/${projectId}/${uniqueId}-${base}${ext}`;
  }

  /**
   * Uploads file to the active storage provider.
   */
  async uploadFile(params: {
    storageKey: string;
    buffer: Buffer;
    mimeType: string;
    originalName: string;
  }) {
    return this.provider.uploadFile(params);
  }

  /**
   * Deletes file from the active storage provider.
   */
  async deleteFile(storageKey: string): Promise<void> {
    return this.provider.deleteFile(storageKey);
  }

  /**
   * Retrieves signed or public view URL.
   */
  async getFileUrl(storageKey: string, expiresInSeconds = 3600): Promise<string> {
    return this.provider.getFileUrl(storageKey, expiresInSeconds);
  }

  /**
   * Retrieves signed download URL with Content-Disposition header.
   */
  async getSignedDownloadUrl(
    storageKey: string,
    originalName: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    return this.provider.getSignedDownloadUrl(storageKey, originalName, expiresInSeconds);
  }

  /**
   * Streams file content.
   */
  async getFileStream(storageKey: string) {
    return this.provider.getFileStream(storageKey);
  }

  /**
   * Utility for cleaning up orphaned storage objects (can be run via scheduled job or maintenance).
   */
  async cleanupOrphanedFiles(storageKeys: string[]): Promise<number> {
    let deletedCount = 0;
    for (const key of storageKeys) {
      try {
        await this.provider.deleteFile(key);
        deletedCount++;
      } catch (err) {
        logger.warn(`Failed to cleanup storage object ${key}:`, err);
      }
    }
    return deletedCount;
  }
}

export const storageService = new StorageService();
export default storageService;
