import { describe, it, expect, beforeEach, vi } from 'vitest';

import { USER_ROLES } from '../../src/constants';
import { databaseService } from '../../src/services/database';
import { userService } from '../../src/services/user';
import type { CreateUserDto, UpdateUserDto } from '../../src/types';

// Mock the database service
vi.mock('../../src/services/database', () => ({
  databaseService: {
    getClient: vi.fn(),
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

      const mockPrismaClient = {
        user: {
          create: vi.fn().mockResolvedValue(mockUser),
        },
      };

      vi.mocked(databaseService.getClient).mockReturnValue(mockPrismaClient as never);

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
      expect(mockPrismaClient.user.create).toHaveBeenCalledTimes(1);
      expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
        data: {
          email: userData.email,
          username: userData.username,
          password_hash: 'hashed_password',
          role: userData.role,
        },
      });
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

      const mockPrismaClient = {
        user: {
          findUnique: vi.fn().mockResolvedValue(mockUser),
        },
      };

      vi.mocked(databaseService.getClient).mockReturnValue(mockPrismaClient as never);

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
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
    });

    it('should return null when user not found', async () => {
      const mockPrismaClient = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };

      vi.mocked(databaseService.getClient).mockReturnValue(mockPrismaClient as never);

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

      const mockPrismaClient = {
        user: {
          findMany: vi.fn().mockResolvedValue(mockUsers),
          count: vi.fn().mockResolvedValue(25),
        },
      };

      vi.mocked(databaseService.getClient).mockReturnValue(mockPrismaClient as never);

      const result = await userService.getAllUsers(1, 10);

      expect(result.total).toBe(25);
      expect(result.users).toHaveLength(2);
      expect(result.users?.[0]?.email).toBe('user1@example.com');
      expect(mockPrismaClient.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { created_at: 'desc' },
      });
      expect(mockPrismaClient.user.count).toHaveBeenCalledTimes(1);
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

      const mockPrismaClient = {
        user: {
          update: vi.fn().mockResolvedValue(mockUpdatedUser),
        },
      };

      vi.mocked(databaseService.getClient).mockReturnValue(mockPrismaClient as never);

      const result = await userService.updateUser(userId, updateData);

      expect(result).toBeDefined();
      expect(result?.email).toBe(updateData.email);
      expect(result?.username).toBe(updateData.username);
      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          email: updateData.email,
          username: updateData.username,
        },
      });
    });

    it('should return null when user not found', async () => {
      const mockPrismaClient = {
        user: {
          update: vi.fn().mockRejectedValue(new Error('Record not found')),
        },
      };

      vi.mocked(databaseService.getClient).mockReturnValue(mockPrismaClient as never);

      const result = await userService.updateUser('non-existent-id', { email: 'test@example.com' });

      expect(result).toBeNull();
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const mockPrismaClient = {
        user: {
          delete: vi.fn().mockResolvedValue({ id: 'deleted-id' }),
        },
      };

      vi.mocked(databaseService.getClient).mockReturnValue(mockPrismaClient as never);

      const result = await userService.deleteUser('deleted-id');

      expect(result).toBe(true);
      expect(mockPrismaClient.user.delete).toHaveBeenCalledWith({
        where: { id: 'deleted-id' },
      });
    });

    it('should return false when user not found', async () => {
      const mockPrismaClient = {
        user: {
          delete: vi.fn().mockRejectedValue(new Error('Record not found')),
        },
      };

      vi.mocked(databaseService.getClient).mockReturnValue(mockPrismaClient as never);

      const result = await userService.deleteUser('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('userExistsByEmail', () => {
    it('should return true when user exists', async () => {
      const mockPrismaClient = {
        user: {
          findUnique: vi.fn().mockResolvedValue({ id: 'some-id' }),
        },
      };

      vi.mocked(databaseService.getClient).mockReturnValue(mockPrismaClient as never);

      const result = await userService.userExistsByEmail('test@example.com');

      expect(result).toBe(true);
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: { id: true },
      });
    });

    it('should return false when user does not exist', async () => {
      const mockPrismaClient = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };

      vi.mocked(databaseService.getClient).mockReturnValue(mockPrismaClient as never);

      const result = await userService.userExistsByEmail('nonexistent@example.com');

      expect(result).toBe(false);
    });
  });

  describe('userExistsByUsername', () => {
    it('should return true when user exists', async () => {
      const mockPrismaClient = {
        user: {
          findUnique: vi.fn().mockResolvedValue({ id: 'some-id' }),
        },
      };

      vi.mocked(databaseService.getClient).mockReturnValue(mockPrismaClient as never);

      const result = await userService.userExistsByUsername('testuser');

      expect(result).toBe(true);
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        select: { id: true },
      });
    });

    it('should return false when user does not exist', async () => {
      const mockPrismaClient = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };

      vi.mocked(databaseService.getClient).mockReturnValue(mockPrismaClient as never);

      const result = await userService.userExistsByUsername('nonexistentuser');

      expect(result).toBe(false);
    });
  });
});
