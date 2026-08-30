import dotenv from 'dotenv';

// Load env before anything else
dotenv.config();

import { createServer } from 'http';
import app from './app';
import { initializeSocket } from './sockets';
import { logger } from './utils/logger';
import { env } from './config/env';

const httpServer = createServer(app);

// Initialize Socket.IO
initializeSocket(httpServer);

httpServer.listen(env.PORT, () => {
  logger.info(`DevSync server running on port ${env.PORT} [${env.NODE_ENV}]`);
  logger.info(`API docs available at http://localhost:${env.PORT}/api/docs`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Rejection:', reason.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error.message);
  process.exit(1);
});

export default httpServer;
