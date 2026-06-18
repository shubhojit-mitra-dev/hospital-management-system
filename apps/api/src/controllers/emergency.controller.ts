import { Request, Response } from 'express';
import { ulid } from 'ulid';
import { prisma } from '../config/db.js';
import { AuditService } from '../services/audit.service.js';
import { NotificationService } from '../services/notification.service.js';

export class EmergencyController {

  static async createEmergencyCase(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    const {
      patientId,
      patientName,
      patientAge,
      patientGender,
      patientPhone,
      broughtBy,
      triageLevel,
      chiefComplaint,
      symptoms,
      mechanismOfInjury,
      bpSystolic,
      bpDiastolic,
      pulse,
      temperature,
      spo2,
      gcsScore,
      assignedNurseId
    } = req.body;

    if (!triageLevel || !chiefComplaint) {
      return res.status(400).json({ error: 'triageLevel and chiefComplaint are required' });
    }

    try {
      // 1. If registered patient, check if there's already an active emergency case
      if (patientId) {
        const existingCase = await prisma.emergencyCase.findFirst({
          where: { patientId, hospitalId, status: 'ACTIVE' }
        });
        if (existingCase) {
          return res.status(400).json({ error: `Patient already has an active emergency case: ${existingCase.caseNumber}` });
        }
      }

      // 2. Resolve attending doctor from Duty Roster (Auto-Assignment logic)
      const today = new Date();
      const currentHour = today.getHours();
      // MORNING: 6 AM to 2 PM (14), EVENING: 2 PM to 10 PM (22), NIGHT: 10 PM to 6 AM
      const shift = currentHour >= 6 && currentHour < 14 ? 'MORNING' : currentHour >= 14 && currentHour < 22 ? 'EVENING' : 'NIGHT';

      const onCallDoctor = await prisma.dutyRoster.findFirst({
        where: {
          hospitalId,
          shiftDate: today,
          shiftType: shift,
          userRole: 'DOCTOR',
          isOnCall: true
        },
        include: { user: true }
      });

      const attendingDoctorId = onCallDoctor?.userId || null;

      // 3. Create case
      const caseId = `emg_${ulid().toLowerCase()}`;
      const count = await prisma.emergencyCase.count({ where: { hospitalId } });
      const caseNumber = `EMG-${today.getFullYear()}-${String(count + 1).padStart(6, '0')}`;

      const emergencyCase = await prisma.emergencyCase.create({
        data: {
          id: caseId,
          hospitalId,
          patientId: patientId || null,
          caseNumber,
          patientName: patientName || null,
          patientAge: patientAge ? Number(patientAge) : null,
          patientGender: patientGender || null,
          patientPhone: patientPhone || null,
          broughtBy: broughtBy || null,
          triageLevel,
          chiefComplaint,
          symptoms: symptoms ? JSON.stringify(symptoms) : '[]',
          mechanismOfInjury: mechanismOfInjury || null,
          bpSystolic: bpSystolic ? Number(bpSystolic) : null,
          bpDiastolic: bpDiastolic ? Number(bpDiastolic) : null,
          pulse: pulse ? Number(pulse) : null,
          temperature: temperature ? Number(temperature) : null,
          spo2: spo2 ? Number(spo2) : null,
          gcsScore: gcsScore ? Number(gcsScore) : null,
          triageBy: req.user?.id || null,
          attendingDoctorId,
          assignedNurseId: assignedNurseId || null,
          status: 'ACTIVE',
          arrivalTime: today,
          triageTime: today
        },
        include: {
          patient: true,
          doctor: true,
          nurse: true
        }
      });

      // 4. Dispatch system notifications (Email, SMS, In-App)
      if (attendingDoctorId) {
        await NotificationService.send({
          hospitalId,
          eventType: 'EMERGENCY_ASSIGNED',
          recipients: [attendingDoctorId],
          title: `Emergency Assigned: ${caseNumber}`,
          body: `You are assigned to Case ${caseNumber}. Complaint: ${chiefComplaint}. ESI Level: ${triageLevel}. Please check the emergency board.`,
          entityType: 'emergency',
          entityId: caseId,
          actionUrl: `/emergency/${caseId}`,
          priority: 'CRITICAL',
          templateData: {
            caseNumber,
            triageLevel,
            chiefComplaint,
            broughtBy: broughtBy || 'Self'
          }
        });
      }

      // Notify hospital administrators
      const admins = await prisma.user.findMany({
        where: { hospitalId, role: 'HOSPITAL_ADMIN' },
        select: { id: true }
      });
      const adminIds = admins.map((a: any) => a.id);
      if (adminIds.length > 0) {
        await NotificationService.send({
          hospitalId,
          eventType: 'EMERGENCY_ACTIVE',
          recipients: adminIds,
          title: `Active ER Case: ${caseNumber}`,
          body: `Emergency Intake registered - Case: ${caseNumber}. ESI: ${triageLevel}. Complaint: ${chiefComplaint}.`,
          entityType: 'emergency',
          entityId: caseId,
          actionUrl: `/emergency/${caseId}`,
          priority: triageLevel === 'IMMEDIATE' ? 'CRITICAL' : 'HIGH'
        });
      }

      // 5. Create draft invoice for emergency stay (if registered patient)
      if (patientId) {
        const invoiceCount = await prisma.invoice.count({ where: { hospitalId } });
        const invoiceNumber = `INV-${today.getFullYear()}-${String(invoiceCount + 1).padStart(6, '0')}`;
        const invoiceId = `inv_${ulid().toLowerCase()}`;

        await prisma.invoice.create({
          data: {
            id: invoiceId,
            hospitalId,
            patientId,
            invoiceNumber,
            notes: `Emergency Stay Charges - Case: ${caseNumber}`,
            subtotal: 800, // Emergency consultation fee snapshot
            totalAmount: 800,
            balanceAmount: 800,
            status: 'DRAFT',
            createdBy: req.user?.id
          }
        });

        // Add fee item
        await prisma.invoiceItem.create({
          data: {
            id: `ivi_${ulid().toLowerCase()}`,
            invoiceId,
            hospitalId,
            itemType: 'EMERGENCY',
            description: `Emergency Consultation & Triage Room Fee - ${caseNumber}`,
            quantity: 1,
            unitPrice: 800,
            totalPrice: 800
          }
        });
      }

      await AuditService.recordLog({
        hospitalId,
        actorId: req.user?.id,
        actorRole: req.user?.role,
        action: 'CREATE_EMERGENCY_CASE',
        entityType: 'EmergencyCase',
        entityId: caseId,
        description: `Created emergency case ${caseNumber} for ${patientName || 'unregistered patient'}. Triage: ${triageLevel}`,
        ipAddress: req.ip
      });

      return res.status(201).json({ success: true, data: emergencyCase });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async listActiveEmergencies(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    const { status } = req.query;

    try {
      const whereClause: any = { hospitalId };
      if (status) {
        whereClause.status = status as string;
      } else {
        whereClause.status = 'ACTIVE';
      }

      const cases = await prisma.emergencyCase.findMany({
        where: whereClause,
        include: {
          patient: true,
          doctor: true,
          nurse: true
        },
        orderBy: { arrivalTime: 'desc' }
      });

      // Stats calculator
      const activeCases = cases.filter((c: any) => c.status === 'ACTIVE');
      const stats = {
        totalActive: activeCases.length,
        immediate: activeCases.filter((c: any) => c.triageLevel === 'IMMEDIATE').length,
        emergent: activeCases.filter((c: any) => c.triageLevel === 'EMERGENT').length,
        urgent: activeCases.filter((c: any) => c.triageLevel === 'URGENT').length,
        lessUrgent: activeCases.filter((c: any) => c.triageLevel === 'LESS_URGENT').length,
        nonUrgent: activeCases.filter((c: any) => c.triageLevel === 'NON_URGENT').length
      };

      // Custom priority sorting: IMMEDIATE > EMERGENT > URGENT > LESS_URGENT > NON_URGENT
      const priorityMap: Record<string, number> = {
        'IMMEDIATE': 5,
        'EMERGENT': 4,
        'URGENT': 3,
        'LESS_URGENT': 2,
        'NON_URGENT': 1
      };

      const sortedCases = cases.sort((a: any, b: any) => {
        if (a.status !== b.status) return a.status === 'ACTIVE' ? -1 : 1; // actives first
        return (priorityMap[b.triageLevel] || 0) - (priorityMap[a.triageLevel] || 0);
      });

      return res.status(200).json({
        success: true,
        data: {
          cases: sortedCases,
          stats
        }
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getEmergencyCaseById(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string;

    try {
      const emgCase = await prisma.emergencyCase.findFirst({
        where: { id, hospitalId },
        include: {
          patient: true,
          doctor: true,
          nurse: true,
          admission: true,
          actions: {
            include: { performer: true },
            orderBy: { performedAt: 'desc' }
          }
        }
      });

      if (!emgCase) {
        return res.status(404).json({ error: 'Emergency case not found' });
      }

      return res.status(200).json({ success: true, data: emgCase });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateTriageLevel(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string;
    const { triageLevel } = req.body;

    if (!triageLevel) {
      return res.status(400).json({ error: 'triageLevel is required' });
    }

    try {
      const emgCase = await prisma.emergencyCase.findFirst({ where: { id, hospitalId } });
      if (!emgCase) {
        return res.status(404).json({ error: 'Emergency case not found' });
      }

      const updated = await prisma.emergencyCase.update({
        where: { id },
        data: {
          triageLevel,
          triageTime: new Date()
        }
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async assignDoctor(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string;
    const { attendingDoctorId, assignedNurseId } = req.body;

    try {
      const emgCase = await prisma.emergencyCase.findFirst({ where: { id, hospitalId } });
      if (!emgCase) {
        return res.status(404).json({ error: 'Emergency case not found' });
      }

      const updated = await prisma.emergencyCase.update({
        where: { id },
        data: {
          attendingDoctorId: attendingDoctorId !== undefined ? attendingDoctorId : emgCase.attendingDoctorId,
          assignedNurseId: assignedNurseId !== undefined ? assignedNurseId : emgCase.assignedNurseId,
          doctorSeenTime: attendingDoctorId ? new Date() : emgCase.doctorSeenTime
        }
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async logAction(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string; // Case ID
    const { actionType, description } = req.body;

    if (!actionType || !description) {
      return res.status(400).json({ error: 'actionType and description are required' });
    }

    try {
      const emgCase = await prisma.emergencyCase.findFirst({ where: { id, hospitalId } });
      if (!emgCase) {
        return res.status(404).json({ error: 'Emergency case not found' });
      }

      const action = await prisma.emergencyAction.create({
        data: {
          id: `act_${ulid().toLowerCase()}`,
          emergencyCaseId: id,
          actionType,
          description,
          performedBy: req.user?.id || ''
        },
        include: { performer: true }
      });

      return res.status(201).json({ success: true, data: action });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async closeEmergencyCase(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string;
    const { disposition, admissionId, notes } = req.body;

    if (!disposition) {
      return res.status(400).json({ error: 'disposition is required' });
    }

    try {
      const emgCase = await prisma.emergencyCase.findFirst({
        where: { id, hospitalId, status: 'ACTIVE' },
        include: { patient: true }
      });

      if (!emgCase) {
        return res.status(404).json({ error: 'Active emergency case record not found' });
      }

      const now = new Date();

      const updated = await prisma.emergencyCase.update({
        where: { id },
        data: {
          status: 'CLOSED',
          disposition,
          admissionId: admissionId || null,
          dispositionTime: now,
          notes: notes || emgCase.notes
        }
      });

      // Finalize invoice if patient is registered
      if (emgCase.patientId) {
        const invoice = await prisma.invoice.findFirst({
          where: {
            patientId: emgCase.patientId,
            hospitalId,
            status: 'DRAFT',
            notes: { contains: emgCase.caseNumber }
          }
        });

        if (invoice) {
          // Finalize invoice status to PENDING
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              status: 'PENDING',
              finalizedAt: now
            }
          });
        }
      }

      await AuditService.recordLog({
        hospitalId: hospitalId || undefined,
        actorId: req.user?.id,
        actorRole: req.user?.role,
        action: 'CLOSE_EMERGENCY_CASE',
        entityType: 'EmergencyCase',
        entityId: id as string,
        description: `Closed emergency case ${emgCase.caseNumber}. Disposition: ${disposition}`,
        ipAddress: req.ip
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // --- Duty Roster ---
  static async getDutyRoster(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    try {
      const rosters = await prisma.dutyRoster.findMany({
        where: { hospitalId },
        include: {
          user: true,
          department: true
        },
        orderBy: { shiftDate: 'desc' }
      });

      return res.status(200).json({ success: true, data: rosters });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async upsertDutyRoster(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    const { departmentId, userId, userRole, shiftDate, shiftType, shiftStart, shiftEnd, isOnCall } = req.body;

    if (!departmentId || !userId || !userRole || !shiftDate || !shiftType || !shiftStart || !shiftEnd) {
      return res.status(400).json({ error: 'Missing required duty roster fields' });
    }

    try {
      const rosterId = `rst_${ulid().toLowerCase()}`;
      const parsedDate = new Date(shiftDate);

      // Create unique constraint mapping: userId, shiftDate, shiftType
      const roster = await prisma.dutyRoster.upsert({
        where: {
          userId_shiftDate_shiftType: {
            userId,
            shiftDate: parsedDate,
            shiftType
          }
        },
        update: {
          shiftStart,
          shiftEnd,
          isOnCall: !!isOnCall
        },
        create: {
          id: rosterId,
          hospitalId,
          departmentId,
          userId,
          userRole,
          shiftDate: parsedDate,
          shiftType,
          shiftStart,
          shiftEnd,
          isOnCall: !!isOnCall
        }
      });

      return res.status(200).json({ success: true, data: roster });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

}
