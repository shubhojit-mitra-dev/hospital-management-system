import { ulid } from 'ulid';
import { prisma } from '../config/db.js';

export class AuditService {
  static async recordLog(options: {
    actorId?: string;
    actorRole?: string;
    hospitalId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    description: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
  }): Promise<void> {
    await prisma.auditLog.create({
      data: {
        id: `aud_${ulid().toLowerCase()}`,
        actorId: options.actorId,
        actorRole: options.actorRole,
        hospitalId: options.hospitalId,
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId,
        description: options.description,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        metadata: options.metadata || undefined,
      },
    });
  }
}
