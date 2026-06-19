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
      patient: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      doctor: {
        findFirst: vi.fn(),
      },
      doctorSchedule: {
        findFirst: vi.fn(),
      },
      doctorLeave: {
        findFirst: vi.fn(),
      },
      holiday: {
        findMany: vi.fn(),
      },
      appointment: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      appointmentQueue: {
        create: vi.fn(),
        updateMany: vi.fn(),
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

describe('Patient Appointment Operations', () => {
  let patient1Token: string;
  let patient2Token: string;

  beforeEach(() => {
    vi.clearAllMocks();
    patient1Token = JwtService.signAccessToken({ id: 'usr_pat1', role: 'PATIENT', hospitalId: 'hosp_test' });
    patient2Token = JwtService.signAccessToken({ id: 'usr_pat2', role: 'PATIENT', hospitalId: 'hosp_test' });
  });

  it('should book an appointment as a Patient resolving their own profile', async () => {
    const { app } = await import('../server.js');
    const { prisma } = await import('../config/db.js');

    // Setup mocks
    vi.mocked(prisma.patient.findUnique).mockResolvedValue({ id: 'pat_001', userId: 'usr_pat1' } as any);
    vi.mocked(prisma.doctor.findFirst).mockResolvedValue({ id: 'doc_1', slotDurationMins: 30, hospitalId: 'hosp_test' } as any);
    vi.mocked(prisma.doctorSchedule.findFirst).mockResolvedValue({ dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isActive: true } as any);
    vi.mocked(prisma.doctorLeave.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.holiday.findMany).mockResolvedValue([]);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);
    vi.mocked(prisma.appointment.count).mockResolvedValue(0);
    vi.mocked(prisma.appointmentQueue.create).mockResolvedValue({} as any);

    vi.mocked(prisma.appointment.create).mockImplementation((args: any) => {
      expect(args.data.patientId).toBe('pat_001'); // Resolved patientId
      return Promise.resolve({
        id: 'apt_123',
        patientId: 'pat_001',
        doctorId: 'doc_1',
        status: 'REQUESTED',
        tokenNumber: 1,
      } as any);
    });

    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        doctorId: 'doc_1',
        departmentId: 'dept_1',
        appointmentDate: '2026-06-23', // Tuesday
        appointmentTime: '10:00',
        appointmentType: 'NEW',
        chiefComplaint: 'Headache',
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('apt_123');
    expect(res.body.patientId).toBe('pat_001');
  });

  it('should force filtering by patientId when listing appointments as a Patient', async () => {
    const { app } = await import('../server.js');
    const { prisma } = await import('../config/db.js');

    vi.mocked(prisma.patient.findUnique).mockResolvedValue({ id: 'pat_001', userId: 'usr_pat1' } as any);
    vi.mocked(prisma.appointment.findMany).mockImplementation((args: any) => {
      expect(args.where.patientId).toBe('pat_001'); // Restricts query filter to patient's own ID
      return Promise.resolve([
        { id: 'apt_1', patientId: 'pat_001', doctorId: 'doc_1' },
      ] as any);
    });

    const res = await request(app)
      .get('/api/v1/appointments')
      .set('Authorization', `Bearer ${patient1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe('apt_1');
  });

  it('should deny a patient access to another patient\'s appointment details', async () => {
    const { app } = await import('../server.js');
    const { prisma } = await import('../config/db.js');

    vi.mocked(prisma.patient.findUnique).mockResolvedValue({ id: 'pat_002', userId: 'usr_pat2' } as any);
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
      id: 'apt_1',
      patientId: 'pat_001', // Owned by patient 1
      doctorId: 'doc_1',
    } as any);

    const res = await request(app)
      .get('/api/v1/appointments/apt_1')
      .set('Authorization', `Bearer ${patient2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden');
  });

  it('should deny a patient request to cancel another patient\'s appointment', async () => {
    const { app } = await import('../server.js');
    const { prisma } = await import('../config/db.js');

    vi.mocked(prisma.patient.findUnique).mockResolvedValue({ id: 'pat_002', userId: 'usr_pat2' } as any);
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
      id: 'apt_1',
      patientId: 'pat_001', // Owned by patient 1
      doctorId: 'doc_1',
    } as any);

    const res = await request(app)
      .patch('/api/v1/appointments/apt_1/cancel')
      .set('Authorization', `Bearer ${patient2Token}`)
      .send({ reason: 'Not my appointment' });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden');
  });

  it('should deny a patient request to reschedule another patient\'s appointment', async () => {
    const { app } = await import('../server.js');
    const { prisma } = await import('../config/db.js');

    vi.mocked(prisma.patient.findUnique).mockResolvedValue({ id: 'pat_002', userId: 'usr_pat2' } as any);
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
      id: 'apt_1',
      patientId: 'pat_001', // Owned by patient 1
      doctorId: 'doc_1',
    } as any);

    const res = await request(app)
      .patch('/api/v1/appointments/apt_1/reschedule')
      .set('Authorization', `Bearer ${patient2Token}`)
      .send({ newDate: '2026-06-24', newTime: '11:00' });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden');
  });
});
