import { Request, Response } from 'express';
import { ulid } from 'ulid';
import { prisma } from '../config/db.js';
import { AuditService } from '../services/audit.service.js';

export class DoctorController {
  // Helper to parse time string "HH:MM" to minutes from midnight
  private static parseTimeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Helper to format minutes from midnight to "HH:MM"
  private static formatMinutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  // Helper to generate time slots
  private static generateSlots(startTimeStr: string, endTimeStr: string, durationMins: number): string[] {
    const slots: string[] = [];
    const startMins = this.parseTimeToMinutes(startTimeStr);
    const endMins = this.parseTimeToMinutes(endTimeStr);
    
    let currentMins = startMins;
    while (currentMins + durationMins <= endMins) {
      slots.push(this.formatMinutesToTime(currentMins));
      currentMins += durationMins;
    }
    return slots;
  }

  // Availability algorithm
  static async getDoctorAvailableSlots(doctorId: string, dateStr: string): Promise<any[]> {
    const targetDate = new Date(dateStr);
    // 0 = Sunday, ..., 6 = Saturday
    const dayOfWeek = targetDate.getDay();

    // 1. Get doctor details
    const doctor = await prisma.doctor.findFirst({
      where: { id: doctorId, isActive: true, deletedAt: null },
    });
    if (!doctor) return [];

    // 2. Check weekly schedule
    const schedule = await prisma.doctorSchedule.findFirst({
      where: { doctorId, dayOfWeek, isActive: true },
    });
    if (!schedule) return [];

    // 3. Check approved leaves
    const onLeave = await prisma.doctorLeave.findFirst({
      where: {
        doctorId,
        status: 'APPROVED',
        startDate: { lte: targetDate },
        endDate: { gte: targetDate },
      },
    });
    if (onLeave) return [];

    // 4. Check hospital holidays
    const holidays = await prisma.holiday.findMany({
      where: { hospitalId: doctor.hospitalId },
    });
    const isHoliday = holidays.some((h) => {
      const hDate = new Date(h.date);
      if (h.isRecurring) {
        return hDate.getMonth() === targetDate.getMonth() && hDate.getDate() === targetDate.getDate();
      }
      return (
        hDate.getFullYear() === targetDate.getFullYear() &&
        hDate.getMonth() === targetDate.getMonth() &&
        hDate.getDate() === targetDate.getDate()
      );
    });
    if (isHoliday) return [];

    // 5. Generate slots
    const slotDuration = doctor.slotDurationMins || 30;
    const allSlots = this.generateSlots(schedule.startTime, schedule.endTime, slotDuration);

    // 6. Get booked slots
    const bookedAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: targetDate,
        status: { in: ['REQUESTED', 'CONFIRMED', 'IN_CONSULTATION'] },
      },
      select: { appointmentTime: true },
    });
    const bookedTimes = new Set(bookedAppointments.map((a) => a.appointmentTime));

    // 7. Format slot list
    return allSlots.map((time) => {
      const [hours, minutes] = time.split(':').map(Number);
      const suffix = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayTime = `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${suffix}`;
      
      return {
        time,
        displayTime,
        isAvailable: !bookedTimes.has(time),
      };
    });
  }

  // Express handlers
  static async create(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId || undefined;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context required' });
    }

    const {
      userId,
      departmentId,
      registrationNo,
      specialization,
      subSpecialization,
      qualification,
      experienceYears,
      bio,
      profilePhotoUrl,
      consultationFee,
      followUpFee,
      slotDurationMins,
    } = req.body;

    if (!userId || !departmentId || !registrationNo || !specialization || !qualification) {
      return res.status(400).json({ error: 'Missing required professional details' });
    }

    try {
      const existingProfile = await prisma.doctor.findUnique({
        where: { userId },
      });
      if (existingProfile) {
        return res.status(400).json({ error: 'Doctor profile already exists for this user' });
      }

      const id = `doc_${ulid().toLowerCase()}`;
      const doctor = await prisma.doctor.create({
        data: {
          id,
          userId,
          hospitalId,
          departmentId,
          registrationNo,
          specialization,
          subSpecialization,
          qualification,
          experienceYears: experienceYears ? parseInt(experienceYears) : 0,
          bio,
          profilePhotoUrl,
          consultationFee: consultationFee || 0,
          followUpFee: followUpFee || 0,
          slotDurationMins: slotDurationMins || 30,
          isAvailable: true,
          isActive: true,
        },
      });

      // Default weekly schedules: Mon-Fri 09:00 - 17:00
      const defaultSchedules = [];
      for (let i = 1; i <= 5; i++) {
        defaultSchedules.push({
          id: `ds_${ulid().toLowerCase()}`,
          doctorId: id,
          dayOfWeek: i,
          startTime: '09:00',
          endTime: '17:00',
          maxPatients: 20,
          isActive: true,
        });
      }
      await prisma.doctorSchedule.createMany({
        data: defaultSchedules,
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'CREATE_DOCTOR_PROFILE',
        entityType: 'DOCTOR',
        entityId: id,
        description: `Created doctor profile for user ${userId} (${registrationNo})`,
        ipAddress: req.ip,
      });

      return res.status(201).json(doctor);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async list(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId || undefined;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context required' });
    }

    const { departmentId, specialization, search, userId } = req.query;

    try {
      const whereClause: any = {
        hospitalId,
        isActive: true,
        deletedAt: null,
      };

      if (userId) {
        whereClause.userId = userId as string;
      }

      if (departmentId) {
        whereClause.departmentId = departmentId as string;
      }

      if (specialization) {
        whereClause.specialization = { contains: specialization as string, mode: 'insensitive' };
      }

      if (search) {
        whereClause.user = {
          OR: [
            { firstName: { contains: search as string, mode: 'insensitive' } },
            { lastName: { contains: search as string, mode: 'insensitive' } },
          ],
        };
      }

      const doctors = await prisma.doctor.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          department: {
            select: {
              name: true,
            },
          },
        },
      });

      return res.status(200).json(doctors);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getById(req: Request, res: Response) {
    const id = req.params.id as string;
    const hospitalId = req.user?.hospitalId || undefined;

    try {
      const doctor = await prisma.doctor.findFirst({
        where: { id, hospitalId, deletedAt: null },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          department: true,
          schedules: true,
          leaves: true,
        },
      });

      if (!doctor) {
        return res.status(404).json({ error: 'Doctor profile not found' });
      }

      return res.status(200).json(doctor);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async update(req: Request, res: Response) {
    const id = req.params.id as string;
    const hospitalId = req.user?.hospitalId || undefined;
    const updateData = { ...req.body };

    try {
      const doctor = await prisma.doctor.findFirst({
        where: { id, hospitalId, deletedAt: null },
      });

      if (!doctor) {
        return res.status(404).json({ error: 'Doctor profile not found' });
      }

      delete updateData.id;
      delete updateData.userId;
      delete updateData.hospitalId;

      if (updateData.consultationFee !== undefined) updateData.consultationFee = parseFloat(updateData.consultationFee);
      if (updateData.followUpFee !== undefined) updateData.followUpFee = parseFloat(updateData.followUpFee);
      if (updateData.experienceYears !== undefined) updateData.experienceYears = parseInt(updateData.experienceYears);
      if (updateData.slotDurationMins !== undefined) updateData.slotDurationMins = parseInt(updateData.slotDurationMins);

      const updated = await prisma.doctor.update({
        where: { id },
        data: updateData,
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'UPDATE_DOCTOR_PROFILE',
        entityType: 'DOCTOR',
        entityId: id,
        description: `Updated doctor profile details for id ${id}`,
        ipAddress: req.ip,
      });

      return res.status(200).json(updated);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getSchedule(req: Request, res: Response) {
    const doctorId = req.params.id as string;
    try {
      const schedules = await prisma.doctorSchedule.findMany({
        where: { doctorId },
        orderBy: { dayOfWeek: 'asc' },
      });
      return res.status(200).json(schedules);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async setSchedule(req: Request, res: Response) {
    const doctorId = req.params.id as string;
    const { schedules } = req.body; // Array of { dayOfWeek, startTime, endTime, isActive }

    if (!Array.isArray(schedules)) {
      return res.status(400).json({ error: 'Schedules must be an array' });
    }

    try {
      // Clear old schedule
      await prisma.doctorSchedule.deleteMany({
        where: { doctorId },
      });

      const data = schedules.map((s) => ({
        id: `ds_${ulid().toLowerCase()}`,
        doctorId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isActive: s.isActive ?? true,
        maxPatients: s.maxPatients ?? 20,
      }));

      await prisma.doctorSchedule.createMany({
        data,
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId: req.user?.hospitalId || undefined,
        action: 'UPDATE_DOCTOR_SCHEDULE',
        entityType: 'DOCTOR',
        entityId: doctorId,
        description: `Updated weekly availability schedule for doctor id ${doctorId}`,
        ipAddress: req.ip,
      });

      return res.status(200).json({ message: 'Schedules updated successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getAvailability(req: Request, res: Response) {
    const doctorId = req.params.id as string;
    const dateStr = req.query.date as string;

    if (!dateStr) {
      return res.status(400).json({ error: 'Date query parameter (?date=YYYY-MM-DD) is required' });
    }

    try {
      const slots = await DoctorController.getDoctorAvailableSlots(doctorId, dateStr);
      return res.status(200).json({ slots });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getLeaves(req: Request, res: Response) {
    const doctorId = req.params.id as string;
    try {
      const leaves = await prisma.doctorLeave.findMany({
        where: { doctorId },
        orderBy: { startDate: 'desc' },
      });
      return res.status(200).json(leaves);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async applyLeave(req: Request, res: Response) {
    const doctorId = req.params.id as string;
    const hospitalId = req.user?.hospitalId || undefined;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context required' });
    }

    const { startDate, endDate, reason, leaveType } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    try {
      const id = `lv_${ulid().toLowerCase()}`;
      const leave = await prisma.doctorLeave.create({
        data: {
          id,
          doctorId,
          hospitalId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          reason,
          leaveType: leaveType || 'PERSONAL',
          status: 'APPROVED', // Auto-approved for now, simple leaves
          approvedBy: req.user?.id,
        },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'CREATE_DOCTOR_LEAVE',
        entityType: 'DOCTOR',
        entityId: doctorId,
        description: `Applied leave for doctor id ${doctorId} from ${startDate} to ${endDate}`,
        ipAddress: req.ip,
      });

      return res.status(201).json(leave);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async cancelLeave(req: Request, res: Response) {
    const leaveId = req.params.leaveId as string;
    const hospitalId = req.user?.hospitalId || undefined;

    try {
      const leave = await prisma.doctorLeave.findFirst({
        where: { id: leaveId, hospitalId },
      });

      if (!leave) {
        return res.status(404).json({ error: 'Leave record not found' });
      }

      await prisma.doctorLeave.update({
        where: { id: leaveId },
        data: { status: 'REJECTED' }, // Mark as rejected/cancelled
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'CANCEL_DOCTOR_LEAVE',
        entityType: 'DOCTOR',
        entityId: leave.doctorId,
        description: `Cancelled leave id ${leaveId} for doctor ${leave.doctorId}`,
        ipAddress: req.ip,
      });

      return res.status(200).json({ message: 'Leave cancelled successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
