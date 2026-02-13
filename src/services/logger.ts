import winston from 'winston';

import { config } from '../../config/index.js';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(meta).length > 0) {
    msg += ` ${JSON.stringify(meta)}`;
  }

  if (stack) {
    msg += `\n${stack}`;
  }

  return msg;
});

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: combine(colorize(), logFormat),
    }),
    // File transport
    new winston.transports.File({
      filename: config.logging.file,
      format: combine(timestamp(), logFormat),
    }),
    // Error file transport
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: combine(timestamp(), logFormat),
    }),
  ],
});

// Add stream for Morgan HTTP logging
export const loggerStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};
