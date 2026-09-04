import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import 'express-async-errors';

import { env } from './config/env';
import { prisma } from './config/prisma';
import { errorHandler } from './middleware/errorHandler';
import { requestCorrelation } from './middleware/requestCorrelation';
import { requestLogger } from './middleware/requestLogger';
import { setupSwagger } from './config/swagger';

// Route imports
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import teamRoutes from './routes/team.routes';
import invitationRoutes from './routes/invitation.routes';
import projectRoutes from './routes/project.routes';
import taskRoutes from './routes/task.routes';
import commentRoutes from './routes/comment.routes';
import messageRoutes from './routes/message.routes';
import notificationRoutes from './routes/notification.routes';
import notificationPreferenceRoutes from './routes/notificationPreference.routes';
import fileRoutes from './routes/file.routes';
import activityRoutes from './routes/activity.routes';
import searchRoutes from './routes/search.routes';
import dashboardRoutes from './routes/dashboard.routes';

const app: Application = express();

// ─── Request Correlation & Tracking ──────────────────────────
app.use(requestCorrelation);

// ─── Security Headers & Middleware ───────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: env.isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
            connectSrc: ["'self'", ...env.ALLOWED_ORIGINS, 'wss:', 'ws:'],
          },
        }
      : false,
    frameguard: { action: 'deny' },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      if (
        env.ALLOWED_ORIGINS.includes(origin) ||
        env.ALLOWED_ORIGINS.includes('*') ||
        !env.isProduction
      ) {
        return callback(null, true);
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
  }),
);

// ─── Rate Limiting ───────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.isProduction ? 30 : 500, // Stricter in production to prevent brute-force attacks
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again after 15 minutes.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// ─── Body Parsing & Compression ──────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// ─── Request Logging ─────────────────────────────────────────
app.use(requestLogger);

// ─── Static Files ────────────────────────────────────────────
// Note: File downloads are guarded via authenticated /api/files/:fileId/download endpoint

// ─── Root Info Endpoint ──────────────────────────────────────
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    name: 'DevSync Backend API',
    status: 'online',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health',
  });
});

// ─── Health Check Endpoint (Render & Monitoring) ─────────────
app.get(['/health', '/api/health'], async (_req: Request, res: Response) => {
  let dbStatus = 'connected';
  try {
    // Quick probe to ensure DB connection is alive
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'disconnected';
  }

  res.status(dbStatus === 'connected' ? 200 : 503).json({
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    service: 'devsync-api',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: dbStatus,
  });
});

// ─── Swagger Docs ────────────────────────────────────────────
setupSwagger(app);

// ─── API Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notification-preferences', notificationPreferenceRoutes);
app.use('/api/notifications/preferences', notificationPreferenceRoutes); // Compatibility
app.use('/api/files', fileRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ─── 404 Handler ─────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl || req.path}`,
    code: 'NOT_FOUND',
  });
});

// ─── Global Error Handler ────────────────────────────────────
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  errorHandler(err, req, res, next);
});

export default app;
