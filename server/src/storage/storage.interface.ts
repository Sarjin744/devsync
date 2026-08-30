import { Readable } from 'stream';

export interface UploadParams {
  storageKey: string;
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

export interface UploadResult {
  storageKey: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface IStorageProvider {
  /**
   * Uploads file buffer to cloud storage.
   */
  uploadFile(params: UploadParams): Promise<UploadResult>;

  /**
   * Deletes file object from cloud storage.
   */
  deleteFile(storageKey: string): Promise<void>;

  /**
   * Generates a view/preview URL or public URL.
   */
  getFileUrl(storageKey: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Generates a secure, short-lived signed download URL with Content-Disposition header.
   */
  getSignedDownloadUrl(
    storageKey: string,
    originalName: string,
    expiresInSeconds?: number,
  ): Promise<string>;

  /**
   * Gets a readable stream of the file content.
   */
  getFileStream(storageKey: string): Promise<Readable | null>;
}
