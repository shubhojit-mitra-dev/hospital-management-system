import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Env Validation', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should throw an error if required env variables are missing', async () => {
    vi.stubEnv('DATABASE_URL', '');
    await expect(import('../env.js')).rejects.toThrow();
  });

  it('should load environment variables successfully when valid', async () => {
    vi.stubEnv('PORT', '4000');
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db');
    vi.stubEnv('REDIS_URL', 'redis://localhost:6379');
    vi.stubEnv('JWT_ACCESS_SECRET', 'access_secret_123');
    vi.stubEnv('JWT_REFRESH_SECRET', 'refresh_secret_123');
    vi.stubEnv('JWT_ACCESS_EXPIRES_IN', '15m');
    vi.stubEnv('JWT_REFRESH_EXPIRES_IN', '7d');

    const { env } = await import('../env.js');
    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('test');
    expect(env.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/db');
  });
});
