import crypto from 'crypto';
import path from 'path';

import type { Request } from 'express';
import multer from 'multer';

import { config } from '../../config/index.js';

import { logger } from '@/services/logger';

// Configure disk storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.upload.directory);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
    cb(null, `${sanitizedBaseName}-${uniqueSuffix}${ext}`);
  },
});

// File filter for validation
const fileFilter = (
  _req: Request,
  file: Express.Multer.File, // eslint-disable-line no-undef
  cb: multer.FileFilterCallback
) => {
  // Check if mime type is allowed
  if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    logger.warn(`Rejected file upload with invalid mimetype: ${file.mimetype}`);
    cb(new Error(`Invalid file type. Allowed types: ${config.upload.allowedMimeTypes.join(', ')}`));
  }
};

// Create multer instance with configuration
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
});

// Middleware for single file upload
export const uploadSingle = (fieldName: string) => upload.single(fieldName);

// Middleware for multiple files upload
export const uploadMultiple = (fieldName: string, maxCount: number = 10) =>
  upload.array(fieldName, maxCount);

// Middleware for multiple fields
export const uploadFields = (fields: { name: string; maxCount: number }[]) => upload.fields(fields);
