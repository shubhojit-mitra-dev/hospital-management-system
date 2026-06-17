import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authRateLimiter } from '../middlewares/rate-limit.middleware.js';

const router = Router();

router.post('/register', authRateLimiter, AuthController.register);
router.post('/verify-email', authRateLimiter, AuthController.verifyEmail);
router.post('/login', authRateLimiter, AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.post('/forgot-password', authRateLimiter, AuthController.forgotPassword);
router.post('/reset-password', authRateLimiter, AuthController.resetPassword);

router.get('/me', authenticate, AuthController.me);
router.post('/me/password', authenticate, AuthController.changePassword);

export default router;
