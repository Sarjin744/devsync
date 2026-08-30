import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Global namespace augmentation to prevent multiple PrismaClient instances in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Checks PostgreSQL database connectivity.
 * Safely reports connectivity status without throwing or crashing the server.
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection verified successfully');
    return true;
  } catch (error) {
    logger.warn('Database connection check failed (will retry on demand):', (error as Error).message);
    return false;
  }
}

/**
 * Gracefully disconnects Prisma client on process termination.
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected cleanly');
  } catch (error) {
    logger.error('Error during database disconnection:', (error as Error).message);
  }
}

export default prisma;
