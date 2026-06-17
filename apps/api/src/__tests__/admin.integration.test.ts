import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db');
vi.stubEnv('REDIS_URL', 'redis://localhost:6379');
vi.stubEnv('JWT_ACCESS_SECRET', 'access_secret_123');
vi.stubEnv('JWT_REFRESH_SECRET', 'refresh_secret_123');

// Mock ioredis
vi.mock('ioredis', () => {
  return {
    Redis: vi.fn().mockImplementation(() => {
      return {
        on: vi.fn(),
        call: vi.fn().mockImplementation((cmd, ...args) => {
          if (cmd === 'script' && args[0] === 'load') {
            return 'mock-sha1-hash';
          }
          if (cmd === 'evalsha') {
            return [1, Date.now() + 15 * 60 * 1000];
          }
          return null;
        }),
      };
    }),
  };
});

// Mock rate-limit-redis
vi.mock('rate-limit-redis', () => {
  return {
    default: vi.fn().mockImplementation(() => {
      return {
        increment: vi.fn().mockResolvedValue({ totalHits: 1, resetTime: new Date(Date.now() + 1000) }),
        decrement: vi.fn(),
        resetKey: vi.fn(),
      };
    }),
  };
});

// Mock Prisma client
vi.mock('../config/db.js', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    },
  };
});

// Mock services
vi.mock('../services/email.service.js', () => ({
  EmailService: {
    sendEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('Admin CRUD Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully create staff user when requested by Hospital Admin', async () => {
    const { app } = await import('../server.js');
    const { prisma } = await import('../config/db.js');
    const { JwtService } = await import('../services/jwt.service.js');
    const token = JwtService.signAccessToken({ id: 'admin_123', role: 'HOSPITAL_ADMIN', hospitalId: 'hosp_123' });

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'usr_new', email: 'doctor@example.com' } as any);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

    const res = await request(app)
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Doctor',
        lastName: 'House',
        email: 'doctor@example.com',
        role: 'DOCTOR',
        phone: '+111222333',
        hospitalId: 'hosp_123',
      });

    // Since routes don't exist yet, it should return 404
    expect(res.status).toBe(201);
    expect(res.body.message).toContain('Staff user created successfully');
  });
});
