import { Request, Response } from 'express';
import { ulid } from 'ulid';
import { prisma } from '../config/db.js';
import { DoctorController } from './doctor.controller.js';
import { AuditService } from '../services/audit.service.js';
import { NotificationService } from '../services/notification.service.js';

export class AppointmentController {
  static async book(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context required' });
    }

    const {
      patientId,
      doctorId,
      departmentId,
      appointmentDate,
      appointmentTime,
      appointmentType,
      chiefComplaint,
      notes,
    } = req.body;

    if (!patientId || !doctorId || !departmentId || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ error: 'Missing required parameters: patientId, doctorId, departmentId, appointmentDate, appointmentTime' });
    }

    try {
      const targetDate = new Date(appointmentDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (targetDate < today) {
        return res.status(400).json({ error: 'Cannot book appointments in the past' });
      }

      // 1. Verify doctor availability slots for that date
      const availableSlots = await DoctorController.getDoctorAvailableSlots(doctorId, appointmentDate);
      const slot = availableSlots.find((s) => s.time === appointmentTime);

      if (!slot) {
        return res.status(400).json({ error: 'Doctor is not available at the selected date or time' });
      }
      if (!slot.isAvailable) {
        return res.status(400).json({ error: 'Selected slot is already booked' });
      }

      // 2. Generate daily token number for doctor
      const dailyCount = await prisma.appointment.count({
        where: {
          doctorId,
          appointmentDate: targetDate,
        },
      });
      const tokenNumber = dailyCount + 1;

      // 3. Create appointment
      const id = `apt_${ulid().toLowerCase()}`;
      const appointment = await prisma.appointment.create({
        data: {
          id,
          hospitalId,
          patientId,
          doctorId,
          departmentId,
          appointmentType: appointmentType || 'NEW',
          status: 'REQUESTED',
          appointmentDate: targetDate,
          appointmentTime,
          chiefComplaint,
          notes,
          bookedBy: req.user?.id,
          tokenNumber,
        },
        include: {
          patient: true,
          doctor: {
            include: {
              user: true,
            },
          },
          department: true,
        },
      });

      // 4. Initialize appointment queue record for daily tracking
      await prisma.appointmentQueue.create({
        data: {
          id: `q_${ulid().toLowerCase()}`,
          hospitalId,
          doctorId,
          queueDate: targetDate,
          appointmentId: id,
          tokenNumber,
          queueStatus: 'WAITING',
        },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'BOOK_APPOINTMENT',
        entityType: 'APPOINTMENT',
        entityId: id,
        description: `Booked appointment for patient id ${patientId} with doctor id ${doctorId} (Token #${tokenNumber})`,
        ipAddress: req.ip,
      });

      // Dispatch notifications
      if (appointment.patient?.userId) {
        await NotificationService.send({
          hospitalId,
          eventType: 'APPOINTMENT_BOOKED',
          recipients: [appointment.patient.userId],
          title: 'Appointment Booked Successfully',
          body: `Your appointment with Dr. ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName} has been booked for ${appointmentDate} at ${appointmentTime}. (Token #${tokenNumber})`,
          entityType: 'appointment',
          entityId: id,
          actionUrl: `/appointments`,
          templateData: {
            doctorName: `Dr. ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName}`,
            date: targetDate.toLocaleDateString(),
            time: appointmentTime,
            tokenNumber: tokenNumber.toString()
          }
        });
      }

      if (appointment.doctor?.userId) {
        await NotificationService.send({
          hospitalId,
          eventType: 'NEW_APPOINTMENT',
          recipients: [appointment.doctor.userId],
          title: 'New Appointment Assigned',
          body: `A new appointment has been booked by ${appointment.patient.firstName} ${appointment.patient.lastName} for ${appointmentDate} at ${appointmentTime}. (Token #${tokenNumber})`,
          entityType: 'appointment',
          entityId: id,
          actionUrl: `/doctor/schedule`
        });
      }

      return res.status(201).json(appointment);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async list(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context required' });
    }

    const { doctorId, patientId, departmentId, status, date, dateFrom, dateTo } = req.query;

    try {
      const whereClause: any = {
        hospitalId,
      };

      if (doctorId) whereClause.doctorId = doctorId as string;
      if (patientId) whereClause.patientId = patientId as string;
      if (departmentId) whereClause.departmentId = departmentId as string;
      if (status) whereClause.status = status as string;
      
      if (date) {
        whereClause.appointmentDate = new Date(date as string);
      } else if (dateFrom && dateTo) {
        whereClause.appointmentDate = {
          gte: new Date(dateFrom as string),
          lte: new Date(dateTo as string),
        };
      }

      const appointments = await prisma.appointment.findMany({
        where: whereClause,
        include: {
          patient: true,
          doctor: {
            include: {
              user: true,
            },
          },
          department: true,
        },
        orderBy: [
          { appointmentDate: 'desc' },
          { appointmentTime: 'asc' },
        ],
      });

      return res.status(200).json(appointments);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getById(req: Request, res: Response) {
    const id = req.params.id as string;
    const hospitalId = req.user?.hospitalId as string;

    try {
      const appointment = await prisma.appointment.findFirst({
        where: { id, hospitalId },
        include: {
          patient: true,
          doctor: {
            include: {
              user: true,
            },
          },
          department: true,
        },
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      return res.status(200).json(appointment);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async confirm(req: Request, res: Response) {
    const id = req.params.id as string;
    const hospitalId = req.user?.hospitalId as string;

    try {
      const appointment = await prisma.appointment.findFirst({
        where: { id, hospitalId },
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      const updated = await prisma.appointment.update({
        where: { id },
        data: { status: 'CONFIRMED' },
        include: {
          patient: true,
          doctor: {
            include: {
              user: true,
            },
          },
        },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'CONFIRM_APPOINTMENT',
        entityType: 'APPOINTMENT',
        entityId: id,
        description: `Confirmed appointment id ${id}`,
        ipAddress: req.ip,
      });

      // Dispatch notifications
      if (updated.patient?.userId) {
        await NotificationService.send({
          hospitalId: hospitalId as string,
          eventType: 'APPOINTMENT_CONFIRMED',
          recipients: [updated.patient.userId],
          title: 'Appointment Confirmed',
          body: `Your appointment with Dr. ${updated.doctor.user.firstName} ${updated.doctor.user.lastName} on ${updated.appointmentDate.toLocaleDateString()} at ${updated.appointmentTime} is confirmed. (Token #${updated.tokenNumber})`,
          entityType: 'appointment',
          entityId: id,
          actionUrl: `/appointments`
        });
      }

      return res.status(200).json(updated);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async startConsultation(req: Request, res: Response) {
    const id = req.params.id as string;
    const hospitalId = req.user?.hospitalId as string;

    try {
      const appointment = await prisma.appointment.findFirst({
        where: { id, hospitalId },
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      const updated = await prisma.appointment.update({
        where: { id },
        data: { status: 'IN_CONSULTATION' },
      });

      // Update queue status
      await prisma.appointmentQueue.updateMany({
        where: { appointmentId: id },
        data: { queueStatus: 'IN_PROGRESS', calledAt: new Date() },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'START_CONSULTATION',
        entityType: 'APPOINTMENT',
        entityId: id,
        description: `Started consultation for appointment id ${id}`,
        ipAddress: req.ip,
      });

      return res.status(200).json(updated);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async complete(req: Request, res: Response) {
    const id = req.params.id as string;
    const hospitalId = req.user?.hospitalId as string;

    try {
      const appointment = await prisma.appointment.findFirst({
        where: { id, hospitalId },
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      const updated = await prisma.appointment.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });

      // Update queue status
      await prisma.appointmentQueue.updateMany({
        where: { appointmentId: id },
        data: { queueStatus: 'DONE', completedAt: new Date() },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'COMPLETE_APPOINTMENT',
        entityType: 'APPOINTMENT',
        entityId: id,
        description: `Completed appointment id ${id}`,
        ipAddress: req.ip,
      });

      return res.status(200).json(updated);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async cancel(req: Request, res: Response) {
    const id = req.params.id as string;
    const hospitalId = req.user?.hospitalId as string;
    const { reason } = req.body;

    try {
      const appointment = await prisma.appointment.findFirst({
        where: { id, hospitalId },
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      const updated = await prisma.appointment.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: req.user?.id,
          cancellationReason: reason,
        },
        include: {
          patient: true,
          doctor: {
            include: {
              user: true,
            },
          },
        },
      });

      // Update queue status to skipped/done
      await prisma.appointmentQueue.updateMany({
        where: { appointmentId: id },
        data: { queueStatus: 'SKIPPED' },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'CANCEL_APPOINTMENT',
        entityType: 'APPOINTMENT',
        entityId: id,
        description: `Cancelled appointment id ${id} (Reason: ${reason || 'None'})`,
        ipAddress: req.ip,
      });

      // Dispatch notifications
      if (updated.patient?.userId) {
        await NotificationService.send({
          hospitalId: hospitalId as string,
          eventType: 'APPOINTMENT_CANCELLED',
          recipients: [updated.patient.userId],
          title: 'Appointment Cancelled',
          body: `Your appointment with Dr. ${updated.doctor.user.firstName} ${updated.doctor.user.lastName} scheduled for ${updated.appointmentDate.toLocaleDateString()} has been cancelled. Reason: ${reason || 'Not specified'}.`,
          entityType: 'appointment',
          entityId: id,
          actionUrl: `/appointments`
        });
      }

      if (updated.doctor?.userId) {
        await NotificationService.send({
          hospitalId: hospitalId as string,
          eventType: 'APPOINTMENT_CANCELLED_DOCTOR',
          recipients: [updated.doctor.userId],
          title: 'Appointment Cancelled',
          body: `The appointment for ${updated.patient.firstName} ${updated.patient.lastName} on ${updated.appointmentDate.toLocaleDateString()} at ${updated.appointmentTime} has been cancelled.`,
          entityType: 'appointment',
          entityId: id,
          actionUrl: `/doctor/schedule`
        });
      }

      return res.status(200).json(updated);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async reschedule(req: Request, res: Response) {
    const id = req.params.id as string;
    const hospitalId = req.user?.hospitalId as string;
    const { newDate, newTime } = req.body;

    if (!newDate || !newTime) {
      return res.status(400).json({ error: 'New date and new time are required' });
    }

    try {
      const appointment = await prisma.appointment.findFirst({
        where: { id, hospitalId },
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      // Check slot availability
      const slots = await DoctorController.getDoctorAvailableSlots(appointment.doctorId, newDate);
      const slot = slots.find((s) => s.time === newTime);
      if (!slot || !slot.isAvailable) {
        return res.status(400).json({ error: 'Selected slot is not available' });
      }

      // Reschedule: mark old as RESCHEDULED, and book a new one
      await prisma.appointment.update({
        where: { id },
        data: { status: 'RESCHEDULED' },
      });

      const dailyCount = await prisma.appointment.count({
        where: { doctorId: appointment.doctorId, appointmentDate: new Date(newDate) },
      });
      const tokenNumber = dailyCount + 1;

      const newAptId = `apt_${ulid().toLowerCase()}`;
      const rescheduledApt = await prisma.appointment.create({
        data: {
          id: newAptId,
          hospitalId: hospitalId as string,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          departmentId: appointment.departmentId,
          appointmentType: appointment.appointmentType,
          status: 'CONFIRMED',
          appointmentDate: new Date(newDate),
          appointmentTime: newTime,
          chiefComplaint: appointment.chiefComplaint,
          notes: appointment.notes,
          rescheduledFromId: id,
          tokenNumber,
          bookedBy: req.user?.id,
        },
      });

      // Queue record
      await prisma.appointmentQueue.create({
        data: {
          id: `q_${ulid().toLowerCase()}`,
          hospitalId: hospitalId as string,
          doctorId: appointment.doctorId,
          queueDate: new Date(newDate),
          appointmentId: newAptId,
          tokenNumber,
          queueStatus: 'WAITING',
        },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'RESCHEDULE_APPOINTMENT',
        entityType: 'APPOINTMENT',
        entityId: id,
        description: `Rescheduled appointment id ${id} to new appointment id ${newAptId} on ${newDate} at ${newTime}`,
        ipAddress: req.ip,
      });

      return res.status(200).json(rescheduledApt);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getCalendarEvents(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context required' });
    }

    const { doctorId, month } = req.query; // month in format YYYY-MM

    try {
      const whereClause: any = {
        hospitalId,
      };

      if (doctorId) {
        whereClause.doctorId = doctorId as string;
      }

      if (month) {
        const parts = (month as string).split('-').map(Number);
        const year = parts[0] as number;
        const m = parts[1] as number;
        const start = new Date(year, m - 1, 1);
        const end = new Date(year, m, 0, 23, 59, 59, 999);
        whereClause.appointmentDate = {
          gte: start,
          lte: end,
        };
      }

      const appointments = await prisma.appointment.findMany({
        where: whereClause,
        include: {
          patient: true,
          doctor: {
            include: {
              user: true,
            },
          },
        },
      });

      const events = appointments.map((apt: any) => {
        // Color coding
        let color = '#FFC107'; // REQUESTED (amber)
        if (apt.status === 'CONFIRMED') color = '#2196F3'; // blue
        if (apt.status === 'IN_CONSULTATION') color = '#FF5722'; // deep orange
        if (apt.status === 'COMPLETED') color = '#4CAF50'; // green
        if (apt.status === 'CANCELLED') color = '#9E9E9E'; // grey
        if (apt.status === 'NO_SHOW') color = '#F44336'; // red

        const timeParts = apt.appointmentTime.split(':').map(Number);
        const hours = timeParts[0] as number;
        const mins = timeParts[1] as number;
        const startDatetime = new Date(apt.appointmentDate);
        startDatetime.setHours(hours, mins, 0, 0);

        const endDatetime = new Date(startDatetime);
        endDatetime.setMinutes(endDatetime.getMinutes() + 30); // Default 30 min duration

        return {
          id: apt.id,
          title: `${apt.patient.firstName} ${apt.patient.lastName} — ${apt.chiefComplaint || 'Consultation'}`,
          start: startDatetime.toISOString(),
          end: endDatetime.toISOString(),
          status: apt.status,
          doctor: `Dr. ${apt.doctor.user.firstName} ${apt.doctor.user.lastName}`,
          color,
        };
      });

      return res.status(200).json({ events });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getQueue(req: Request, res: Response) {
    const doctorId = req.params.doctorId as string;
    const hospitalId = req.user?.hospitalId as string;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const queue = await prisma.appointmentQueue.findMany({
        where: {
          doctorId,
          queueDate: today,
          appointment: {
            hospitalId,
          },
        },
        include: {
          appointment: {
            include: {
              patient: true,
            },
          },
        },
        orderBy: {
          tokenNumber: 'asc',
        },
      });

      const stats = {
        total: queue.length,
        waiting: queue.filter((q: any) => q.queueStatus === 'WAITING').length,
        inProgress: queue.filter((q: any) => q.queueStatus === 'IN_PROGRESS').length,
        completed: queue.filter((q: any) => q.queueStatus === 'DONE').length,
        skipped: queue.filter((q: any) => q.queueStatus === 'SKIPPED').length,
      };

      return res.status(200).json({
        date: today.toISOString().split('T')[0],
        queue,
        stats,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async callQueue(req: Request, res: Response) {
    const queueId = req.params.queueId as string;

    try {
      const queueRecord = await prisma.appointmentQueue.findUnique({
        where: { id: queueId },
      });

      if (!queueRecord) {
        return res.status(404).json({ error: 'Queue record not found' });
      }

      const updated = await prisma.appointmentQueue.update({
        where: { id: queueId },
        data: {
          queueStatus: 'IN_PROGRESS',
          calledAt: new Date(),
        },
      });

      // Update appointment status as well
      await prisma.appointment.update({
        where: { id: queueRecord.appointmentId },
        data: { status: 'IN_CONSULTATION' },
      });

      return res.status(200).json(updated);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
