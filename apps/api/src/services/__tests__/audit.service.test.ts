import { describe, it, expect, vi } from 'vitest';

vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db');
vi.stubEnv('REDIS_URL', 'redis://localhost:6379');
vi.stubEnv('JWT_ACCESS_SECRET', 'access_secret_123');
vi.stubEnv('JWT_REFRESH_SECRET', 'refresh_secret_123');

// Mock Prisma client
vi.mock('../../config/db.js', () => {
  return {
    prisma: {
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'log_id_123' })
      }
    }
  };
});

describe('Audit Service', () => {
  it('should create audit log in the database', async () => {
    const { AuditService } = await import('../audit.service.js');
    const { prisma } = await import('../../config/db.js');

    await AuditService.recordLog({
      actorId: 'user_123',
      action: 'USER_LOGIN',
      entityType: 'USER',
      description: 'User logged in successfully',
      ipAddress: '127.0.0.1'
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        id: expect.any(String),
        actorId: 'user_123',
        actorRole: undefined,
        hospitalId: undefined,
        action: 'USER_LOGIN',
        entityType: 'USER',
        entityId: undefined,
        description: 'User logged in successfully',
        ipAddress: '127.0.0.1',
        userAgent: undefined,
        metadata: undefined,
      }
    });
  });
});
