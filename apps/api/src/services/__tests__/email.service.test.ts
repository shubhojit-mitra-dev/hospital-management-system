import { describe, it, expect, vi } from 'vitest';

vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db');
vi.stubEnv('REDIS_URL', 'redis://localhost:6379');
vi.stubEnv('JWT_ACCESS_SECRET', 'access_secret_123');
vi.stubEnv('JWT_REFRESH_SECRET', 'refresh_secret_123');

describe('Email Service', () => {
  it('should successfully send an email (mocked or fallback logs)', async () => {
    const { EmailService } = await import('../email.service.js');
    
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    await expect(EmailService.sendEmail({
      to: 'patient@example.com',
      subject: 'Welcome',
      text: 'Hello, welcome to HMS!'
    })).resolves.not.toThrow();

    consoleSpy.mockRestore();
  });
});
