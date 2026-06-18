import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { ulid } from 'ulid';
import crypto from 'crypto';
import { prisma } from '../config/db.js';
import { EmailService } from '../services/email.service.js';
import { AuditService } from '../services/audit.service.js';

export class AdminController {
  static async createStaff(req: Request, res: Response) {
    const { email, firstName, lastName, role, phone, hospitalId } = req.body;

    if (!email || !firstName || !lastName || !role || !hospitalId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (!['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PHARMACIST', 'BILLING_EXECUTIVE', 'STAFF'].includes(role)) {
      return res.status(400).json({ error: 'Invalid staff role' });
    }

    // Check access permission constraints
    if (req.user!.role === 'HOSPITAL_ADMIN' && req.user!.hospitalId !== hospitalId) {
      return res.status(403).json({ error: 'Forbidden: Cannot add staff to another hospital' });
    }

    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const tempPassword = crypto.randomBytes(8).toString('hex') + 'A1!';
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      const userId = `usr_${ulid().toLowerCase()}`;

      await prisma.user.create({
        data: {
          id: userId,
          hospitalId,
          email,
          passwordHash,
          role,
          firstName,
          lastName,
          phone,
          isVerified: true, // Auto-verify staff
          isActive: true,
          forcePasswordChange: true,
        },
      });

      await EmailService.sendEmail({
        to: email,
        subject: 'Welcome to HMS - Staff Account Created',
        text: `Your staff account has been created.\nEmail: ${email}\nTemporary Password: ${tempPassword}\nPlease log in and change your password immediately.`,
      });

      await AuditService.recordLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        hospitalId: hospitalId || undefined,
        action: 'CREATE_STAFF',
        entityType: 'USER',
        entityId: userId,
        description: `Created staff user ${email} with role ${role}`,
        ipAddress: req.ip,
      });

      return res.status(201).json({ message: 'Staff user created successfully. Welcome email sent.', userId });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async listStaff(req: Request, res: Response) {
    const hospitalId = (req.user!.role === 'SUPER_ADMIN' ? req.query.hospitalId : req.user!.hospitalId) as string | undefined;

    const whereClause: any = {
      role: { in: ['HOSPITAL_ADMIN', 'DOCTOR', 'STAFF'] },
      deletedAt: null,
    };

    if (hospitalId) {
      whereClause.hospitalId = hospitalId;
    }

    try {
      const staff = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          isActive: true,
          hospitalId: true,
          createdAt: true,
        },
      });

      return res.status(200).json(staff);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getStaffDetails(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
      const user = await prisma.user.findFirst({
        where: { id, deletedAt: null },
      });

      if (!user) {
        return res.status(404).json({ error: 'Staff user not found' });
      }

      if (req.user!.role === 'HOSPITAL_ADMIN' && req.user!.hospitalId !== user.hospitalId) {
        return res.status(403).json({ error: 'Forbidden: Access denied to staff of other hospitals' });
      }

      return res.status(200).json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
        hospitalId: user.hospitalId,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateStaff(req: Request, res: Response) {
    const id = req.params.id as string;
    const { firstName, lastName, phone } = req.body;

    try {
      const user = await prisma.user.findFirst({
        where: { id, deletedAt: null },
      });

      if (!user) {
        return res.status(404).json({ error: 'Staff user not found' });
      }

      if (req.user!.role === 'HOSPITAL_ADMIN' && req.user!.hospitalId !== user.hospitalId) {
        return res.status(403).json({ error: 'Forbidden: Access denied' });
      }

      await prisma.user.update({
        where: { id },
        data: { firstName, lastName, phone },
      });

      await AuditService.recordLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        hospitalId: user.hospitalId || undefined,
        action: 'UPDATE_STAFF',
        entityType: 'USER',
        entityId: id,
        description: `Updated staff profile details for ${user.email}`,
        ipAddress: req.ip,
      });

      return res.status(200).json({ message: 'Staff profile updated successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async toggleStaffStatus(req: Request, res: Response) {
    const id = req.params.id as string;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive status must be a boolean value' });
    }

    try {
      const user = await prisma.user.findFirst({
        where: { id, deletedAt: null },
      });

      if (!user) {
        return res.status(404).json({ error: 'Staff user not found' });
      }

      if (req.user!.role === 'HOSPITAL_ADMIN' && req.user!.hospitalId !== user.hospitalId) {
        return res.status(403).json({ error: 'Forbidden: Access denied' });
      }

      await prisma.user.update({
        where: { id },
        data: { isActive },
      });

      await AuditService.recordLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        hospitalId: user.hospitalId || undefined,
        action: isActive ? 'ACTIVATE_STAFF' : 'DEACTIVATE_STAFF',
        entityType: 'USER',
        entityId: id,
        description: `${isActive ? 'Activated' : 'Deactivated'} staff user account for ${user.email}`,
        ipAddress: req.ip,
      });

      return res.status(200).json({ message: `Staff user account ${isActive ? 'activated' : 'deactivated'} successfully` });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async deleteStaff(req: Request, res: Response) {
    const id = req.params.id as string;

    try {
      const user = await prisma.user.findFirst({
        where: { id, deletedAt: null },
      });

      if (!user) {
        return res.status(404).json({ error: 'Staff user not found' });
      }

      if (req.user!.role === 'HOSPITAL_ADMIN' && req.user!.hospitalId !== user.hospitalId) {
        return res.status(403).json({ error: 'Forbidden: Access denied' });
      }

      await prisma.user.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });

      await AuditService.recordLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        hospitalId: user.hospitalId || undefined,
        action: 'DELETE_STAFF',
        entityType: 'USER',
        entityId: id,
        description: `Soft deleted staff user account for ${user.email}`,
        ipAddress: req.ip,
      });

      return res.status(200).json({ message: 'Staff user soft deleted successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
