import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';

const isDev = env.NODE_ENV === 'development';

export const authRateLimiter = rateLimit({
  store: new RedisStore({
    // @ts-expect-error - ioredis fits client requirements
    sendCommand: (...args: string[]) => redis.call(args[0]!, ...args.slice(1)),
  }),
  windowMs: isDev ? 60 * 1000 : 15 * 60 * 1000, // 1 min in dev, 15 min in prod
  limit: isDev ? 100 : 10,                        // 100 attempts in dev, 10 in prod
  message: { error: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: 'draft-6',
  legacyHeaders: false,
  skip: () => isDev && false, // set to `true` here to fully disable in dev if needed
});
