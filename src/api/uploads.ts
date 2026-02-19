import fs from 'fs/promises';
import path from 'path';

import express from 'express';
import type { Request, Response } from 'express';

import { config } from '../../config/index.js';

import { HTTP_STATUS } from '@/constants';
import { asyncHandler } from '@/middleware/error';
import { rateLimiters } from '@/middleware/rate-limiter';
import { uploadSingle, uploadMultiple } from '@/middleware/upload';
import { logger } from '@/services/logger';
import { createApiResponse, createErrorResponse } from '@/utils/response';

const router = express.Router();

/**
 * POST /uploads/single
 * Upload a single file
 */
router.post(
  '/single',
  rateLimiters.write,
  uploadSingle('file'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(createErrorResponse('NO_FILE', 'No file uploaded'));
      return;
    }

    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      destination: req.file.destination,
    };

    logger.info(`File uploaded successfully: ${req.file.filename}`);

    res.status(HTTP_STATUS.CREATED).json(
      createApiResponse({
        message: 'File uploaded successfully',
        file: fileInfo,
      })
    );
  })
);

/**
 * POST /uploads/multiple
 * Upload multiple files
 */
router.post(
  '/multiple',
  rateLimiters.write,
  uploadMultiple('files', 10),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(createErrorResponse('NO_FILES', 'No files uploaded'));
      return;
    }

    const filesInfo = req.files.map((file) => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      destination: file.destination,
    }));

    logger.info(`${req.files.length} files uploaded successfully`);

    res.status(HTTP_STATUS.CREATED).json(
      createApiResponse({
        message: 'Files uploaded successfully',
        files: filesInfo,
        count: req.files.length,
      })
    );
  })
);

/**
 * GET /uploads
 * List all uploaded files
 */
router.get(
  '/',
  rateLimiters.read,
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const files = await fs.readdir(config.upload.directory);

      // Filter out .gitkeep and get file stats
      const fileInfoPromises = files
        .filter((file) => file !== '.gitkeep')
        .map(async (file) => {
          const sanitized = path.basename(file);
          const filePath = path.join(config.upload.directory, sanitized);
          const stats = await fs.stat(filePath);

          return {
            filename: file,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
          };
        });

      const filesInfo = await Promise.all(fileInfoPromises);

      res.status(HTTP_STATUS.OK).json(
        createApiResponse({
          files: filesInfo,
          count: filesInfo.length,
        })
      );
    } catch (error) {
      logger.error('Failed to list files:', error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(createErrorResponse('LIST_FILES_ERROR', 'Failed to list files'));
    }
  })
);

/**
 * GET /uploads/:filename
 * Download/retrieve a specific file
 */
router.get(
  '/:filename',
  rateLimiters.read,
  asyncHandler(async (req: Request, res: Response) => {
    const { filename } = req.params as { filename: string };

    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(config.upload.directory, sanitizedFilename);

    try {
      // Check if file exists
      await fs.access(filePath);

      // Send file using absolute path
      res.sendFile(path.resolve(filePath));
    } catch (error: unknown) {
      logger.warn(`File not found: ${sanitizedFilename}`);
      res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(createErrorResponse('FILE_NOT_FOUND', 'File not found'));
    }
  })
);

/**
 * DELETE /uploads/:filename
 * Delete a specific file
 */
router.delete(
  '/:filename',
  rateLimiters.write,
  asyncHandler(async (req: Request, res: Response) => {
    const { filename } = req.params as { filename: string };

    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(config.upload.directory, sanitizedFilename);

    try {
      // Check if file exists and get stats
      await fs.access(filePath);

      // Delete file
      await fs.unlink(filePath);

      logger.info(`File deleted successfully: ${sanitizedFilename}`);

      res.status(HTTP_STATUS.OK).json(
        createApiResponse({
          message: 'File deleted successfully',
          filename: sanitizedFilename,
        })
      );
    } catch (error: unknown) {
      logger.warn(`Failed to delete file ${sanitizedFilename}:`, error);
      res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(createErrorResponse('FILE_NOT_FOUND', 'File not found or could not be deleted'));
    }
  })
);

export { router as uploadsRouter };
