import { Client } from 'minio';

import { config } from '../../config/index.js';

import { logger } from './logger.js';

class MinioService {
  private client: Client | null = null;
  private isConnected: boolean = false;

  async connect(): Promise<void> {
    // Skip connection if MinIO is disabled
    if (!config.minio.enabled) {
      logger.info('MinIO is disabled, skipping connection');
      return;
    }

    try {
      this.client = new Client({
        endPoint: config.minio.endPoint,
        port: config.minio.port,
        useSSL: config.minio.useSSL,
        accessKey: config.minio.accessKey,
        secretKey: config.minio.secretKey,
      });

      // Create bucket if it doesn't exist
      const bucketExists = await this.client.bucketExists(config.minio.bucket);
      if (!bucketExists) {
        await this.client.makeBucket(config.minio.bucket, 'us-east-1');
        logger.info(`MinIO bucket created: ${config.minio.bucket}`);
      }

      this.isConnected = true;
      logger.info('MinIO connected successfully');
    } catch (error) {
      logger.error('Failed to connect to MinIO:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // MinIO client doesn't have a disconnect method
    this.client = null;
    this.isConnected = false;
    logger.info('MinIO disconnected');
  }

  getClient(): Client {
    if (!config.minio.enabled) {
      throw new Error('MinIO is disabled');
    }
    if (!this.client || !this.isConnected) {
      throw new Error('MinIO not connected');
    }
    return this.client;
  }

  async uploadFile(
    filename: string,
    buffer: Buffer,
    metadata?: Record<string, string>
  ): Promise<string> {
    const client = this.getClient();
    try {
      await client.putObject(config.minio.bucket, filename, buffer, buffer.length, metadata);
      logger.info(`File uploaded to MinIO: ${filename}`);
      return filename;
    } catch (error) {
      logger.error('Failed to upload file to MinIO:', error);
      throw error;
    }
  }

  async downloadFile(filename: string): Promise<Buffer> {
    const client = this.getClient();
    try {
      const stream = await client.getObject(config.minio.bucket, filename);
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      logger.error('Failed to download file from MinIO:', error);
      throw error;
    }
  }

  async deleteFile(filename: string): Promise<void> {
    const client = this.getClient();
    try {
      await client.removeObject(config.minio.bucket, filename);
      logger.info(`File deleted from MinIO: ${filename}`);
    } catch (error) {
      logger.error('Failed to delete file from MinIO:', error);
      throw error;
    }
  }

  async getFileUrl(filename: string, expirySeconds = 3600): Promise<string> {
    const client = this.getClient();
    try {
      return await client.presignedGetObject(config.minio.bucket, filename, expirySeconds);
    } catch (error) {
      logger.error('Failed to generate presigned URL:', error);
      throw error;
    }
  }

  async listFiles(prefix?: string): Promise<string[]> {
    const client = this.getClient();
    const files: string[] = [];

    return new Promise((resolve, reject) => {
      const stream = client.listObjects(config.minio.bucket, prefix, true);

      stream.on('data', (obj) => {
        if (obj.name) {
          files.push(obj.name);
        }
      });

      stream.on('end', () => resolve(files));
      stream.on('error', reject);
    });
  }

  async fileExists(filename: string): Promise<boolean> {
    const client = this.getClient();
    try {
      await client.statObject(config.minio.bucket, filename);
      return true;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    // If MinIO is disabled, consider it healthy (not required)
    if (!config.minio.enabled) {
      return true;
    }

    try {
      const client = this.getClient();
      await client.bucketExists(config.minio.bucket);
      return true;
    } catch {
      return false;
    }
  }
}

export const minioService = new MinioService();
