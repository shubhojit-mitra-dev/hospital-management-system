import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis.js';

export const authRateLimiter = rateLimit({
  store: new RedisStore({
    // @ts-expect-error - ioredis fits client requirements
    sendCommand: (...args: string[]) => redis.call(args[0]!, ...args.slice(1)),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Max 10 attempts
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: 'draft-6',
  legacyHeaders: false,
});
