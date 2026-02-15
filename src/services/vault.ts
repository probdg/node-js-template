import crypto from 'crypto';

import { config } from '../../config/index.js';

import { databaseService } from './database.js';
import { logger } from './logger.js';

import type { VaultEntry, CreateVaultEntryDto } from '@/types';

class VaultService {
  private algorithm: string;
  private encryptionKey: Buffer;

  constructor() {
    this.algorithm = config.vault.algorithm;
    // Ensure the key is exactly 32 bytes for AES-256
    const key = config.vault.encryptionKey;
    if (key.length < 32) {
      throw new Error('Vault encryption key must be at least 32 characters');
    }
    this.encryptionKey = Buffer.from(key.slice(0, 32), 'utf-8');
  }

  /**
   * Encrypt a value using AES-256-GCM
   */
  private encrypt(value: string): { encryptedValue: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.encryptionKey,
      iv
    ) as crypto.CipherGCM;

    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encryptedValue: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  /**
   * Decrypt a value using AES-256-GCM
   */
  private decrypt(encryptedValue: string, iv: string, authTag: string): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.encryptionKey,
      Buffer.from(iv, 'hex')
    ) as crypto.DecipherGCM;

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Store a credential in the vault
   */
  async set(data: CreateVaultEntryDto): Promise<VaultEntry> {
    try {
      const { encryptedValue, iv, authTag } = this.encrypt(data.value);

      // Store encrypted value with IV and auth tag
      const combinedEncrypted = `${authTag}:${encryptedValue}`;

      const result = await databaseService.query(
        `INSERT INTO vault (key, encrypted_value, iv, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (key) 
         DO UPDATE SET encrypted_value = $2, iv = $3, updated_at = NOW()
         RETURNING id, key, encrypted_value, iv, created_at, updated_at`,
        [data.key, combinedEncrypted, iv]
      );

      const row = result.rows[0];

      if (!row) {
        throw new Error('Failed to store vault entry');
      }

      logger.info(`Vault entry set for key: ${data.key}`);

      return {
        id: row.id,
        key: row.key,
        encryptedValue: row.encrypted_value,
        iv: row.iv,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      logger.error('Failed to set vault entry:', error);
      throw error;
    }
  }

  /**
   * Retrieve and decrypt a credential from the vault
   */
  async get(key: string): Promise<string | null> {
    try {
      const result = await databaseService.query(
        'SELECT encrypted_value, iv FROM vault WHERE key = $1',
        [key]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      if (!row) {
        return null;
      }

      const [authTag, encryptedValue] = row.encrypted_value.split(':');

      const decryptedValue = this.decrypt(encryptedValue, row.iv, authTag);

      return decryptedValue;
    } catch (error) {
      logger.error(`Failed to get vault entry for key: ${key}`, error);
      throw error;
    }
  }

  /**
   * Delete a credential from the vault
   */
  async delete(key: string): Promise<boolean> {
    try {
      const result = await databaseService.query('DELETE FROM vault WHERE key = $1 RETURNING id', [
        key,
      ]);

      const deleted = result.rowCount !== null && result.rowCount > 0;

      if (deleted) {
        logger.info(`Vault entry deleted for key: ${key}`);
      }

      return deleted;
    } catch (error) {
      logger.error(`Failed to delete vault entry for key: ${key}`, error);
      throw error;
    }
  }

  /**
   * Check if a key exists in the vault
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await databaseService.query('SELECT id FROM vault WHERE key = $1', [key]);

      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Failed to check vault entry existence for key: ${key}`, error);
      throw error;
    }
  }

  /**
   * List all keys in the vault (without values)
   */
  async listKeys(): Promise<string[]> {
    try {
      const result = await databaseService.query('SELECT key FROM vault ORDER BY created_at DESC');

      return result.rows.map((row) => row.key);
    } catch (error) {
      logger.error('Failed to list vault keys:', error);
      throw error;
    }
  }

  /**
   * Health check for vault service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to encrypt and decrypt a test value
      const testValue = 'health-check-test';
      const { encryptedValue, iv, authTag } = this.encrypt(testValue);
      const decrypted = this.decrypt(encryptedValue, iv, authTag);

      return decrypted === testValue;
    } catch {
      return false;
    }
  }
}

export const vaultService = new VaultService();
