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

// Mock Prisma client for clinical workflows
vi.mock('../config/db.js', () => {
  return {
    prisma: {
      patient: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
      },
      patientMedicalHistory: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        create: vi.fn(),
      },
      patientVitals: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      doctor: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      doctorSchedule: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      doctorLeave: {
        findMany: vi.fn(),
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
      consultation: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      prescription: {
        create: vi.fn(),
      },
      eMRRecord: {
        create: vi.fn(),
        findMany: vi.fn(),
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

describe('Clinical Modules Endpoints (Modules 3-6)', () => {
  let doctorToken: string;
  let receptionistToken: string;
  let nurseToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    doctorToken = JwtService.signAccessToken({ id: 'usr_doc', role: 'DOCTOR', hospitalId: 'hosp_test' });
    receptionistToken = JwtService.signAccessToken({ id: 'usr_recep', role: 'RECEPTIONIST', hospitalId: 'hosp_test' });
    nurseToken = JwtService.signAccessToken({ id: 'usr_nurse', role: 'NURSE', hospitalId: 'hosp_test' });
  });

  describe('Module 3: Patient Management', () => {
    it('should register a patient profile (Receptionist Access)', async () => {
      const { app } = await import('../server.js');
      const { prisma } = await import('../config/db.js');

      vi.mocked(prisma.patient.count).mockResolvedValue(5);
      vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.patient.create).mockResolvedValue({
        id: 'pat_123',
        patientNumber: 'PAT-00000006',
        firstName: 'Rohan',
        lastName: 'Verma',
        phone: '9876543210',
      } as any);
      vi.mocked(prisma.patientMedicalHistory.create).mockResolvedValue({} as any);

      const res = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          firstName: 'Rohan',
          lastName: 'Verma',
          dateOfBirth: '1995-05-15',
          gender: 'MALE',
          phone: '9876543210',
        });

      expect(res.status).toBe(201);
      expect(res.body.patientNumber).toBe('PAT-00000006');
      expect(res.body.firstName).toBe('Rohan');
    });

    it('should record patient vitals and calculate BMI (Nurse Access)', async () => {
      const { app } = await import('../server.js');
      const { prisma } = await import('../config/db.js');

      vi.mocked(prisma.patient.findFirst).mockResolvedValue({ id: 'pat_123', hospitalId: 'hosp_test' } as any);
      vi.mocked(prisma.patientVitals.create).mockResolvedValue({
        id: 'vit_1',
        patientId: 'pat_123',
        weightKg: 70,
        heightCm: 175,
        bmi: 22.86,
      } as any);

      const res = await request(app)
        .post('/api/v1/patients/pat_123/vitals')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          weightKg: 70,
          heightCm: 175,
          bloodPressureSystolic: 120,
          bloodPressureDiastolic: 80,
          pulseBpm: 72,
          temperatureC: 36.8,
          spo2Percent: 98,
          respiratoryRate: 16,
        });

      expect(res.status).toBe(201);
      expect(res.body.bmi).toBe(22.86);
    });
  });

  describe('Module 5: Appointment Management', () => {
    it('should book an appointment and generate queue token (Receptionist Access)', async () => {
      const { app } = await import('../server.js');
      const { prisma } = await import('../config/db.js');

      // Setup doctor schedule availability mock
      vi.mocked(prisma.doctor.findFirst).mockResolvedValue({
        id: 'doc_1',
        slotDurationMins: 30,
        hospitalId: 'hosp_test',
      } as any);
      vi.mocked(prisma.doctorSchedule.findFirst).mockResolvedValue({
        dayOfWeek: 2,
        startTime: '09:00',
        endTime: '17:00',
        isActive: true,
      } as any);
      vi.mocked(prisma.doctorLeave.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.holiday.findMany).mockResolvedValue([]);
      vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.appointment.count).mockResolvedValue(0);

      vi.mocked(prisma.appointment.create).mockResolvedValue({
        id: 'apt_123',
        patientId: 'pat_123',
        doctorId: 'doc_1',
        status: 'CONFIRMED',
        tokenNumber: 1,
      } as any);
      vi.mocked(prisma.appointmentQueue.create).mockResolvedValue({} as any);

      // Next Tuesday is dayOfWeek 2 (Tuesday)
      const res = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          patientId: 'pat_123',
          doctorId: 'doc_1',
          departmentId: 'dept_1',
          appointmentDate: '2026-06-23', // Tuesday
          appointmentTime: '10:00',
          appointmentType: 'NEW',
          chiefComplaint: 'Chest tightness',
        });

      expect(res.status).toBe(201);
      expect(res.body.tokenNumber).toBe(1);
    });
  });

  describe('Module 6: Consultation Workspace', () => {
    it('should create consultation (Doctor Access)', async () => {
      const { app } = await import('../server.js');
      const { prisma } = await import('../config/db.js');

      vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
        id: 'apt_123',
        patientId: 'pat_123',
        doctorId: 'doc_1',
        hospitalId: 'hosp_test',
      } as any);

      vi.mocked(prisma.consultation.create).mockResolvedValue({
        id: 'con_123',
        appointmentId: 'apt_123',
        diagnosis: 'Hypertension',
        status: 'COMPLETED',
      } as any);

      vi.mocked(prisma.appointment.update).mockResolvedValue({} as any);
      vi.mocked(prisma.appointmentQueue.updateMany).mockResolvedValue({ count: 1 } as any);

      const res = await request(app)
        .post('/api/v1/consultations')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          appointmentId: 'apt_123',
          subjective: 'Headache for 3 days',
          objective: 'BP is high',
          assessment: 'Mild primary hypertension',
          plan: 'Start medicine',
          diagnosis: 'Essential primary hypertension',
          icdCodes: ['I10'],
          severity: 'MILD',
        });

      expect(res.status).toBe(201);
      expect(res.body.diagnosis).toBe('Hypertension');
    });
  });
});
