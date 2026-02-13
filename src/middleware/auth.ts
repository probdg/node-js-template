import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { createErrorResponse } from '@/utils/response';
import { HTTP_STATUS } from '@/constants';
import type { TokenPayload, AuthenticatedRequest } from '@/types';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(createErrorResponse('UNAUTHORIZED', 'Access token is required'));
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
    (req as AuthRequest).user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json(createErrorResponse('TOKEN_EXPIRED', 'Access token has expired'));
      return;
    }

    res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(createErrorResponse('INVALID_TOKEN', 'Invalid access token'));
  }
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
}
