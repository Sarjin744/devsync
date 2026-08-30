import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import 'express-async-errors';

import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
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

// ─── Security Middleware ─────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(
  cors({
    origin: env.ALLOWED_ORIGINS,
    credentials: true,
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
  },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// ─── Body Parsing ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// ─── Request Logging ─────────────────────────────────────────
app.use(requestLogger);

// ─── Static Files ────────────────────────────────────────────
app.use('/uploads', express.static('uploads'));

// ─── Health Check ────────────────────────────────────────────
app.get(['/api/health', '/health'], (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'DevSync API is running',
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
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// ─── Global Error Handler ────────────────────────────────────
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  errorHandler(err, req, res, next);
});

export default app;
