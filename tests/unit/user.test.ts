import { describe, it, expect, beforeEach, vi } from 'vitest';

import { USER_ROLES } from '../../src/constants';
import { databaseService } from '../../src/services/database';
import { userService } from '../../src/services/user';
import type { CreateUserDto, UpdateUserDto } from '../../src/types';

// Mock the database service
vi.mock('../../src/services/database', () => ({
  databaseService: {
    query: vi.fn(),
  },
}));

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
  },
}));

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData: CreateUserDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123',
        role: USER_ROLES.USER,
      };

      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: userData.email,
        username: userData.username,
        role: userData.role,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(databaseService.query).mockResolvedValue({
        rows: [mockUser],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await userService.createUser(userData);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        role: mockUser.role,
        isActive: mockUser.is_active,
        createdAt: mockUser.created_at,
        updatedAt: mockUser.updated_at,
      });
      expect(databaseService.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        username: 'testuser',
        role: USER_ROLES.USER,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(databaseService.query).mockResolvedValue({
        rows: [mockUser],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await userService.getUserById(mockUser.id);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        role: mockUser.role,
        isActive: mockUser.is_active,
        createdAt: mockUser.created_at,
        updatedAt: mockUser.updated_at,
      });
      expect(databaseService.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [
        mockUser.id,
      ]);
    });

    it('should return null when user not found', async () => {
      vi.mocked(databaseService.query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await userService.getUserById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('getAllUsers', () => {
    it('should return paginated users', async () => {
      const mockUsers = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          email: 'user1@example.com',
          username: 'user1',
          role: USER_ROLES.USER,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          email: 'user2@example.com',
          username: 'user2',
          role: USER_ROLES.USER,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      // Mock count query
      vi.mocked(databaseService.query)
        .mockResolvedValueOnce({
          rows: [{ count: '25' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        })
        // Mock users query
        .mockResolvedValueOnce({
          rows: mockUsers,
          rowCount: 2,
          command: 'SELECT',
          oid: 0,
          fields: [],
        });

      const result = await userService.getAllUsers(1, 10);

      expect(result.total).toBe(25);
      expect(result.users).toHaveLength(2);
      expect(result.users?.[0]?.email).toBe('user1@example.com');
      expect(databaseService.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData: UpdateUserDto = {
        email: 'newemail@example.com',
        username: 'newusername',
      };

      const mockUpdatedUser = {
        id: userId,
        email: updateData.email!,
        username: updateData.username!,
        role: USER_ROLES.USER,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(databaseService.query).mockResolvedValue({
        rows: [mockUpdatedUser],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      const result = await userService.updateUser(userId, updateData);

      expect(result).toBeDefined();
      expect(result?.email).toBe(updateData.email);
      expect(result?.username).toBe(updateData.username);
      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.any(Array)
      );
    });

    it('should return null when user not found', async () => {
      vi.mocked(databaseService.query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      const result = await userService.updateUser('non-existent-id', { email: 'test@example.com' });

      expect(result).toBeNull();
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      vi.mocked(databaseService.query).mockResolvedValue({
        rows: [{ id: 'deleted-id' }],
        rowCount: 1,
        command: 'DELETE',
        oid: 0,
        fields: [],
      });

      const result = await userService.deleteUser('deleted-id');

      expect(result).toBe(true);
      expect(databaseService.query).toHaveBeenCalledWith(expect.stringContaining('DELETE'), [
        'deleted-id',
      ]);
    });

    it('should return false when user not found', async () => {
      vi.mocked(databaseService.query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'DELETE',
        oid: 0,
        fields: [],
      });

      const result = await userService.deleteUser('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('userExistsByEmail', () => {
    it('should return true when user exists', async () => {
      vi.mocked(databaseService.query).mockResolvedValue({
        rows: [{ id: 'some-id' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await userService.userExistsByEmail('test@example.com');

      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      vi.mocked(databaseService.query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await userService.userExistsByEmail('nonexistent@example.com');

      expect(result).toBe(false);
    });
  });

  describe('userExistsByUsername', () => {
    it('should return true when user exists', async () => {
      vi.mocked(databaseService.query).mockResolvedValue({
        rows: [{ id: 'some-id' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await userService.userExistsByUsername('testuser');

      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      vi.mocked(databaseService.query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await userService.userExistsByUsername('nonexistentuser');

      expect(result).toBe(false);
    });
  });
});
