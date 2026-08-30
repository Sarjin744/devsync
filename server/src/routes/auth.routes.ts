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
import { authenticate } from '../middleware/authenticate';

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     security: []
 */
router.post('/register', validate({ body: registerSchema }), register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     security: []
 */
router.post('/login', validate({ body: loginSchema }), login);

router.post('/logout', authenticate, logout);
router.post('/refresh', validate({ body: refreshTokenSchema }), refreshToken);
router.get('/me', authenticate, getCurrentUser);
router.put('/change-password', authenticate, changePassword);

export default router;
