import { Request, Response } from 'express';
import { ulid } from 'ulid';
import { prisma } from '../config/db.js';
import { AuditService } from '../services/audit.service.js';

export class InpatientController {
  
  // --- Wards ---
  static async createWard(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    const { name, wardType, floor, totalBeds, chargePerDay, departmentId } = req.body;

    if (!name || !wardType || !totalBeds || chargePerDay === undefined) {
      return res.status(400).json({ error: 'Missing required ward fields: name, wardType, totalBeds, chargePerDay' });
    }

    try {
      const wardId = `wrd_${ulid().toLowerCase()}`;
      const ward = await prisma.ward.create({
        data: {
          id: wardId,
          hospitalId,
          departmentId: departmentId || null,
          name,
          wardType,
          floor: floor || null,
          totalBeds: Number(totalBeds),
          chargePerDay: Number(chargePerDay),
          isActive: true
        }
      });

      // Automatically pre-populate beds if needed
      for (let i = 1; i <= Number(totalBeds); i++) {
        const bedId = `bed_${ulid().toLowerCase()}`;
        const bedNumber = `${name.substring(0, 3).toUpperCase()}-${String(i).padStart(3, '0')}`;
        await prisma.bed.create({
          data: {
            id: bedId,
            hospitalId,
            wardId: wardId,
            bedNumber,
            bedType: wardType === 'ICU' ? 'ICU' : 'STANDARD',
            status: 'AVAILABLE',
            isActive: true
          }
        });
      }

      await AuditService.recordLog({
        hospitalId,
        actorId: req.user?.id,
        actorRole: req.user?.role,
        action: 'CREATE_WARD',
        entityType: 'Ward',
        entityId: wardId,
        description: `Created ward ${name} with ${totalBeds} beds.`,
        ipAddress: req.ip
      });

      return res.status(201).json({ success: true, data: ward });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async listWards(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    try {
      const wards = await prisma.ward.findMany({
        where: { hospitalId, isActive: true },
        include: {
          beds: true,
          department: true
        },
        orderBy: { name: 'asc' }
      });

      // Calculate real-time bed statistics per ward
      const wardsWithStats = wards.map((w: any) => {
        const total = w.beds.length;
        const available = w.beds.filter((b: any) => b.status === 'AVAILABLE' && b.isActive).length;
        const occupied = w.beds.filter((b: any) => b.status === 'OCCUPIED' && b.isActive).length;
        const maintenance = w.beds.filter((b: any) => b.status === 'MAINTENANCE' && b.isActive).length;
        
        return {
          ...w,
          stats: {
            totalBeds: total,
            availableBeds: available,
            occupiedBeds: occupied,
            maintenanceBeds: maintenance,
            occupancyRate: total > 0 ? `${Math.round((occupied / total) * 100)}%` : '0%'
          }
        };
      });

      return res.status(200).json({ success: true, data: wardsWithStats });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getWardById(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string;

    try {
      const ward = await prisma.ward.findFirst({
        where: { id, hospitalId },
        include: {
          beds: {
            orderBy: { bedNumber: 'asc' }
          },
          department: true
        }
      });

      if (!ward) {
        return res.status(404).json({ error: 'Ward not found' });
      }

      const total = ward.beds.length;
      const available = ward.beds.filter((b: any) => b.status === 'AVAILABLE' && b.isActive).length;
      const occupied = ward.beds.filter((b: any) => b.status === 'OCCUPIED' && b.isActive).length;
      const maintenance = ward.beds.filter((b: any) => b.status === 'MAINTENANCE' && b.isActive).length;

      const stats = {
        totalBeds: total,
        availableBeds: available,
        occupiedBeds: occupied,
        maintenanceBeds: maintenance,
        occupancyRate: total > 0 ? `${Math.round((occupied / total) * 100)}%` : '0%'
      };

      return res.status(200).json({ success: true, data: { ...ward, stats } });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // --- Beds ---
  static async addBedsToWard(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string; // Ward ID
    const { beds } = req.body; // Array of bed objects { bedNumber, bedType }

    if (!beds || !Array.isArray(beds)) {
      return res.status(400).json({ error: 'Beds array is required' });
    }

    try {
      const ward = await prisma.ward.findFirst({ where: { id, hospitalId } });
      if (!ward) {
        return res.status(404).json({ error: 'Ward not found' });
      }

      const createdBeds = [];
      for (const b of beds) {
        const bedId = `bed_${ulid().toLowerCase()}`;
        const newBed = await prisma.bed.create({
          data: {
            id: bedId,
            hospitalId,
            wardId: id,
            bedNumber: b.bedNumber,
            bedType: b.bedType || 'STANDARD',
            status: 'AVAILABLE',
            isActive: true
          }
        });
        createdBeds.push(newBed);
      }

      // Update ward total beds count
      await prisma.ward.update({
        where: { id },
        data: { totalBeds: { increment: beds.length } }
      });

      return res.status(201).json({ success: true, data: createdBeds });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateBedStatus(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string;
    const bedId = req.params.bedId as string; // Ward ID and Bed ID
    const { status } = req.body; // AVAILABLE | MAINTENANCE | RESERVED

    if (!status) {
      return res.status(400).json({ error: 'Bed status is required' });
    }

    try {
      const bed = await prisma.bed.findFirst({
        where: { id: bedId, wardId: id, hospitalId }
      });

      if (!bed) {
        return res.status(404).json({ error: 'Bed not found in the specified ward' });
      }

      if (bed.status === 'OCCUPIED' && status !== 'OCCUPIED') {
        return res.status(400).json({ error: 'Occupied beds must be discharged or transferred, status cannot be changed directly.' });
      }

      const updated = await prisma.bed.update({
        where: { id: bedId },
        data: { status }
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // --- Admissions ---
  static async createAdmission(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    const {
      patientId,
      doctorId,
      departmentId,
      wardId,
      bedId,
      admissionType,
      chiefComplaint,
      admissionDiagnosis,
      primaryNurseId,
      attendantName,
      attendantPhone,
      attendantRelation
    } = req.body;

    if (!patientId || !doctorId || !departmentId || !wardId || !bedId || !admissionType) {
      return res.status(400).json({ error: 'Missing required admission fields' });
    }

    try {
      // 1. Check if patient is already admitted
      const existingAdmission = await prisma.admission.findFirst({
        where: { patientId, hospitalId, status: 'ADMITTED' }
      });
      if (existingAdmission) {
        return res.status(400).json({ error: 'Patient is already admitted. Discharge them first.' });
      }

      // 2. Check and lock bed
      const bed = await prisma.bed.findFirst({
        where: { id: bedId, wardId, hospitalId }
      });
      if (!bed) {
        return res.status(404).json({ error: 'Bed not found' });
      }
      if (bed.status !== 'AVAILABLE') {
        return res.status(400).json({ error: `Bed status is currently ${bed.status}. Choose an AVAILABLE bed.` });
      }

      // Get daily snapshot room charge rate
      const ward = await prisma.ward.findFirst({ where: { id: wardId } });
      if (!ward) {
        return res.status(404).json({ error: 'Ward not found' });
      }

      // 3. Create admission record
      const admissionId = `adm_${ulid().toLowerCase()}`;
      const count = await prisma.admission.count({ where: { hospitalId } });
      const admissionNumber = `ADM-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

      const admission = await prisma.admission.create({
        data: {
          id: admissionId,
          hospitalId,
          patientId,
          doctorId,
          departmentId,
          wardId,
          bedId,
          admissionNumber,
          admissionType,
          chiefComplaint: chiefComplaint || null,
          admissionDiagnosis: admissionDiagnosis || null,
          status: 'ADMITTED',
          primaryNurseId: primaryNurseId || null,
          attendantName: attendantName || null,
          attendantPhone: attendantPhone || null,
          attendantRelation: attendantRelation || null,
          dailyRoomRate: ward.chargePerDay,
          lastBilledDate: new Date()
        },
        include: {
          patient: true,
          doctor: { include: { user: true } },
          ward: true,
          bed: true
        }
      });

      // 4. Set bed status to OCCUPIED
      await prisma.bed.update({
        where: { id: bedId },
        data: { status: 'OCCUPIED' }
      });

      // 5. Create Draft invoice for this admission
      const invoiceCount = await prisma.invoice.count({ where: { hospitalId } });
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(6, '0')}`;
      const invoiceId = `inv_${ulid().toLowerCase()}`;

      await prisma.invoice.create({
        data: {
          id: invoiceId,
          hospitalId,
          patientId,
          invoiceNumber,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          notes: `Inpatient Stay Charges - Admission: ${admissionNumber}`,
          subtotal: 0,
          totalAmount: 0,
          balanceAmount: 0,
          status: 'DRAFT',
          createdBy: req.user?.id
        }
      });

      // Create an admission fee item in the new invoice
      await prisma.invoiceItem.create({
        data: {
          id: `ivi_${ulid().toLowerCase()}`,
          invoiceId,
          hospitalId,
          itemType: 'CONSULTATION',
          description: `Admission Fee - Number: ${admissionNumber}`,
          quantity: 1,
          unitPrice: 500, // standard admission registration fee
          totalPrice: 500
        }
      });

      // Adjust invoice subtotal/total
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          subtotal: 500,
          totalAmount: 500,
          balanceAmount: 500
        }
      });

      await AuditService.recordLog({
        hospitalId,
        actorId: req.user?.id,
        actorRole: req.user?.role,
        action: 'ADMIT_PATIENT',
        entityType: 'Admission',
        entityId: admissionId,
        description: `Admitted patient ${admission.patient.firstName} ${admission.patient.lastName} to ward ${admission.ward.name}, bed ${admission.bed.bedNumber}`,
        ipAddress: req.ip
      });

      return res.status(201).json({ success: true, data: admission });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async listAdmissions(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    const status = req.query.status as string | undefined;
    const patientId = req.query.patientId as string | undefined;
    const wardId = req.query.wardId as string | undefined;

    try {
      const whereClause: any = { hospitalId };
      if (status) whereClause.status = status as string;
      if (patientId) whereClause.patientId = patientId as string;
      if (wardId) whereClause.wardId = wardId as string;

      const admissions = await prisma.admission.findMany({
        where: whereClause,
        include: {
          patient: true,
          doctor: { include: { user: true } },
          ward: true,
          bed: true,
          primaryNurse: true
        },
        orderBy: { admissionDate: 'desc' }
      });

      return res.status(200).json({ success: true, data: admissions });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getAdmissionById(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string;

    try {
      const admission = await prisma.admission.findFirst({
        where: { id, hospitalId },
        include: {
          patient: true,
          doctor: { include: { user: true } },
          ward: true,
          bed: true,
          primaryNurse: true,
          notes: {
            include: { author: true },
            orderBy: { authoredAt: 'desc' }
          },
          transfers: {
            include: {
              fromWard: true,
              fromBed: true,
              toWard: true,
              toBed: true,
              performer: true
            },
            orderBy: { transferredAt: 'desc' }
          }
        }
      });

      if (!admission) {
        return res.status(404).json({ error: 'Admission not found' });
      }

      return res.status(200).json({ success: true, data: admission });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async recordRoundNote(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string; // Admission ID
    const { noteType, notes } = req.body;

    if (!noteType || !notes) {
      return res.status(400).json({ error: 'noteType and notes fields are required' });
    }

    try {
      const admission = await prisma.admission.findFirst({
        where: { id, hospitalId }
      });

      if (!admission) {
        return res.status(404).json({ error: 'Admission record not found' });
      }

      const note = await prisma.admissionNote.create({
        data: {
          id: `nt_${ulid().toLowerCase()}`,
          admissionId: id,
          hospitalId,
          noteType,
          notes,
          authoredBy: req.user?.id || ''
        },
        include: { author: true }
      });

      return res.status(201).json({ success: true, data: note });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async transferPatient(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string; // Admission ID
    const { toWardId, toBedId, reason } = req.body;

    if (!toWardId || !toBedId) {
      return res.status(400).json({ error: 'Destination wardId and bedId are required' });
    }

    try {
      const admission = await prisma.admission.findFirst({
        where: { id, hospitalId, status: 'ADMITTED' }
      });

      if (!admission) {
        return res.status(404).json({ error: 'Active admission not found' });
      }

      // Check destination bed
      const destBed = await prisma.bed.findFirst({
        where: { id: toBedId, wardId: toWardId, hospitalId }
      });
      if (!destBed) {
        return res.status(404).json({ error: 'Destination bed not found' });
      }
      if (destBed.status !== 'AVAILABLE') {
        return res.status(400).json({ error: `Destination bed is currently ${destBed.status}` });
      }

      const ward = await prisma.ward.findFirst({ where: { id: toWardId } });
      if (!ward) {
        return res.status(404).json({ error: 'Destination ward not found' });
      }

      // 1. Create transfer log
      await prisma.admissionTransfer.create({
        data: {
          id: `trn_${ulid().toLowerCase()}`,
          admissionId: id,
          fromWardId: admission.wardId,
          fromBedId: admission.bedId,
          toWardId,
          toBedId,
          reason: reason || 'Routine bed adjustment',
          transferredBy: req.user?.id
        }
      });

      // 2. Free up the old bed
      await prisma.bed.update({
        where: { id: admission.bedId },
        data: { status: 'AVAILABLE' }
      });

      // 3. Reserve the new bed
      await prisma.bed.update({
        where: { id: toBedId },
        data: { status: 'OCCUPIED' }
      });

      // 4. Update admission references and room snapshot rates
      const updated = await prisma.admission.update({
        where: { id },
        data: {
          wardId: toWardId,
          bedId: toBedId,
          dailyRoomRate: ward.chargePerDay
        },
        include: {
          ward: true,
          bed: true
        }
      });

      await AuditService.recordLog({
        hospitalId: hospitalId || undefined,
        actorId: req.user?.id,
        actorRole: req.user?.role,
        action: 'TRANSFER_PATIENT_BED',
        entityType: 'Admission',
        entityId: id as string,
        description: `Transferred admission ${admission.admissionNumber} from bed ${admission.bedId} to bed ${toBedId}`,
        ipAddress: req.ip
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async dischargePatient(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string; // Admission ID
    const { dischargeDiagnosis, dischargeCondition, dischargeInstructions } = req.body;

    if (!dischargeDiagnosis || !dischargeCondition) {
      return res.status(400).json({ error: 'dischargeDiagnosis and dischargeCondition are required' });
    }

    try {
      const admission = await prisma.admission.findFirst({
        where: { id, hospitalId, status: 'ADMITTED' },
        include: { ward: true, bed: true, patient: true }
      });

      if (!admission) {
        return res.status(404).json({ error: 'Active admission record not found' });
      }

      const now = new Date();
      
      // Calculate stay duration
      const diffTime = Math.abs(now.getTime() - admission.admissionDate.getTime());
      let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 0) diffDays = 1; // charge at least 1 day

      // 1. Update bed status to AVAILABLE
      await prisma.bed.update({
        where: { id: admission.bedId },
        data: { status: 'AVAILABLE' }
      });

      // 2. Finalize admission details
      const updatedAdmission = await prisma.admission.update({
        where: { id },
        data: {
          status: 'DISCHARGED',
          dischargeDate: now,
          dischargeDiagnosis,
          dischargeCondition,
          dischargeInstructions: dischargeInstructions || ''
        }
      });

      // 3. Find patient draft invoice to add daily room charge items and finalize
      const invoice = await prisma.invoice.findFirst({
        where: { 
          patientId: admission.patientId, 
          hospitalId, 
          status: 'DRAFT',
          notes: { contains: admission.admissionNumber } 
        }
      });

      if (invoice) {
        const roomCharge = Number(admission.dailyRoomRate) * diffDays;
        
        // Add room charges item
        await prisma.invoiceItem.create({
          data: {
            id: `ivi_${ulid().toLowerCase()}`,
            invoiceId: invoice.id,
            hospitalId,
            itemType: 'ROOM',
            description: `Room Charges: ${admission.ward.name} (${diffDays} days at ₹${admission.dailyRoomRate}/day)`,
            quantity: diffDays,
            unitPrice: admission.dailyRoomRate,
            totalPrice: roomCharge
          }
        });

        // Recalculate invoice totals
        const items = await prisma.invoiceItem.findMany({ where: { invoiceId: invoice.id } });
        const subtotal = items.reduce((acc: number, it: any) => acc + Number(it.totalPrice), 0);

        // Finalize invoice status to PENDING
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            subtotal,
            totalAmount: subtotal,
            balanceAmount: subtotal,
            status: 'PENDING',
            finalizedAt: now
          }
        });
      }

      await AuditService.recordLog({
        hospitalId: hospitalId || undefined,
        actorId: req.user?.id,
        actorRole: req.user?.role,
        action: 'DISCHARGE_PATIENT',
        entityType: 'Admission',
        entityId: id as string,
        description: `Discharged patient ${admission.patient.firstName} ${admission.patient.lastName} from ward ${admission.ward.name}`,
        ipAddress: req.ip
      });

      return res.status(200).json({ success: true, data: updatedAdmission });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getBedAvailability(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    try {
      const wards = await prisma.ward.findMany({
        where: { hospitalId, isActive: true },
        include: {
          beds: {
            where: { isActive: true }
          }
        }
      });

      const totalBeds = wards.reduce((acc: number, w: any) => acc + w.beds.length, 0);
      const occupiedBeds = wards.reduce((acc: number, w: any) => acc + w.beds.filter((b: any) => b.status === 'OCCUPIED').length, 0);
      const availableBeds = wards.reduce((acc: number, w: any) => acc + w.beds.filter((b: any) => b.status === 'AVAILABLE').length, 0);
      const maintenanceBeds = wards.reduce((acc: number, w: any) => acc + w.beds.filter((b: any) => b.status === 'MAINTENANCE').length, 0);

      const summary = {
        totalBeds,
        availableBeds,
        occupiedBeds,
        maintenanceBeds,
        occupancyRate: totalBeds > 0 ? `${Math.round((occupiedBeds / totalBeds) * 100)}%` : '0%'
      };

      return res.status(200).json({
        success: true,
        data: {
          summary,
          wards: wards.map((w: any) => ({
            id: w.id,
            name: w.name,
            wardType: w.wardType,
            chargePerDay: w.chargePerDay,
            totalBeds: w.beds.length,
            availableBeds: w.beds.filter((b: any) => b.status === 'AVAILABLE').length,
            occupiedBeds: w.beds.filter((b: any) => b.status === 'OCCUPIED').length,
            beds: w.beds.map((b: any) => ({
              id: b.id,
              bedNumber: b.bedNumber,
              bedType: b.bedType,
              status: b.status
            }))
          }))
        }
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // --- Manual room billing simulation ---
  static async triggerDailyBilling(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    try {
      // Find all active admissions
      const admissions = await prisma.admission.findMany({
        where: { hospitalId, status: 'ADMITTED' },
        include: { ward: true }
      });

      const today = new Date();
      let totalBilledItems = 0;

      for (const adm of admissions) {
        const lastBilled = adm.lastBilledDate || adm.admissionDate;
        
        // Calculate days since last billed
        const diffTime = Math.abs(today.getTime() - lastBilled.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
          const billingAmount = Number(adm.dailyRoomRate) * diffDays;
          
          // Find draft invoice
          const invoice = await prisma.invoice.findFirst({
            where: {
              patientId: adm.patientId,
              hospitalId,
              status: 'DRAFT',
              notes: { contains: adm.admissionNumber }
            }
          });

          if (invoice) {
            // Append daily room charge item
            await prisma.invoiceItem.create({
              data: {
                id: `ivi_${ulid().toLowerCase()}`,
                invoiceId: invoice.id,
                hospitalId,
                itemType: 'ROOM',
                description: `Daily Room Charge: ${adm.ward.name} (${diffDays} days)`,
                quantity: diffDays,
                unitPrice: adm.dailyRoomRate,
                totalPrice: billingAmount
              }
            });

            // Update invoice totals
            const items = await prisma.invoiceItem.findMany({ where: { invoiceId: invoice.id } });
            const subtotal = items.reduce((acc: number, it: any) => acc + Number(it.totalPrice), 0);

            await prisma.invoice.update({
              where: { id: invoice.id },
              data: {
                subtotal,
                totalAmount: subtotal,
                balanceAmount: subtotal
              }
            });

            // Update admission last billed date
            await prisma.admission.update({
              where: { id: adm.id },
              data: { lastBilledDate: today }
            });

            totalBilledItems++;
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: `Successfully processed daily room charges. Billed ${totalBilledItems} active admissions.`
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

}
