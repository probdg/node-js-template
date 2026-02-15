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
    query: vi.fn(),
  },
}));

// Mock the config
vi.mock('../../config/index.js', () => ({
  config: {
    vault: {
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

      vi.mocked(databaseService.query).mockResolvedValue({
        rows: [mockVaultEntry],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

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
      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO vault'),
        expect.arrayContaining([
          'api_key',
          expect.any(String), // encrypted value
          expect.any(String), // iv
        ])
      );
    });

    it('should update existing key on conflict', async () => {
      const mockVaultEntry = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        key: 'api_key',
        encrypted_value: 'new:encrypted:value',
        iv: 'newiv123456789ab',
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(databaseService.query).mockResolvedValue({
        rows: [mockVaultEntry],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await vaultService.set({
        key: 'api_key',
        value: 'new_secret_value',
      });

      expect(result.key).toBe('api_key');
      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.any(Array)
      );
    });
  });

  describe('get', () => {
    it('should return null when key does not exist', async () => {
      vi.mocked(databaseService.query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await vaultService.get('non_existent_key');

      expect(result).toBeNull();
    });

    it('should throw error for invalid encrypted value format', async () => {
      const testKey = 'test_key';

      // Mock invalid format (missing colon separator)
      const mockInvalidData = {
        encrypted_value: 'invalid_format_without_colon',
        iv: '1234567890abcdef1234567890abcdef',
      };

      vi.mocked(databaseService.query).mockResolvedValue({
        rows: [mockInvalidData],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(vaultService.get(testKey)).rejects.toThrow(
        'Invalid encrypted value format in vault entry'
      );

      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT encrypted_value, iv FROM vault'),
        [testKey]
      );
    });
  });

  describe('delete', () => {
    it('should delete a credential from the vault', async () => {
      vi.mocked(databaseService.query).mockResolvedValue({
        rows: [{ id: 'deleted-id' }],
        rowCount: 1,
        command: 'DELETE',
        oid: 0,
        fields: [],
      });

      const result = await vaultService.delete('api_key');

      expect(result).toBe(true);
      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM vault'),
        ['api_key']
      );
    });

    it('should return false when key does not exist', async () => {
      vi.mocked(databaseService.query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'DELETE',
        oid: 0,
        fields: [],
      });

      const result = await vaultService.delete('non_existent_key');

      expect(result).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      vi.mocked(databaseService.query).mockResolvedValue({
        rows: [{ id: 'some-id' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await vaultService.exists('api_key');

      expect(result).toBe(true);
      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM vault'),
        ['api_key']
      );
    });

    it('should return false when key does not exist', async () => {
      vi.mocked(databaseService.query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await vaultService.exists('non_existent_key');

      expect(result).toBe(false);
    });
  });

  describe('listKeys', () => {
    it('should return list of all keys in the vault', async () => {
      const mockKeys = [{ key: 'api_key' }, { key: 'db_password' }, { key: 'secret_token' }];

      vi.mocked(databaseService.query).mockResolvedValue({
        rows: mockKeys,
        rowCount: 3,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await vaultService.listKeys();

      expect(result).toEqual(['api_key', 'db_password', 'secret_token']);
      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT key FROM vault')
      );
    });

    it('should return empty array when vault is empty', async () => {
      vi.mocked(databaseService.query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

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
      vi.mocked(databaseService.query).mockImplementation(async (sql: string, params?: any[]) => {
        if (sql.includes('INSERT INTO vault')) {
          // Capture the encrypted value and IV
          capturedEncryptedValue = params?.[1] || '';
          capturedIv = params?.[2] || '';

          return {
            rows: [
              {
                id: '123e4567-e89b-12d3-a456-426614174000',
                key: 'test_password',
                encrypted_value: capturedEncryptedValue,
                iv: capturedIv,
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
            rowCount: 1,
            command: 'INSERT',
            oid: 0,
            fields: [],
          };
        }

        if (sql.includes('SELECT encrypted_value')) {
          // Return the captured encrypted values
          return {
            rows: [
              {
                encrypted_value: capturedEncryptedValue,
                iv: capturedIv,
              },
            ],
            rowCount: 1,
            command: 'SELECT',
            oid: 0,
            fields: [],
          };
        }

        return { rows: [], rowCount: 0, command: '', oid: 0, fields: [] };
      });

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
      vi.mocked(databaseService.query).mockImplementation(async (sql: string, params?: any[]) => {
        if (sql.includes('INSERT INTO vault')) {
          const encryptedValue = params?.[1] || '';
          capturedValues.push(encryptedValue);

          return {
            rows: [
              {
                id: '123e4567-e89b-12d3-a456-426614174000',
                key: `test_key_${capturedValues.length}`,
                encrypted_value: encryptedValue,
                iv: params?.[2] || '',
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
            rowCount: 1,
            command: 'INSERT',
            oid: 0,
            fields: [],
          };
        }

        return { rows: [], rowCount: 0, command: '', oid: 0, fields: [] };
      });

      // Encrypt the same value twice
      await vaultService.set({ key: 'test_key_1', value: testValue });
      await vaultService.set({ key: 'test_key_2', value: testValue });

      // Encrypted values should be different due to random IV
      expect(capturedValues).toHaveLength(2);
      expect(capturedValues[0]).not.toBe(capturedValues[1]);
    });
  });
});
