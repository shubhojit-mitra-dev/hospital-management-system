import { Request, Response } from 'express';
import { ulid } from 'ulid';
import { prisma } from '../config/db.js';
import { AuditService } from '../services/audit.service.js';

export class StaffController {
  static async create(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId || undefined;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context required' });
    }

    const {
      userId,
      departmentId,
      designation,
      qualification,
      experienceYears,
      assignedDoctorId,
      wardAssignment,
      joinDate,
    } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    try {
      const existingProfile = await prisma.staff.findUnique({
        where: { userId },
      });
      if (existingProfile) {
        return res.status(400).json({ error: 'Staff profile already exists for this user' });
      }

      const count = await prisma.staff.count({
        where: { hospitalId },
      });
      const employeeId = `EMP-${String(count + 1).padStart(8, '0')}`;
      const id = `stf_${ulid().toLowerCase()}`;

      const staff = await prisma.staff.create({
        data: {
          id,
          userId,
          hospitalId,
          departmentId,
          employeeId,
          designation,
          qualification,
          experienceYears: experienceYears ? parseInt(experienceYears) : 0,
          assignedDoctorId,
          wardAssignment,
          joinDate: joinDate ? new Date(joinDate) : null,
          isActive: true,
        },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'CREATE_STAFF_PROFILE',
        entityType: 'STAFF',
        entityId: id,
        description: `Created staff profile for user ${userId} (${employeeId})`,
        ipAddress: req.ip,
      });

      return res.status(201).json(staff);
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

    const { designation, departmentId } = req.query;

    try {
      const whereClause: any = {
        hospitalId,
        isActive: true,
        deletedAt: null,
      };

      if (designation) {
        whereClause.designation = designation as string;
      }
      if (departmentId) {
        whereClause.departmentId = departmentId as string;
      }

      const staff = await prisma.staff.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              role: true,
            },
          },
          department: {
            select: {
              name: true,
            },
          },
          assignedDoctor: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      return res.status(200).json(staff);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getById(req: Request, res: Response) {
    const id = req.params.id as string;
    const hospitalId = req.user?.hospitalId || undefined;

    try {
      const staff = await prisma.staff.findFirst({
        where: { id, hospitalId, deletedAt: null },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              role: true,
            },
          },
          department: true,
          assignedDoctor: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!staff) {
        return res.status(404).json({ error: 'Staff profile not found' });
      }

      return res.status(200).json(staff);
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
      const staff = await prisma.staff.findFirst({
        where: { id, hospitalId, deletedAt: null },
      });

      if (!staff) {
        return res.status(404).json({ error: 'Staff profile not found' });
      }

      delete updateData.id;
      delete updateData.userId;
      delete updateData.hospitalId;
      delete updateData.employeeId;

      if (updateData.experienceYears !== undefined) updateData.experienceYears = parseInt(updateData.experienceYears);
      if (updateData.joinDate) updateData.joinDate = new Date(updateData.joinDate);

      const updated = await prisma.staff.update({
        where: { id },
        data: updateData,
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'UPDATE_STAFF_PROFILE',
        entityType: 'STAFF',
        entityId: id,
        description: `Updated staff profile details for id ${id}`,
        ipAddress: req.ip,
      });

      return res.status(200).json(updated);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async delete(req: Request, res: Response) {
    const id = req.params.id as string;
    const hospitalId = req.user?.hospitalId || undefined;

    try {
      const staff = await prisma.staff.findFirst({
        where: { id, hospitalId, deletedAt: null },
      });

      if (!staff) {
        return res.status(404).json({ error: 'Staff profile not found' });
      }

      await prisma.staff.update({
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
        action: 'DELETE_STAFF_PROFILE',
        entityType: 'STAFF',
        entityId: id,
        description: `Soft deleted staff profile for id ${id}`,
        ipAddress: req.ip,
      });

      return res.status(200).json({ message: 'Staff profile deleted successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
