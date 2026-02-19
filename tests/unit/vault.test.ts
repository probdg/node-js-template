import { describe, it, expect, beforeEach, vi } from 'vitest';

import { databaseService } from '../../src/services/database';
import { vaultService } from '../../src/services/vault';

// Mock the logger
vi.mock('../../src/services/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock the database service
vi.mock('../../src/services/database', () => ({
  databaseService: {
    getClient: vi.fn(),
  },
}));

// Mock the config
vi.mock('../../config/index.js', () => ({
  config: {
    vault: {
      enabled: true,
      encryptionKey: 'test-encryption-key-must-be-32-chars-long-minimum',
      algorithm: 'aes-256-gcm',
    },
  },
}));

describe('VaultService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('set', () => {
    it('should store an encrypted credential in the vault', async () => {
      const mockVaultEntry = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        key: 'api_key',
        encrypted_value: 'encrypted:value',
        iv: '1234567890abcdef',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockPrismaClient = {
        vaultEntry: {
          upsert: vi.fn().mockResolvedValue(mockVaultEntry),
        },
      };

      vi.mocked(databaseService.getClient).mockReturnValue(mockPrismaClient as never);

      const result = await vaultService.set({
        key: 'api_key',
        value: 'secret_value',
      });

      expect(result).toEqual({
        id: mockVaultEntry.id,
        key: mockVaultEntry.key,
        encryptedValue: mockVaultEntry.encrypted_value,
        iv: mockVaultEntry.iv,
        createdAt: mockVaultEntry.created_at,
        updatedAt: mockVaultEntry.updated_at,
      });
      expect(mockPrismaClient.vaultEntry.upsert).toHaveBeenCalledWith({
        where: { key: 'api_key' },
        update: {
          encrypted_value: expect.any(String),
          iv: expect.any(String),
        },
        create: {
          key: 'api_key',
          encrypted_value: expect.any(String),
          iv: expect.any(String),
        },
      });
    });

    it('should update existing key on conflict', async () => {
      const mockVaultEntry = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        key: 'api_key',
        encryptedValue: 'new:encrypted:value',
        iv: 'newiv123456789ab',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPrismaClient = {
        vaultEntry: {
          upsert: vi.fn().mockResolvedValue(mockVaultEntry),
        },
      };

      vi.mocked(databaseService.getClient).mockReturnValue(mockPrismaClient as never);

      const result = await vaultService.set({
        key: 'api_key',
        value: 'new_secret_value',
      });

      expect(result.key).toBe('api_key');
      expect(mockPrismaClient.vaultEntry.upsert).toHaveBeenCalledWith({
        where: { key: 'api_key' },
        update: {
          encrypted_value: expect.any(String),
          iv: expect.any(String),
        },
        create: {
          key: 'api_key',
          encrypted_value: expect.any(String),
          iv: expect.any(String),
        },
      });
    });
  });

  describe('get', () => {
    it('should return null when key does not exist', async () => {
      const mockPrismaClient = {
        vaultEntry: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };

      vi.mocked(databaseService.getClient).mockReturnValue(mockPrismaClient as never);

      const result = await vaultService.get('non_existent_key');

      expect(result).toBeNull();
      expect(mockPrismaClient.vaultEntry.findUnique).toHaveBeenCalledWith({
        where: { key: 'non_existent_key' },
        select: {
          encrypted_value: true,
          iv: true,
        },
      });
    });

    it('should throw error for invalid encrypted value format', async () => {
      const testKey = 'test_key';

      // Mock invalid format (missing colon separator)
      const mockInvalidData = {
        encrypted_value: 'invalid_format_without_colon',
        iv: '1234567890abcdef1234567890abcdef',
      };

      const mockPrismaClient = {
        vaultEntry: {
          findUnique: vi.fn().mockResolvedValue(mockInvalidData),
        },
      };

      vi.mocked(databaseService.getClient).mockReturnValue(mockPrismaClient as never);

      await expect(vaultService.get(testKey)).rejects.toThrow(
        'Invalid encrypted value format in vault entry'
      );

      expect(mockPrismaClient.vaultEntry.findUnique).toHaveBeenCalledWith({
        where: { key: testKey },
        select: {
          encrypted_value: true,
          iv: true,
        },
      });
    });
  });

  describe('delete', () => {
    it('should delete a credential from the vault', async () => {
      const mockPrismaClient = {
        vaultEntry: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };

      vi.mocked(databaseService.getClient).mockReturnValue(mockPrismaClient as never);

      const result = await vaultService.delete('api_key');

      expect(result).toBe(true);
      expect(mockPrismaClient.vaultEntry.deleteMany).toHaveBeenCalledWith({
        where: { key: 'api_key' },
      });
    });

    it('should return false when key does not exist', async () => {
      const mockPrismaClient = {
        vaultEntry: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };

      vi.mocked(databaseService.getClient).mockReturnValue(mockPrismaClient as never);

      const result = await vaultService.delete('non_existent_key');

      expect(result).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      const mockPrismaClient = {
        vaultEntry: {
          findUnique: vi.fn().mockResolvedValue({ id: 'some-id' }),
        },
      };

      vi.mocked(databaseService.getClient).mockReturnValue(mockPrismaClient as never);

      const result = await vaultService.exists('api_key');

      expect(result).toBe(true);
      expect(mockPrismaClient.vaultEntry.findUnique).toHaveBeenCalledWith({
        where: { key: 'api_key' },
        select: { id: true },
      });
    });

    it('should return false when key does not exist', async () => {
      const mockPrismaClient = {
        vaultEntry: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };

      vi.mocked(databaseService.getClient).mockReturnValue(mockPrismaClient as never);

      const result = await vaultService.exists('non_existent_key');

      expect(result).toBe(false);
    });
  });

  describe('listKeys', () => {
    it('should return list of all keys in the vault', async () => {
      const mockKeys = [{ key: 'api_key' }, { key: 'db_password' }, { key: 'secret_token' }];

      const mockPrismaClient = {
        vaultEntry: {
          findMany: vi.fn().mockResolvedValue(mockKeys),
        },
      };

      vi.mocked(databaseService.getClient).mockReturnValue(mockPrismaClient as never);

      const result = await vaultService.listKeys();

      expect(result).toEqual(['api_key', 'db_password', 'secret_token']);
      expect(mockPrismaClient.vaultEntry.findMany).toHaveBeenCalledWith({
        select: { key: true },
        orderBy: { created_at: 'desc' },
      });
    });

    it('should return empty array when vault is empty', async () => {
      const mockPrismaClient = {
        vaultEntry: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      };

      vi.mocked(databaseService.getClient).mockReturnValue(mockPrismaClient as never);

      const result = await vaultService.listKeys();

      expect(result).toEqual([]);
    });
  });

  describe('healthCheck', () => {
    it('should return true when encryption/decryption works', async () => {
      const result = await vaultService.healthCheck();

      expect(result).toBe(true);
    });
  });

  describe('encryption/decryption', () => {
    it('should properly encrypt and decrypt values in round-trip', async () => {
      const testValue = 'my_secret_password_123';
      let capturedEncryptedValue = '';
      let capturedIv = '';

      // Mock the set operation to capture the encrypted values
      const mockPrismaClient = {
        vaultEntry: {
          upsert: vi.fn().mockImplementation(async (args: any) => {
            // Capture the encrypted value and IV
            capturedEncryptedValue = args.create.encrypted_value || args.update.encrypted_value;
            capturedIv = args.create.iv || args.update.iv;

            return {
              id: '123e4567-e89b-12d3-a456-426614174000',
              key: args.create.key || args.where.key,
              encrypted_value: capturedEncryptedValue,
              iv: capturedIv,
              created_at: new Date(),
              updated_at: new Date(),
            };
          }),
          findUnique: vi.fn().mockImplementation(async () => {
            // Return the captured encrypted values
            return {
              encrypted_value: capturedEncryptedValue,
              iv: capturedIv,
            };
          }),
        },
      };

      vi.mocked(databaseService.getClient).mockReturnValue(mockPrismaClient as never);

      // Set the value (this will encrypt it)
      const setResult = await vaultService.set({
        key: 'test_password',
        value: testValue,
      });

      expect(setResult.key).toBe('test_password');
      expect(setResult.encryptedValue).not.toBe(testValue);
      expect(setResult.encryptedValue).toContain(':'); // Should have authTag:encryptedValue format

      // Get the value (this will decrypt it)
      const retrievedValue = await vaultService.get('test_password');

      // Verify round-trip encryption/decryption works
      expect(retrievedValue).toBe(testValue);
    });

    it('should produce different encrypted values for the same input', async () => {
      const testValue = 'same_password';
      const capturedValues: string[] = [];

      // Mock to capture multiple encrypted values
      const mockPrismaClient = {
        vaultEntry: {
          upsert: vi.fn().mockImplementation(async (args: any) => {
            const encryptedValue = args.create.encrypted_value;
            capturedValues.push(encryptedValue);

            return {
              id: '123e4567-e89b-12d3-a456-426614174000',
              key: args.create.key,
              encrypted_value: encryptedValue,
              iv: args.create.iv,
              created_at: new Date(),
              updated_at: new Date(),
            };
          }),
        },
      };

      vi.mocked(databaseService.getClient).mockReturnValue(mockPrismaClient as never);

      // Encrypt the same value twice
      await vaultService.set({ key: 'test_key_1', value: testValue });
      await vaultService.set({ key: 'test_key_2', value: testValue });

      // Encrypted values should be different due to random IV
      expect(capturedValues).toHaveLength(2);
      expect(capturedValues[0]).not.toBe(capturedValues[1]);
    });
  });
});
