import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import app from './app';
import { initializeSocket } from './sockets';
import { logger } from './utils/logger';
import { env } from './config/env';
import { prisma } from './config/prisma';

const httpServer = createServer(app);

// Initialize Socket.IO
const io = initializeSocket(httpServer);

const HOST = '0.0.0.0';

httpServer.listen(env.PORT, HOST, () => {
  logger.info(`DevSync server running on http://${HOST}:${env.PORT} [${env.NODE_ENV}]`);
  logger.info(`Health check active at http://${HOST}:${env.PORT}/health`);
});

// ─── Graceful Shutdown ───────────────────────────────────────
let isShuttingDown = false;

async function handleGracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // 1. Stop accepting new HTTP requests
  httpServer.close(() => {
    logger.info('HTTP server closed.');
  });

  // 2. Disconnect Socket.IO clients
  if (io) {
    io.close(() => {
      logger.info('Socket.IO connections terminated.');
    });
  }

  // 3. Disconnect Prisma
  try {
    await prisma.$disconnect();
    logger.info('Prisma database connection closed.');
  } catch (err) {
    logger.error('Error disconnecting Prisma during shutdown:', err);
  }

  // 4. Safe exit
  logger.info('Graceful shutdown completed. Exiting process.');
  process.exit(0);
}

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection:', reason instanceof Error ? reason.message : String(reason));
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error.message, error.stack);
  handleGracefulShutdown('UNCAUGHT_EXCEPTION');
});

export default httpServer;
