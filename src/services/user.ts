import bcrypt from 'bcrypt';

import { databaseService } from './database.js';
import { logger } from './logger.js';

import type { CreateUserDto, UpdateUserDto, User } from '@/types';

interface UserRow {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  role: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

class UserService {
  /**
   * Map database row to User object
   */
  private mapRowToUser(row: UserRow): User {
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      role: row.role as User['role'],
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserDto): Promise<User> {
    try {
      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 10);

      const query = `
        INSERT INTO users (email, username, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, username, role, is_active, created_at, updated_at
      `;

      const result = await databaseService.query<UserRow>(query, [
        userData.email,
        userData.username,
        passwordHash,
        userData.role || 'user',
      ]);

      if (!result.rows[0]) {
        throw new Error('Failed to create user');
      }

      logger.info('User created successfully', { userId: result.rows[0].id });
      return this.mapRowToUser(result.rows[0]);
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
      const query = `
        SELECT id, email, username, role, is_active, created_at, updated_at
        FROM users
        WHERE id = $1
      `;

      const result = await databaseService.query<UserRow>(query, [id]);
      return result.rows[0] ? this.mapRowToUser(result.rows[0]) : null;
    } catch (error) {
      logger.error('Error fetching user by ID:', error);
      throw error;
    }
  }

  /**
   * Get all users with pagination
   */
  async getAllUsers(page = 1, limit = 10): Promise<{ users: User[]; total: number }> {
    try {
      const offset = (page - 1) * limit;

      // Get total count
      const countQuery = 'SELECT COUNT(*) as count FROM users';
      const countResult = await databaseService.query<{ count: string }>(countQuery);
      const total = parseInt(countResult.rows[0]?.count || '0', 10);

      // Get users with pagination
      const query = `
        SELECT id, email, username, role, is_active, created_at, updated_at
        FROM users
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const result = await databaseService.query<UserRow>(query, [limit, offset]);
      const users = result.rows.map((row) => this.mapRowToUser(row));

      return { users, total };
    } catch (error) {
      logger.error('Error fetching users:', error);
      throw error;
    }
  }

  /**
   * Update user by ID
   */
  async updateUser(id: string, userData: UpdateUserDto): Promise<User | null> {
    try {
      const updates: string[] = [];
      const values: (string | boolean)[] = [];
      let paramIndex = 1;

      if (userData.email !== undefined) {
        updates.push(`email = $${paramIndex++}`);
        values.push(userData.email);
      }

      if (userData.username !== undefined) {
        updates.push(`username = $${paramIndex++}`);
        values.push(userData.username);
      }

      if (userData.role !== undefined) {
        updates.push(`role = $${paramIndex++}`);
        values.push(userData.role);
      }

      if (userData.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(userData.isActive);
      }

      if (updates.length === 0) {
        // No updates to make, return current user
        return this.getUserById(id);
      }

      values.push(id);

      const query = `
        UPDATE users
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, email, username, role, is_active, created_at, updated_at
      `;

      const result = await databaseService.query<UserRow>(query, values);

      if (!result.rows[0]) {
        return null;
      }

      logger.info('User updated successfully', { userId: id });
      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete user by ID
   */
  async deleteUser(id: string): Promise<boolean> {
    try {
      const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
      const result = await databaseService.query(query, [id]);

      if (result.rowCount === 0) {
        return false;
      }

      logger.info('User deleted successfully', { userId: id });
      return true;
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Check if user exists by email
   */
  async userExistsByEmail(email: string): Promise<boolean> {
    try {
      const query = 'SELECT id FROM users WHERE email = $1';
      const result = await databaseService.query(query, [email]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error('Error checking user existence by email:', error);
      throw error;
    }
  }

  /**
   * Check if user exists by username
   */
  async userExistsByUsername(username: string): Promise<boolean> {
    try {
      const query = 'SELECT id FROM users WHERE username = $1';
      const result = await databaseService.query(query, [username]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error('Error checking user existence by username:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
