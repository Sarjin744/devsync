import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { IStorageProvider, UploadParams, UploadResult } from './storage.interface';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

export interface S3Config {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl?: string;
}

export class S3StorageProvider implements IStorageProvider {
  private client: S3Client;
  private bucket: string;
  private publicUrl?: string;

  constructor(config: S3Config) {
    this.bucket = config.bucket;
    this.publicUrl = config.publicUrl;

    const s3Config: {
      region: string;
      credentials: { accessKeyId: string; secretAccessKey: string };
      endpoint?: string;
      forcePathStyle?: boolean;
    } = {
      region: config.region || 'us-east-1',
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    };

    if (config.endpoint) {
      s3Config.endpoint = config.endpoint;
      s3Config.forcePathStyle = true; // Required for MinIO & R2 custom endpoints
    }

    this.client = new S3Client(s3Config);
  }

  async uploadFile(params: UploadParams): Promise<UploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.storageKey,
        Body: params.buffer,
        ContentType: params.mimeType,
        Metadata: {
          originalName: encodeURIComponent(params.originalName),
        },
      });

      await this.client.send(command);

      const url = this.publicUrl
        ? `${this.publicUrl.replace(/\/$/, '')}/${params.storageKey}`
        : `/api/files/download/${params.storageKey}`;

      return {
        storageKey: params.storageKey,
        url,
        size: params.buffer.length,
        mimeType: params.mimeType,
      };
    } catch (error) {
      logger.error('S3 upload failed:', error);
      throw new AppError('Failed to upload file to cloud storage', 500);
    }
  }

  async deleteFile(storageKey: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      });
      await this.client.send(command);
    } catch (error) {
      logger.error(`S3 delete failed for key ${storageKey}:`, error);
      throw new AppError('Failed to delete file from cloud storage', 500);
    }
  }

  async getFileUrl(storageKey: string, expiresInSeconds = 3600): Promise<string> {
    if (this.publicUrl) {
      return `${this.publicUrl.replace(/\/$/, '')}/${storageKey}`;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      });
      return await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    } catch (error) {
      logger.error(`Failed to generate signed URL for ${storageKey}:`, error);
      return `/api/files/download/${storageKey}`;
    }
  }

  async getSignedDownloadUrl(
    storageKey: string,
    originalName: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        ResponseContentDisposition: `attachment; filename="${encodeURIComponent(originalName)}"`,
      });
      return await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    } catch (error) {
      logger.error(`Failed to generate signed download URL for ${storageKey}:`, error);
      return `/api/files/download/${storageKey}`;
    }
  }

  async getFileStream(storageKey: string): Promise<Readable | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      });
      const response = await this.client.send(command);
      return (response.Body as Readable) || null;
    } catch (error) {
      logger.error(`Failed to retrieve file stream for ${storageKey}:`, error);
      return null;
    }
  }
}
