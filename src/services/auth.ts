import jwt, { type SignOptions } from 'jsonwebtoken';

import { config } from '../../config/index.js';
import type { User , UserRole } from '../types/index.js';

import { logger } from './logger.js';
import { redisService } from './redis.js';
import { userService } from './user.js';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

class AuthService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiresIn: string;
  private readonly refreshTokenExpiresIn: string;

  constructor() {
    this.accessTokenSecret = config.jwt.secret;
    this.refreshTokenSecret = config.jwt.refreshSecret;
    this.accessTokenExpiresIn = config.jwt.expiresIn;
    this.refreshTokenExpiresIn = config.jwt.refreshExpiresIn;
  }

  /**
   * Generate access token
   */
  generateAccessToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiresIn,
    } as SignOptions);
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiresIn,
    } as SignOptions);
  }

  /**
   * Generate both access and refresh tokens
   */
  generateTokens(user: User): AuthTokens {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Calculate expiration time in seconds
    const expiresIn = this.parseExpirationTime(this.accessTokenExpiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret) as TokenPayload;
      return decoded;
    } catch (error) {
      logger.warn('Failed to verify access token', { error: (error as Error).message });
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret) as TokenPayload;
      return decoded;
    } catch (error) {
      logger.warn('Failed to verify refresh token', { error: (error as Error).message });
      return null;
    }
  }

  /**
   * Login user with email and password
   */
  async login(email: string, password: string): Promise<{
    user: Omit<User, 'password'>;
    tokens: AuthTokens;
  } | null> {
    try {
      // Find user by email
      const user = await userService.getUserByEmail(email);

      if (!user) {
        logger.warn('Login attempt with non-existent email', { email });
        return null;
      }

      // Check if user is active
      if (!user.isActive) {
        logger.warn('Login attempt for inactive user', { userId: user.id });
        return null;
      }

      // Verify password
      const isPasswordValid = await userService.verifyPassword(user, password);

      if (!isPasswordValid) {
        logger.warn('Login attempt with invalid password', { email });
        return null;
      }

      // Generate tokens
      const tokens = this.generateTokens(user);

      // Store refresh token in Redis for logout functionality
      await this.storeRefreshToken(user.id, tokens.refreshToken);

      // Remove sensitive data from user object
      const { ...userWithoutPassword } = user;

      logger.info('User logged in successfully', { userId: user.id });

      return {
        user: userWithoutPassword,
        tokens,
      };
    } catch (error) {
      logger.error('Error during login:', error);
      return null;
    }
  }

  /**
   * Register new user
   */
  async register(email: string, username: string, password: string, role?: UserRole): Promise<{
    user: User;
    tokens: AuthTokens;
  } | null> {
    try {
      // Check if user already exists
      const existingUserByEmail = await userService.userExistsByEmail(email);
      if (existingUserByEmail) {
        logger.warn('Registration attempt with existing email', { email });
        return null;
      }

      const existingUserByUsername = await userService.userExistsByUsername(username);
      if (existingUserByUsername) {
        logger.warn('Registration attempt with existing username', { username });
        return null;
      }

      // Create new user
      const newUser = await userService.createUser({
        email,
        username,
        password,
        role,
      });

      // Generate tokens
      const tokens = this.generateTokens(newUser);

      // Store refresh token in Redis
      await this.storeRefreshToken(newUser.id, tokens.refreshToken);

      logger.info('New user registered successfully', { userId: newUser.id });

      return {
        user: newUser,
        tokens,
      };
    } catch (error) {
      logger.error('Error during registration:', error);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  } | null> {
    try {
      // Verify refresh token
      const payload = this.verifyRefreshToken(refreshToken);

      if (!payload) {
        logger.warn('Invalid refresh token provided');
        return null;
      }

      // Check if refresh token exists in Redis (not revoked)
      const isValid = await this.validateRefreshToken(payload.userId, refreshToken);

      if (!isValid) {
        logger.warn('Revoked refresh token provided', { userId: payload.userId });
        return null;
      }

      // Get user data
      const user = await userService.getUserById(payload.userId);

      if (!user || !user.isActive) {
        logger.warn('Refresh token for non-existent or inactive user', { userId: payload.userId });
        return null;
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);

      // Remove old refresh token and store new one
      await this.removeRefreshToken(payload.userId, refreshToken);
      await this.storeRefreshToken(user.id, tokens.refreshToken);

      logger.info('Access token refreshed successfully', { userId: user.id });

      return tokens;
    } catch (error) {
      logger.error('Error during token refresh:', error);
      return null;
    }
  }

  /**
   * Logout user (revoke refresh token)
   */
  async logout(userId: string, refreshToken: string): Promise<boolean> {
    try {
      await this.removeRefreshToken(userId, refreshToken);
      logger.info('User logged out successfully', { userId });
      return true;
    } catch (error) {
      logger.error('Error during logout:', error);
      return false;
    }
  }

  /**
   * Logout from all devices (revoke all refresh tokens)
   */
  async logoutAll(userId: string): Promise<boolean> {
    try {
      await this.removeAllRefreshTokens(userId);
      logger.info('User logged out from all devices', { userId });
      return true;
    } catch (error) {
      logger.error('Error during logout all:', error);
      return false;
    }
  }

  /**
   * Store refresh token in Redis
   */
  private async storeRefreshToken(userId: string, token: string): Promise<void> {
    if (!redisService.isEnabled()) {
      return;
    }

    const key = `refresh_token:${userId}:${this.hashToken(token)}`;
    const ttl = this.parseExpirationTime(this.refreshTokenExpiresIn);

    await redisService.set(key, '1', ttl);
  }

  /**
   * Validate refresh token in Redis
   */
  private async validateRefreshToken(userId: string, token: string): Promise<boolean> {
    if (!redisService.isEnabled()) {
      return true; // If Redis is not enabled, allow token
    }

    const key = `refresh_token:${userId}:${this.hashToken(token)}`;
    const exists = await redisService.exists(key);
    return exists;
  }

  /**
   * Remove refresh token from Redis
   */
  private async removeRefreshToken(userId: string, token: string): Promise<void> {
    if (!redisService.isEnabled()) {
      return;
    }

    const key = `refresh_token:${userId}:${this.hashToken(token)}`;
    await redisService.del(key);
  }

  /**
   * Remove all refresh tokens for a user
   */
  private async removeAllRefreshTokens(userId: string): Promise<void> {
    if (!redisService.isEnabled()) {
      return;
    }

    const pattern = `refresh_token:${userId}:*`;
    await redisService.delPattern(pattern);
  }

  /**
   * Hash token for Redis key (simple hash, not for security)
   */
  private hashToken(token: string): string {
    // Use a simple hash to create a shorter key
    return Buffer.from(token).toString('base64').substring(0, 32);
  }

  /**
   * Parse expiration time string to seconds
   * Supports formats like: "1d", "7d", "1h", "30m", "60s"
   */
  private parseExpirationTime(timeStr: string): number {
    const match = timeStr.match(/^(\d+)([dhms])$/);

    if (!match) {
      // Default to seconds if no unit specified
      return parseInt(timeStr, 10);
    }

    const value = parseInt(match[1] || '0', 10);
    const unit = match[2];

    switch (unit) {
      case 'd':
        return value * 24 * 60 * 60; // days to seconds
      case 'h':
        return value * 60 * 60; // hours to seconds
      case 'm':
        return value * 60; // minutes to seconds
      case 's':
        return value; // already in seconds
      default:
        return value;
    }
  }
}

export const authService = new AuthService();
