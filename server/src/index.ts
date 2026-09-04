import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import app from './app';
import { initializeSocket } from './sockets';
import { logger } from './utils/logger';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { checkDueSoonTasks, checkOverdueTasks } from './jobs/task-reminders';

const httpServer = createServer(app);

// Initialize Socket.IO
const io = initializeSocket(httpServer);

const HOST = '0.0.0.0';

httpServer.listen(env.PORT, HOST, () => {
  logger.info(`DevSync server running on http://${HOST}:${env.PORT} [${env.NODE_ENV}]`);
  logger.info(`Health check active at http://${HOST}:${env.PORT}/health`);

  // Run initial task reminders check and schedule recurring checks every 15 minutes
  const runReminders = async () => {
    try {
      await checkDueSoonTasks();
      await checkOverdueTasks();
    } catch (err) {
      logger.error('Error running task reminder jobs:', err);
    }
  };
  runReminders();
  const reminderInterval = setInterval(runReminders, 15 * 60 * 1000);
  reminderInterval.unref();
});

// ─── Graceful Shutdown ───────────────────────────────────────
let isShuttingDown = false;

async function handleGracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // 1. Stop accepting new HTTP requests
  await new Promise<void>((resolve) => {
    httpServer.close((err) => {
      if (err) logger.error('Error closing HTTP server:', err);
      else logger.info('HTTP server closed.');
      resolve();
    });
  });

  // 2. Disconnect Socket.IO clients
  if (io) {
    await new Promise<void>((resolve) => {
      io.close(() => {
        logger.info('Socket.IO connections terminated.');
        resolve();
      });
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
