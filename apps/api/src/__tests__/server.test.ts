import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db');
vi.stubEnv('REDIS_URL', 'redis://localhost:6379');
vi.stubEnv('JWT_ACCESS_SECRET', 'access_secret_123');
vi.stubEnv('JWT_REFRESH_SECRET', 'refresh_secret_123');

describe('Express Server Health Check', () => {
  it('should return 200 OK for /health', async () => {
    const { app } = await import('../server.js');
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', timestamp: expect.any(String) });
  });
});
