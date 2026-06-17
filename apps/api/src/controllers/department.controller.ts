import { Request, Response } from 'express';
import { ulid } from 'ulid';
import { prisma } from '../config/db.js';
import { AuditService } from '../services/audit.service.js';

export class DepartmentController {
  static async create(req: Request, res: Response) {
    const hospitalId = req.params.hospitalId as string;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Department name is required' });
    }

    try {
      const hospital = await prisma.hospital.findFirst({
        where: { id: hospitalId, deletedAt: null },
      });

      if (!hospital) {
        return res.status(404).json({ error: 'Hospital not found' });
      }

      const id = `dept_${ulid().toLowerCase()}`;
      const code = name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
      
      const department = await prisma.department.create({
        data: {
          id,
          hospitalId,
          name,
          code,
          description,
          isActive: true,
        },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'CREATE_DEPARTMENT',
        entityType: 'DEPARTMENT',
        entityId: id,
        description: `Created department ${name} (${id}) under hospital ${hospitalId}`,
        ipAddress: req.ip,
      });

      return res.status(201).json(department);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async list(req: Request, res: Response) {
    const hospitalId = req.params.hospitalId as string;

    try {
      const departments = await prisma.department.findMany({
        where: { hospitalId, isActive: true },
      });

      return res.status(200).json(departments);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getById(req: Request, res: Response) {
    const hospitalId = req.params.hospitalId as string;
    const id = req.params.id as string;

    try {
      const department = await prisma.department.findFirst({
        where: { id, hospitalId, isActive: true },
      });

      if (!department) {
        return res.status(404).json({ error: 'Department not found' });
      }

      return res.status(200).json(department);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async update(req: Request, res: Response) {
    const hospitalId = req.params.hospitalId as string;
    const id = req.params.id as string;
    const { name, description } = req.body;

    try {
      const department = await prisma.department.findFirst({
        where: { id, hospitalId, isActive: true },
      });

      if (!department) {
        return res.status(404).json({ error: 'Department not found' });
      }

      const updated = await prisma.department.update({
        where: { id },
        data: { name, description },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'UPDATE_DEPARTMENT',
        entityType: 'DEPARTMENT',
        entityId: id,
        description: `Updated department ${id}`,
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
      const department = await prisma.department.findFirst({
        where: { id, hospitalId, isActive: true },
      });

      if (!department) {
        return res.status(404).json({ error: 'Department not found' });
      }

      await prisma.department.update({
        where: { id },
        data: { isActive: false },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'DELETE_DEPARTMENT',
        entityType: 'DEPARTMENT',
        entityId: id,
        description: `Deleted department ${id}`,
        ipAddress: req.ip,
      });

      return res.status(200).json({ message: 'Department soft deleted successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
