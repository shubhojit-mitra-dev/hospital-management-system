import { Request, Response } from 'express';
import { ulid } from 'ulid';
import { prisma } from '../config/db.js';
import { AuditService } from '../services/audit.service.js';

export class PatientController {
  static async create(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      bloodGroup,
      phone,
      alternatePhone,
      email,
      address,
      city,
      state,
      pincode,
      nationality,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      insuranceProvider,
      insurancePolicyNo,
      insuranceValidTill,
      insuranceCoverage,
      userId,
    } = req.body;

    if (!firstName || !lastName || !dateOfBirth || !gender || !phone) {
      return res.status(400).json({ error: 'Required fields missing: firstName, lastName, dateOfBirth, gender, phone' });
    }

    try {
      const count = await prisma.patient.count({
        where: { hospitalId },
      });
      const patientNumber = `PAT-${String(count + 1).padStart(8, '0')}`;

      const id = `pat_${ulid().toLowerCase()}`;
      const dob = new Date(dateOfBirth);

      const patient = await prisma.patient.create({
        data: {
          id,
          hospitalId,
          userId,
          patientNumber,
          firstName,
          lastName,
          dateOfBirth: dob,
          gender,
          bloodGroup,
          phone,
          alternatePhone,
          email,
          address,
          city,
          state,
          pincode,
          nationality: nationality || 'Indian',
          emergencyContactName,
          emergencyContactPhone,
          emergencyContactRelationship,
          insuranceProvider,
          insurancePolicyNo,
          insuranceValidTill: insuranceValidTill ? new Date(insuranceValidTill) : null,
          insuranceCoverage,
          registeredBy: req.user?.id,
          isActive: true,
        },
      });

      // Initialize medical history
      await prisma.patientMedicalHistory.create({
        data: {
          id: `pmh_${ulid().toLowerCase()}`,
          patientId: id,
          hospitalId,
          allergies: [],
          conditions: [],
          surgeries: [],
          medications: [],
          familyHistory: [],
        },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'CREATE_PATIENT',
        entityType: 'PATIENT',
        entityId: id,
        description: `Registered patient ${firstName} ${lastName} (${patientNumber})`,
        ipAddress: req.ip,
      });

      return res.status(201).json(patient);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async list(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    const search = (req.query.search as string) || '';
    const gender = req.query.gender as string;
    const bloodGroup = req.query.bloodGroup as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    try {
      const whereClause: any = {
        hospitalId,
        deletedAt: null,
      };

      if (search) {
        whereClause.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { patientNumber: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (gender) {
        whereClause.gender = gender;
      }

      if (bloodGroup) {
        whereClause.bloodGroup = bloodGroup;
      }

      const [patients, total] = await Promise.all([
        prisma.patient.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.patient.count({ where: whereClause }),
      ]);

      return res.status(200).json({
        patients,
        meta: { page, limit, total },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getById(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId;
    const id = req.params.id as string;

    try {
      const patient = await prisma.patient.findFirst({
        where: { id, hospitalId, deletedAt: null },
        include: {
          medicalHistory: true,
        },
      });

      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      // Role-based field masking
      if (req.user?.role === 'NURSE') {
        patient.insuranceProvider = 'MASKED';
        patient.insurancePolicyNo = 'MASKED';
        patient.insuranceValidTill = null;
        patient.insuranceCoverage = null;
      }

      return res.status(200).json(patient);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async update(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId;
    const id = req.params.id as string;
    const updateData = { ...req.body };

    try {
      const patient = await prisma.patient.findFirst({
        where: { id, hospitalId, deletedAt: null },
      });

      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      if (updateData.dateOfBirth) {
        updateData.dateOfBirth = new Date(updateData.dateOfBirth);
      }
      if (updateData.insuranceValidTill) {
        updateData.insuranceValidTill = new Date(updateData.insuranceValidTill);
      }

      // Prevent updating sensitive fields
      delete updateData.patientNumber;
      delete updateData.id;
      delete updateData.hospitalId;

      const updated = await prisma.patient.update({
        where: { id },
        data: updateData,
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'UPDATE_PATIENT',
        entityType: 'PATIENT',
        entityId: id,
        description: `Updated patient details for ${patient.firstName} ${patient.lastName}`,
        ipAddress: req.ip,
      });

      return res.status(200).json(updated);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async delete(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId;
    const id = req.params.id as string;

    try {
      const patient = await prisma.patient.findFirst({
        where: { id, hospitalId, deletedAt: null },
      });

      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      await prisma.patient.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          isActive: false,
        },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'DELETE_PATIENT',
        entityType: 'PATIENT',
        entityId: id,
        description: `Soft deleted patient ${patient.firstName} ${patient.lastName}`,
        ipAddress: req.ip,
      });

      return res.status(200).json({ message: 'Patient soft deleted successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getMedicalHistory(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId;
    const id = req.params.id as string;

    try {
      const history = await prisma.patientMedicalHistory.findFirst({
        where: { patientId: id, hospitalId },
      });

      if (!history) {
        return res.status(404).json({ error: 'Medical history not found' });
      }

      return res.status(200).json(history);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateMedicalHistory(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId;
    const id = req.params.id as string;
    const { allergies, conditions, surgeries, medications, smokingStatus, alcoholStatus, exerciseFrequency, familyHistory } = req.body;

    try {
      const history = await prisma.patientMedicalHistory.findFirst({
        where: { patientId: id, hospitalId },
      });

      if (!history) {
        return res.status(404).json({ error: 'Medical history not found' });
      }

      const updated = await prisma.patientMedicalHistory.update({
        where: { id: history.id },
        data: {
          allergies: allergies !== undefined ? allergies : history.allergies,
          conditions: conditions !== undefined ? conditions : history.conditions,
          surgeries: surgeries !== undefined ? surgeries : history.surgeries,
          medications: medications !== undefined ? medications : history.medications,
          smokingStatus: smokingStatus !== undefined ? smokingStatus : history.smokingStatus,
          alcoholStatus: alcoholStatus !== undefined ? alcoholStatus : history.alcoholStatus,
          exerciseFrequency: exerciseFrequency !== undefined ? exerciseFrequency : history.exerciseFrequency,
          familyHistory: familyHistory !== undefined ? familyHistory : history.familyHistory,
          updatedBy: req.user?.id,
        },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'UPDATE_MEDICAL_HISTORY',
        entityType: 'PATIENT',
        entityId: id,
        description: `Updated medical history for patient id ${id}`,
        ipAddress: req.ip,
      });

      return res.status(200).json(updated);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getVitals(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId;
    const id = req.params.id as string;

    try {
      const vitals = await prisma.patientVitals.findMany({
        where: { patientId: id, hospitalId },
        orderBy: { recordedAt: 'desc' },
      });

      return res.status(200).json(vitals);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async createVitals(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId;
    const id = req.params.id as string;
    const { appointmentId, weightKg, heightCm, bloodPressureSystolic, bloodPressureDiastolic, pulseBpm, temperatureC, spo2Percent, respiratoryRate, notes } = req.body;

    try {
      const patient = await prisma.patient.findFirst({
        where: { id, hospitalId, deletedAt: null },
      });

      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      // BMI Calculation
      let bmi = null;
      if (weightKg && heightCm) {
        const heightM = heightCm / 100;
        bmi = weightKg / (heightM * heightM);
      }

      const vitals = await prisma.patientVitals.create({
        data: {
          id: `vit_${ulid().toLowerCase()}`,
          patientId: id,
          hospitalId,
          appointmentId,
          recordedBy: req.user?.id || '',
          weightKg,
          heightCm,
          bmi,
          bloodPressureSystolic,
          bloodPressureDiastolic,
          pulseBpm,
          temperatureC,
          spo2Percent,
          respiratoryRate,
          notes,
        },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'RECORD_VITALS',
        entityType: 'PATIENT',
        entityId: id,
        description: `Recorded vitals for patient ${patient.firstName} ${patient.lastName}`,
        ipAddress: req.ip,
      });

      return res.status(201).json(vitals);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getTimeline(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId;
    const id = req.params.id as string;

    try {
      const patient = await prisma.patient.findFirst({
        where: { id, hospitalId, deletedAt: null },
      });

      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      const [appointments, consultations, prescriptions, emrRecords] = await Promise.all([
        prisma.appointment.findMany({
          where: { patientId: id, hospitalId },
          include: { doctor: { include: { user: true } }, department: true },
        }),
        prisma.consultation.findMany({
          where: { patientId: id, hospitalId },
          include: { doctor: { include: { user: true } } },
        }),
        prisma.prescription.findMany({
          where: { patientId: id, hospitalId },
          include: { doctor: { include: { user: true } } },
        }),
        prisma.eMRRecord.findMany({
          where: { patientId: id, hospitalId },
        }),
      ]);

      const timeline: any[] = [];

      appointments.forEach((apt) => {
        timeline.push({
          type: 'APPOINTMENT',
          date: apt.appointmentDate.toISOString().split('T')[0] + 'T' + apt.appointmentTime + ':00.000Z',
          summary: `Appointment with Dr. ${apt.doctor.user.firstName} ${apt.doctor.user.lastName} (${apt.department.name})`,
          status: apt.status,
          entityId: apt.id,
        });
      });

      consultations.forEach((con) => {
        timeline.push({
          type: 'CONSULTATION',
          date: con.createdAt.toISOString(),
          summary: `Consultation completed by Dr. ${con.doctor.user.firstName} ${con.doctor.user.lastName}`,
          status: con.status,
          entityId: con.id,
        });
      });

      prescriptions.forEach((rx) => {
        timeline.push({
          type: 'PRESCRIPTION',
          date: rx.createdAt.toISOString(),
          summary: `Prescription issued (${rx.prescriptionNo})`,
          status: rx.status,
          entityId: rx.id,
        });
      });

      emrRecords.forEach((emr) => {
        timeline.push({
          type: 'LAB_RESULT',
          date: emr.createdAt.toISOString(),
          summary: `${emr.recordType} available: ${emr.title}`,
          status: 'COMPLETED',
          entityId: emr.id,
        });
      });

      // Sort timeline descending
      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return res.status(200).json({ timeline });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
