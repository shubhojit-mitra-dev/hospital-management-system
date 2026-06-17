import { Request, Response } from 'express';
import { ulid } from 'ulid';
import { prisma } from '../config/db.js';
import { AuditService } from '../services/audit.service.js';

export class HolidayController {
  static async create(req: Request, res: Response) {
    const hospitalId = req.params.hospitalId as string;
    const { name, date, isRecurring } = req.body;

    if (!name || !date) {
      return res.status(400).json({ error: 'Holiday name and date are required' });
    }

    try {
      const hospital = await prisma.hospital.findFirst({
        where: { id: hospitalId, deletedAt: null },
      });

      if (!hospital) {
        return res.status(404).json({ error: 'Hospital not found' });
      }

      const id = `holi_${ulid().toLowerCase()}`;
      const holiday = await prisma.holiday.create({
        data: {
          id,
          hospitalId,
          name,
          date: new Date(date),
          isRecurring: isRecurring || false,
          createdAt: new Date(),
        },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'CREATE_HOLIDAY',
        entityType: 'HOLIDAY',
        entityId: id,
        description: `Created holiday ${name} (${id}) for hospital ${hospitalId}`,
        ipAddress: req.ip,
      });

      return res.status(201).json(holiday);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async list(req: Request, res: Response) {
    const hospitalId = req.params.hospitalId as string;

    try {
      const holidays = await prisma.holiday.findMany({
        where: { hospitalId },
      });

      return res.status(200).json(holidays);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getById(req: Request, res: Response) {
    const hospitalId = req.params.hospitalId as string;
    const id = req.params.id as string;

    try {
      const holiday = await prisma.holiday.findFirst({
        where: { id, hospitalId },
      });

      if (!holiday) {
        return res.status(404).json({ error: 'Holiday not found' });
      }

      return res.status(200).json(holiday);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async update(req: Request, res: Response) {
    const hospitalId = req.params.hospitalId as string;
    const id = req.params.id as string;
    const { name, date, isRecurring } = req.body;

    try {
      const holiday = await prisma.holiday.findFirst({
        where: { id, hospitalId },
      });

      if (!holiday) {
        return res.status(404).json({ error: 'Holiday not found' });
      }

      const updated = await prisma.holiday.update({
        where: { id },
        data: {
          name,
          date: date ? new Date(date) : undefined,
          isRecurring: typeof isRecurring === 'boolean' ? isRecurring : undefined,
        },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'UPDATE_HOLIDAY',
        entityType: 'HOLIDAY',
        entityId: id,
        description: `Updated holiday ${id}`,
        ipAddress: req.ip,
      });

      return res.status(200).json(updated);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async delete(req: Request, res: Response) {
    const hospitalId = req.params.hospitalId as string;
    const id = req.params.id as string;

    try {
      const holiday = await prisma.holiday.findFirst({
        where: { id, hospitalId },
      });

      if (!holiday) {
        return res.status(404).json({ error: 'Holiday not found' });
      }

      await prisma.holiday.delete({
        where: { id },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'DELETE_HOLIDAY',
        entityType: 'HOLIDAY',
        entityId: id,
        description: `Deleted holiday ${id}`,
        ipAddress: req.ip,
      });

      return res.status(200).json({ message: 'Holiday deleted successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
