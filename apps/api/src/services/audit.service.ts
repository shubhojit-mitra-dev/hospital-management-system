import { prisma } from '../config/db.js';

export class AuditService {
  static async recordLog(options: { userId?: string; action: string; details?: string; ipAddress?: string }): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId: options.userId,
        action: options.action,
        details: options.details,
        ipAddress: options.ipAddress,
      },
    });
  }
}
