import { describe, it, expect, vi } from 'vitest';

vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db');
vi.stubEnv('REDIS_URL', 'redis://localhost:6379');
vi.stubEnv('JWT_ACCESS_SECRET', 'access_secret_123');
vi.stubEnv('JWT_REFRESH_SECRET', 'refresh_secret_123');

describe('JWT Service', () => {
  it('should sign and verify access token correctly', async () => {
    const { JwtService } = await import('../jwt.service.js');
    const payload = { userId: 'user_123', role: 'admin' };
    const token = JwtService.signAccessToken(payload);
    expect(token).toBeDefined();

    const decoded = JwtService.verifyAccessToken(token) as typeof payload;
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.role).toBe(payload.role);
  });

  it('should sign and verify refresh token correctly', async () => {
    const { JwtService } = await import('../jwt.service.js');
    const payload = { userId: 'user_123' };
    const token = JwtService.signRefreshToken(payload);
    expect(token).toBeDefined();

    const decoded = JwtService.verifyRefreshToken(token) as typeof payload;
    expect(decoded.userId).toBe(payload.userId);
  });
});
