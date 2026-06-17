import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { ulid } from 'ulid';
import { prisma } from '../config/db.js';
import { AuditService } from '../services/audit.service.js';

const DEFAULT_DEPARTMENTS = [
  'Cardiology',
  'Dermatology',
  'Emergency Medicine',
  'Endocrinology',
  'Gastroenterology',
  'General Surgery',
  'Gynecology',
  'Hematology',
  'Internal Medicine',
  'Neurology',
  'Oncology',
  'Ophthalmology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'Urology'
];

export class HospitalController {
  static async create(req: Request, res: Response) {
    const {
      name,
      registrationNo,
      address,
      city,
      state,
      country,
      adminEmail,
      adminPassword,
      adminFirstName,
      adminLastName,
      adminPhone
    } = req.body;

    if (!name || !adminEmail || !adminPassword || !adminFirstName || !adminLastName) {
      return res.status(400).json({ error: 'Missing required hospital or admin parameters' });
    }

    try {
      const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
      if (existingUser) {
        return res.status(400).json({ error: 'Admin email is already in use' });
      }

      const hospitalId = `hosp_${ulid().toLowerCase()}`;
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const adminId = `usr_${ulid().toLowerCase()}`;

      const result = await prisma.$transaction(async (tx) => {
        const hospital = await tx.hospital.create({
          data: {
            id: hospitalId,
            name,
            registrationNo,
            address,
            city,
            state,
            country,
            isActive: true,
          },
        });

        // Spawn departments with a generated code
        const deptsData = DEFAULT_DEPARTMENTS.map(deptName => {
          const code = deptName.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
          return {
            id: `dept_${ulid().toLowerCase()}`,
            hospitalId: hospital.id,
            name: deptName,
            code,
            description: `Default ${deptName} Department`,
          };
        });

        for (const dept of deptsData) {
          await tx.department.create({ data: dept });
        }

        // Spawn admin
        const admin = await tx.user.create({
          data: {
            id: adminId,
            hospitalId: hospital.id,
            email: adminEmail,
            passwordHash,
            role: 'HOSPITAL_ADMIN',
            firstName: adminFirstName,
            lastName: adminLastName,
            phone: adminPhone || null,
            isVerified: true,
            isActive: true,
            forcePasswordChange: true,
          },
        });

        return { hospital, admin };
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'CREATE_HOSPITAL',
        entityType: 'HOSPITAL',
        entityId: hospitalId,
        description: `Created hospital ${name} (${hospitalId}) and admin ${adminEmail}`,
        ipAddress: req.ip,
      });

      return res.status(201).json({
        message: 'Hospital created successfully with default departments and admin account.',
        hospital: result.hospital,
        admin: {
          id: result.admin.id,
          email: result.admin.email,
          role: result.admin.role,
        }
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const whereClause: any = { deletedAt: null };
      if (req.user?.role !== 'SUPER_ADMIN') {
        if (!req.user?.hospitalId) {
          return res.status(403).json({ error: 'Forbidden: Access denied' });
        }
        whereClause.id = req.user.hospitalId;
      }

      const hospitals = await prisma.hospital.findMany({ where: whereClause });
      return res.status(200).json(hospitals);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getById(req: Request, res: Response) {
    const id = req.params.id as string;

    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.hospitalId !== id) {
      return res.status(403).json({ error: 'Forbidden: Access restricted to your hospital' });
    }

    try {
      const hospital = await prisma.hospital.findFirst({
        where: { id, deletedAt: null },
      });

      if (!hospital) {
        return res.status(404).json({ error: 'Hospital not found' });
      }

      return res.status(200).json(hospital);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async update(req: Request, res: Response) {
    const id = req.params.id as string;
    const { name, registrationNo, address, city, state, country, isActive } = req.body;

    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.hospitalId !== id) {
      return res.status(403).json({ error: 'Forbidden: Access restricted to your hospital' });
    }

    try {
      const hospital = await prisma.hospital.findFirst({
        where: { id, deletedAt: null },
      });

      if (!hospital) {
        return res.status(404).json({ error: 'Hospital not found' });
      }

      const updated = await prisma.hospital.update({
        where: { id },
        data: { name, registrationNo, address, city, state, country, isActive },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId: id,
        action: 'UPDATE_HOSPITAL',
        entityType: 'HOSPITAL',
        entityId: id,
        description: `Updated hospital ${id}`,
        ipAddress: req.ip,
      });

      return res.status(200).json(updated);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async activate(req: Request, res: Response) {
    const id = req.params.id as string;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    // Only SUPER_ADMIN can toggle hospital status
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    try {
      const hospital = await prisma.hospital.findFirst({
        where: { id, deletedAt: null },
      });

      if (!hospital) {
        return res.status(404).json({ error: 'Hospital not found' });
      }

      const updated = await prisma.hospital.update({
        where: { id },
        data: { isActive },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId: id,
        action: isActive ? 'ACTIVATE_HOSPITAL' : 'DEACTIVATE_HOSPITAL',
        entityType: 'HOSPITAL',
        entityId: id,
        description: `${isActive ? 'Activated' : 'Deactivated'} hospital ${id}`,
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

    // Only SUPER_ADMIN can delete hospitals
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    try {
      const hospital = await prisma.hospital.findFirst({
        where: { id, deletedAt: null },
      });

      if (!hospital) {
        return res.status(404).json({ error: 'Hospital not found' });
      }

      await prisma.hospital.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId: id,
        action: 'DELETE_HOSPITAL',
        entityType: 'HOSPITAL',
        entityId: id,
        description: `Deleted hospital ${id}`,
        ipAddress: req.ip,
      });

      return res.status(200).json({ message: 'Hospital soft deleted successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
