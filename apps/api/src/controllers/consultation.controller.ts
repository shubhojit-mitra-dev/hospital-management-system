import { Request, Response } from 'express';
import { ulid } from 'ulid';
import { prisma } from '../config/db.js';
import { AuditService } from '../services/audit.service.js';

export class ConsultationController {
  static async start(req: Request, res: Response) {
    const { appointmentId } = req.body;
    const hospitalId = req.user?.hospitalId || undefined;

    if (!appointmentId || !hospitalId) {
      return res.status(400).json({ error: 'appointmentId and hospitalId are required' });
    }

    try {
      const appointment = await prisma.appointment.findFirst({
        where: { id: appointmentId, hospitalId },
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      // Check if consultation already exists
      const existing = await prisma.consultation.findUnique({
        where: { appointmentId },
      });
      if (existing) {
        return res.status(200).json(existing);
      }

      const id = `con_${ulid().toLowerCase()}`;
      const consultation = await prisma.consultation.create({
        data: {
          id,
          appointmentId,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          hospitalId,
          status: 'DRAFT',
          diagnosis: '',
        },
      });

      // Update appointment status to IN_CONSULTATION
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'IN_CONSULTATION' },
      });

      // Update queue status
      await prisma.appointmentQueue.updateMany({
        where: { appointmentId },
        data: { queueStatus: 'IN_PROGRESS', calledAt: new Date() },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'START_CONSULTATION',
        entityType: 'CONSULTATION',
        entityId: id,
        description: `Started consultation for appointment id ${appointmentId}`,
        ipAddress: req.ip,
      });

      return res.status(201).json(consultation);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getById(req: Request, res: Response) {
    const id = req.params.id as string;
    const hospitalId = req.user?.hospitalId || undefined;

    try {
      const consultation = await prisma.consultation.findFirst({
        where: { id, hospitalId },
        include: {
          appointment: true,
          patient: true,
          prescriptions: {
            include: {
              items: true,
            },
          },
        },
      });

      if (!consultation) {
        return res.status(404).json({ error: 'Consultation record not found' });
      }

      return res.status(200).json(consultation);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getByAppointmentId(req: Request, res: Response) {
    const appointmentId = req.params.appointmentId as string;
    const hospitalId = req.user?.hospitalId || undefined;

    try {
      const consultation = await prisma.consultation.findFirst({
        where: { appointmentId, hospitalId },
        include: {
          appointment: true,
          patient: true,
          prescriptions: {
            include: {
              items: true,
            },
          },
        },
      });

      if (!consultation) {
        return res.status(404).json({ error: 'Consultation record not found' });
      }

      return res.status(200).json(consultation);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async update(req: Request, res: Response) {
    const id = req.params.id as string;
    const hospitalId = req.user?.hospitalId || undefined;
    const { subjective, objective, assessment, plan, chiefComplaint, diagnosis, icdCodes, severity, followUpRequired, followUpAfterDays, followUpNotes } = req.body;

    try {
      const consultation = await prisma.consultation.findFirst({
        where: { id, hospitalId },
      });

      if (!consultation) {
        return res.status(404).json({ error: 'Consultation record not found' });
      }

      if (consultation.status === 'COMPLETED') {
        return res.status(400).json({ error: 'Cannot update a completed consultation' });
      }

      const updated = await prisma.consultation.update({
        where: { id },
        data: {
          subjective: subjective ?? consultation.subjective,
          objective: objective ?? consultation.objective,
          assessment: assessment ?? consultation.assessment,
          plan: plan ?? consultation.plan,
          chiefComplaint: chiefComplaint ?? consultation.chiefComplaint,
          diagnosis: diagnosis ?? consultation.diagnosis,
          icdCodes: icdCodes ?? consultation.icdCodes,
          severity: severity ?? consultation.severity,
          followUpRequired: followUpRequired ?? consultation.followUpRequired,
          followUpAfterDays: followUpAfterDays !== undefined ? parseInt(followUpAfterDays) : consultation.followUpAfterDays,
          followUpNotes: followUpNotes ?? consultation.followUpNotes,
        },
      });

      return res.status(200).json(updated);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async complete(req: Request, res: Response) {
    const id = req.params.id as string;
    const hospitalId = req.user?.hospitalId || undefined;

    try {
      const consultation = await prisma.consultation.findFirst({
        where: { id, hospitalId },
      });

      if (!consultation) {
        return res.status(404).json({ error: 'Consultation record not found' });
      }

      const updated = await prisma.consultation.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // Update appointment status to COMPLETED
      await prisma.appointment.update({
        where: { id: consultation.appointmentId },
        data: { status: 'COMPLETED' },
      });

      // Update queue status
      await prisma.appointmentQueue.updateMany({
        where: { appointmentId: consultation.appointmentId },
        data: { queueStatus: 'DONE', completedAt: new Date() },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'COMPLETE_CONSULTATION',
        entityType: 'CONSULTATION',
        entityId: id,
        description: `Completed consultation id ${id} for appointment id ${consultation.appointmentId}`,
        ipAddress: req.ip,
      });

      return res.status(200).json(updated);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Prescription creation
  static async createPrescription(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId || undefined;
    const { consultationId, notes, items } = req.body; // items is array of { medicineName, genericName, dosage, form, route, frequency, durationDays, quantity, instructions }

    if (!consultationId || !hospitalId || !Array.isArray(items)) {
      return res.status(400).json({ error: 'consultationId and items array are required' });
    }

    try {
      const consultation = await prisma.consultation.findFirst({
        where: { id: consultationId, hospitalId },
      });

      if (!consultation) {
        return res.status(404).json({ error: 'Consultation not found' });
      }

      // Check allergies check: Fetch patient medical history allergies
      const medicalHistory = await prisma.patientMedicalHistory.findUnique({
        where: { patientId: consultation.patientId },
      });
      const allergiesList = (medicalHistory?.allergies as any[]) || [];

      // Check if any prescribed item matches allergy list
      const allergyWarnings: string[] = [];
      items.forEach((item) => {
        const matchesAllergy = allergiesList.some((allergy) => 
          allergy.substance.toLowerCase() === item.medicineName.toLowerCase() ||
          (allergy.substance && item.genericName && allergy.substance.toLowerCase() === item.genericName.toLowerCase())
        );
        if (matchesAllergy) {
          allergyWarnings.push(`Patient is allergic to ${item.medicineName}`);
        }
      });

      // Generate prescription number: RX-YYYY-XXXXXX
      const currentYear = new Date().getFullYear();
      const count = await prisma.prescription.count({
        where: { hospitalId },
      });
      const prescriptionNo = `RX-${currentYear}-${String(count + 1).padStart(6, '0')}`;

      const id = `rx_${ulid().toLowerCase()}`;
      const prescription = await prisma.prescription.create({
        data: {
          id,
          consultationId,
          patientId: consultation.patientId,
          doctorId: consultation.doctorId,
          hospitalId,
          prescriptionNo,
          notes,
          status: 'PENDING',
        },
      });

      // Create items
      const itemData = items.map((item) => ({
        id: `rxi_${ulid().toLowerCase()}`,
        prescriptionId: id,
        medicineName: item.medicineName,
        genericName: item.genericName || null,
        dosage: item.dosage,
        form: item.form || null,
        route: item.route || null,
        frequency: item.frequency,
        durationDays: parseInt(item.durationDays) || 1,
        quantity: item.quantity ? parseInt(item.quantity) : null,
        instructions: item.instructions || null,
        isAvailable: true,
      }));

      await prisma.prescriptionItem.createMany({
        data: itemData,
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'CREATE_PRESCRIPTION',
        entityType: 'PRESCRIPTION',
        entityId: id,
        description: `Created prescription ${prescriptionNo} (Warnings: ${allergyWarnings.length})`,
        ipAddress: req.ip,
      });

      return res.status(201).json({
        prescription,
        warnings: allergyWarnings,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ICD-10 Search
  static async searchICDCodes(req: Request, res: Response) {
    const search = req.query.search as string;

    try {
      const codes = await prisma.iCDCode.findMany({
        where: search ? {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        } : {},
        take: 20,
      });
      return res.status(200).json(codes);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
