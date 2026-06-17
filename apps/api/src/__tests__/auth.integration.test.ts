import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

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
        call: vi.fn(),
      };
    }),
  };
});

// Mock Prisma client
vi.mock('../config/db.js', () => {
  return {
    prisma: {
      hospital: {
        findUnique: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      otpCode: {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      refreshToken: {
        create: vi.fn(),
        findFirst: vi.fn(),
        updateMany: vi.fn(),
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

describe('Auth Integration Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register a new patient successfully', async () => {
    const { app } = await import('../server.js');
    const { prisma } = await import('../config/db.js');
    
    vi.mocked(prisma.hospital.findUnique).mockResolvedValue({ id: 'hosp_123', name: 'Hosp' } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'user_123', email: 'johndoe@example.com' } as any);
    vi.mocked(prisma.otpCode.create).mockResolvedValue({ id: 'otp_123' } as any);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({ id: 'log_123' } as any);

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'johndoe@example.com',
        password: 'Password123!',
        phone: '+1234567890',
        hospitalId: 'hosp_123',
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toContain('Registration successful');
  });

  it('should login patient successfully with correct credentials', async () => {
    const { app } = await import('../server.js');
    const { prisma } = await import('../config/db.js');
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user_123',
      email: 'johndoe@example.com',
      passwordHash: hashedPassword,
      isActive: true,
      role: 'PATIENT',
      hospitalId: 'hosp_123',
      isVerified: true,
    } as any);

    vi.mocked(prisma.refreshToken.create).mockResolvedValue({ id: 'tok_123' } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({} as any);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'johndoe@example.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe('johndoe@example.com');
  });

  it('should verify email successfully with correct OTP', async () => {
    const { app } = await import('../server.js');
    const { prisma } = await import('../config/db.js');
    const otpCode = '123456';
    const codeHash = crypto.createHash('sha256').update(otpCode).digest('hex');

    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user_123', email: 'johndoe@example.com' } as any);
    vi.mocked(prisma.otpCode.findFirst).mockResolvedValue({ id: 'otp_123', codeHash } as any);
    vi.mocked(prisma.otpCode.update).mockResolvedValue({} as any);
    vi.mocked(prisma.user.update).mockResolvedValue({} as any);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({
        email: 'johndoe@example.com',
        code: '123456',
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Email verified successfully');
  });

  it('should refresh tokens successfully', async () => {
    const { app } = await import('../server.js');
    const { prisma } = await import('../config/db.js');
    const { JwtService } = await import('../services/jwt.service.js');
    const refreshToken = JwtService.signRefreshToken({ id: 'user_123' });
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    vi.mocked(prisma.refreshToken.findFirst).mockResolvedValue({
      id: 'tok_123',
      tokenHash: refreshTokenHash,
      userId: 'user_123',
      expiresAt: new Date(Date.now() + 100000),
      revokedAt: null,
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user_123',
      email: 'johndoe@example.com',
      isActive: true,
      role: 'PATIENT',
      hospitalId: 'hosp_123',
      isVerified: true,
    } as any);

    vi.mocked(prisma.refreshToken.update).mockResolvedValue({} as any);
    vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as any);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [`refreshToken=${refreshToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });
});
