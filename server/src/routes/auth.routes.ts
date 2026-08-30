import { Router } from 'express';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/auth.validator';
import {
  register,
  login,
  logout,
  refreshToken,
  getCurrentUser,
  changePassword,
} from '../controllers/auth.controller';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate';

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and session management endpoints
 */

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 */
router.post('/register', validate({ body: registerSchema }), register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate user with credentials
 */
router.post('/login', validate({ body: loginSchema }), login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate and refresh access token
 */
router.post('/refresh', validate({ body: refreshTokenSchema }), refreshToken);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Revoke session and logout
 */
router.post('/logout', optionalAuthenticate, logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get currently authenticated user
 */
router.get('/me', authenticate, getCurrentUser);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     tags: [Auth]
 *     summary: Update password for current user
 */
router.put('/change-password', authenticate, changePassword);

export default router;
