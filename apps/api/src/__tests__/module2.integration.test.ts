import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { JwtService } from '../services/jwt.service.js';

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
      hospital: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      department: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      holiday: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn((cb) => cb({
        hospital: {
          create: vi.fn().mockResolvedValue({ id: 'hosp_test', name: 'Mock Hospital' }),
        },
        department: {
          create: vi.fn(),
        },
        user: {
          create: vi.fn().mockResolvedValue({ id: 'usr_admin', email: 'admin@hosp.com', role: 'HOSPITAL_ADMIN' }),
        },
      })),
    },
  };
});

// Mock services
vi.mock('../services/email.service.js', () => ({
  EmailService: {
    sendEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('Module 2 Endpoints', () => {
  let superAdminToken: string;
  let hospAdminToken: string;
  let patientToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    superAdminToken = JwtService.signAccessToken({ id: 'usr_super', role: 'SUPER_ADMIN', hospitalId: null });
    hospAdminToken = JwtService.signAccessToken({ id: 'usr_hosp', role: 'HOSPITAL_ADMIN', hospitalId: 'hosp_test' });
    patientToken = JwtService.signAccessToken({ id: 'usr_pat', role: 'PATIENT', hospitalId: 'hosp_test' });
  });

  describe('Hospital CRUD', () => {
    it('should create hospital with default departments and admin (SUPER_ADMIN access)', async () => {
      const { app } = await import('../server.js');
      const { prisma } = await import('../config/db.js');

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/hospitals')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'New Hospital',
          registrationNo: 'REG999',
          address: '456 Lane',
          city: 'London',
          state: 'Greater London',
          country: 'UK',
          adminEmail: 'admin@hosp.com',
          adminPassword: 'Password123!',
          adminFirstName: 'Hosp',
          adminLastName: 'Admin',
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('Hospital created successfully');
      expect(res.body.hospital.id).toBe('hosp_test');
    });

    it('should deny hospital creation for non-SUPER_ADMIN', async () => {
      const { app } = await import('../server.js');
      const res = await request(app)
        .post('/api/v1/hospitals')
        .set('Authorization', `Bearer ${hospAdminToken}`)
        .send({ name: 'Fail Hosp' });

      expect(res.status).toBe(403);
    });

    it('should list hospitals for SUPER_ADMIN', async () => {
      const { app } = await import('../server.js');
      const { prisma } = await import('../config/db.js');

      vi.mocked(prisma.hospital.findMany).mockResolvedValue([{ id: 'h1', name: 'H1' }] as any);

      const res = await request(app)
        .get('/api/v1/hospitals')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('Department CRUD', () => {
    it('should create department for hospital admin', async () => {
      const { app } = await import('../server.js');
      const { prisma } = await import('../config/db.js');

      vi.mocked(prisma.hospital.findFirst).mockResolvedValue({ id: 'hosp_test', name: 'H1' } as any);
      vi.mocked(prisma.department.create).mockResolvedValue({ id: 'd1', name: 'ICU' } as any);

      const res = await request(app)
        .post('/api/v1/hospitals/hosp_test/departments')
        .set('Authorization', `Bearer ${hospAdminToken}`)
        .send({ name: 'ICU', description: 'Intensive Care Unit' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('ICU');
    });

    it('should prevent department creation if hospital ID mismatches admin hospitalId', async () => {
      const { app } = await import('../server.js');
      const res = await request(app)
        .post('/api/v1/hospitals/other_hosp/departments')
        .set('Authorization', `Bearer ${hospAdminToken}`)
        .send({ name: 'ICU' });

      expect(res.status).toBe(403);
    });
  });

  describe('Holiday CRUD', () => {
    it('should create holiday for hospital admin', async () => {
      const { app } = await import('../server.js');
      const { prisma } = await import('../config/db.js');

      vi.mocked(prisma.hospital.findFirst).mockResolvedValue({ id: 'hosp_test', name: 'H1' } as any);
      vi.mocked(prisma.holiday.create).mockResolvedValue({ id: 'ho1', name: 'Christmas', date: new Date('2026-12-25') } as any);

      const res = await request(app)
        .post('/api/v1/hospitals/hosp_test/holidays')
        .set('Authorization', `Bearer ${hospAdminToken}`)
        .send({ name: 'Christmas', date: '2026-12-25' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Christmas');
    });
  });
});
