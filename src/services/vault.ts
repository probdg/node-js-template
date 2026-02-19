import crypto from 'crypto';

import { config } from '../../config/index.js';

import { databaseService } from './database.js';
import { logger } from './logger.js';

import type { VaultEntry, CreateVaultEntryDto } from '@/types';

const prisma = () => databaseService.getClient();

class VaultService {
  private algorithm: string;
  private encryptionKey: Buffer;

  constructor() {
    // Validate encryption key even when disabled to ensure config is correct
    this.algorithm = config.vault.algorithm;
    const key = config.vault.encryptionKey;
    if (key.length < 32) {
      throw new Error('Vault encryption key must be at least 32 characters');
    }
    this.encryptionKey = Buffer.from(key.slice(0, 32), 'utf-8');
  }

  /**
   * Initialize vault service (currently no connection needed)
   */
  async connect(): Promise<void> {
    if (!config.vault.enabled) {
      logger.info('Vault is disabled, skipping initialization');
      return;
    }
    logger.info('Vault initialized successfully');
  }

  /**
   * Cleanup vault service
   */
  async disconnect(): Promise<void> {
    if (!config.vault.enabled) {
      return;
    }
    logger.info('Vault disconnected');
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
    if (!config.vault.enabled) {
      throw new Error('Vault is disabled');
    }

    try {
      const { encryptedValue, iv, authTag } = this.encrypt(data.value);

      // Store encrypted value with IV and auth tag
      const combinedEncrypted = `${authTag}:${encryptedValue}`;

      // Use upsert to handle both insert and update cases
      const result = await prisma().vaultEntry.upsert({
        where: { key: data.key },
        update: {
          encrypted_value: combinedEncrypted,
          iv: iv,
        },
        create: {
          key: data.key,
          encrypted_value: combinedEncrypted,
          iv: iv,
        },
      });

      logger.info(`Vault entry set for key: ${data.key}`);

      return {
        id: result.id,
        key: result.key,
        encryptedValue: result.encrypted_value,
        iv: result.iv,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
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
    if (!config.vault.enabled) {
      throw new Error('Vault is disabled');
    }

    try {
      const result = await prisma().vaultEntry.findUnique({
        where: { key },
        select: {
          encrypted_value: true,
          iv: true,
        },
      });

      if (!result) {
        return null;
      }

      // Validate encrypted value format
      if (!result.encrypted_value?.includes(':')) {
        throw new Error('Invalid encrypted value format in vault entry');
      }

      const [authTag, encryptedValue] = result.encrypted_value.split(':');

      if (!authTag || !encryptedValue) {
        throw new Error('Invalid encrypted value format in vault entry');
      }

      const decryptedValue = this.decrypt(encryptedValue, result.iv, authTag);

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
    if (!config.vault.enabled) {
      throw new Error('Vault is disabled');
    }

    try {
      const result = await prisma().vaultEntry.deleteMany({
        where: { key },
      });

      const deleted = result.count > 0;

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
    if (!config.vault.enabled) {
      throw new Error('Vault is disabled');
    }

    try {
      const result = await prisma().vaultEntry.findUnique({
        where: { key },
        select: { id: true },
      });

      return result !== null;
    } catch (error) {
      logger.error(`Failed to check vault entry existence for key: ${key}`, error);
      throw error;
    }
  }

  /**
   * List all keys in the vault (without values)
   */
  async listKeys(): Promise<string[]> {
    if (!config.vault.enabled) {
      throw new Error('Vault is disabled');
    }

    try {
      const results = await prisma().vaultEntry.findMany({
        select: { key: true },
        orderBy: { created_at: 'desc' },
      });

      return results.map((result) => result.key);
    } catch (error) {
      logger.error('Failed to list vault keys:', error);
      throw error;
    }
  }

  /**
   * Health check for vault service
   */
  async healthCheck(): Promise<boolean> {
    // If vault is disabled, consider it healthy (not required)
    if (!config.vault.enabled) {
      return true;
    }

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
