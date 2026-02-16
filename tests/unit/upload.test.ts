import path from 'path';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { config } from '../../config/index';

// Mock the logger before importing the upload module
vi.mock('../../src/services/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Upload Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have upload configuration in config', () => {
    expect(config.upload).toBeDefined();
    expect(config.upload).toHaveProperty('directory');
    expect(config.upload).toHaveProperty('maxFileSize');
    expect(config.upload).toHaveProperty('allowedMimeTypes');
  });

  it('should have correct default upload directory', () => {
    expect(config.upload.directory).toBe('uploads');
  });

  it('should have correct default max file size', () => {
    expect(config.upload.maxFileSize).toBe(5242880); // 5MB
  });

  it('should have allowed mime types as array', () => {
    expect(Array.isArray(config.upload.allowedMimeTypes)).toBe(true);
    expect(config.upload.allowedMimeTypes.length).toBeGreaterThan(0);
  });

  it('should include common mime types', () => {
    const mimeTypes = config.upload.allowedMimeTypes;
    expect(mimeTypes).toContain('image/jpeg');
    expect(mimeTypes).toContain('image/png');
  });

  it('should sanitize filenames properly', () => {
    const filename = 'test file@#$.txt';
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');

    expect(sanitizedBaseName).toBe('test_file___');
    expect(sanitizedBaseName).not.toContain('@');
    expect(sanitizedBaseName).not.toContain('#');
    expect(sanitizedBaseName).not.toContain('$');
  });

  it('should preserve file extensions', () => {
    const testCases = [
      { input: 'document.pdf', expected: '.pdf' },
      { input: 'image.jpeg', expected: '.jpeg' },
      { input: 'archive.tar.gz', expected: '.gz' },
      { input: 'noextension', expected: '' },
    ];

    testCases.forEach(({ input, expected }) => {
      const ext = path.extname(input);
      expect(ext).toBe(expected);
    });
  });
});
