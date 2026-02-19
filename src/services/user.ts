import bcrypt from 'bcrypt';

import { databaseService } from './database.js';
import { logger } from './logger.js';

import type { CreateUserDto, UpdateUserDto, User } from '@/types';

const prisma = () => databaseService.getClient();

class UserService {
  /**
   * Map Prisma User to User object
   */
  private mapPrismaUserToUser(prismaUser: {
    id: string;
    email: string;
    username: string;
    role: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }): User {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      username: prismaUser.username,
      role: prismaUser.role as User['role'],
      isActive: prismaUser.is_active,
      createdAt: prismaUser.created_at,
      updatedAt: prismaUser.updated_at,
    };
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserDto): Promise<User> {
    try {
      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 10);

      const user = await prisma().user.create({
        data: {
          email: userData.email,
          username: userData.username,
          password_hash: passwordHash,
          role: userData.role || 'user',
        },
      });

      logger.info('User created successfully', { userId: user.id });
      return this.mapPrismaUserToUser(user);
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    try {
      const user = await prisma().user.findUnique({
        where: { id },
      });

      return user ? this.mapPrismaUserToUser(user) : null;
    } catch (error) {
      logger.error('Error fetching user by ID:', error);
      throw error;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await prisma().user.findUnique({
        where: { email },
      });

      return user ? this.mapPrismaUserToUser(user) : null;
    } catch (error) {
      logger.error('Error fetching user by email:', error);
      throw error;
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const user = await prisma().user.findUnique({
        where: { username },
      });

      return user ? this.mapPrismaUserToUser(user) : null;
    } catch (error) {
      logger.error('Error fetching user by username:', error);
      throw error;
    }
  }

  /**
   * Get all users with pagination
   */
  async getAllUsers(page: number, limit: number): Promise<{ users: User[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        prisma().user.findMany({
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
        }),
        prisma().user.count(),
      ]);

      return {
        users: users.map((user) => this.mapPrismaUserToUser(user)),
        total,
      };
    } catch (error) {
      logger.error('Error fetching users:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(id: string, updateData: UpdateUserDto): Promise<User | null> {
    try {
      const user = await prisma().user.update({
        where: { id },
        data: {
          ...(updateData.email && { email: updateData.email }),
          ...(updateData.username && { username: updateData.username }),
          ...(updateData.role && { role: updateData.role }),
          ...(updateData.isActive !== undefined && { is_active: updateData.isActive }),
        },
      });

      return this.mapPrismaUserToUser(user);
    } catch (error) {
      logger.error('Error updating user:', error);
      return null;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<boolean> {
    try {
      await prisma().user.delete({
        where: { id },
      });

      logger.info('User deleted successfully', { userId: id });
      return true;
    } catch (error) {
      logger.error('Error deleting user:', error);
      return false;
    }
  }

  /**
   * Check if user exists by email
   */
  async userExistsByEmail(email: string): Promise<boolean> {
    try {
      const user = await prisma().user.findUnique({
        where: { email },
        select: { id: true },
      });

      return !!user;
    } catch (error) {
      logger.error('Error checking user existence by email:', error);
      return false;
    }
  }

  /**
   * Check if user exists by username
   */
  async userExistsByUsername(username: string): Promise<boolean> {
    try {
      const user = await prisma().user.findUnique({
        where: { username },
        select: { id: true },
      });

      return !!user;
    } catch (error) {
      logger.error('Error checking user existence by username:', error);
      return false;
    }
  }

  /**
   * Verify user password
   */
  async verifyPassword(user: User, password: string): Promise<boolean> {
    try {
      const userWithPassword = await prisma().user.findUnique({
        where: { id: user.id },
        select: { password_hash: true },
      });

      if (!userWithPassword) {
        return false;
      }

      return bcrypt.compare(password, userWithPassword.password_hash);
    } catch (error) {
      logger.error('Error verifying password:', error);
      return false;
    }
  }
}

export const userService = new UserService();
