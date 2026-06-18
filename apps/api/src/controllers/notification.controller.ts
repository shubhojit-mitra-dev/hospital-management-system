import { Request, Response } from 'express';
import { ulid } from 'ulid';
import { prisma } from '../config/db.js';
import { updateNotificationPreferencesSchema } from '@repo/types';

export class NotificationController {

  static async listNotifications(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;

    const { isRead, priority } = req.query;

    try {
      const whereClause: any = { userId };
      
      if (isRead !== undefined) {
        whereClause.isRead = isRead === 'true';
      }

      if (priority) {
        whereClause.priority = priority as string;
      }

      // Query notifications count and items in parallel
      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.notification.count({ where: whereClause })
      ]);

      const unreadCount = await prisma.notification.count({
        where: { userId, isRead: false }
      });

      return res.status(200).json({
        success: true,
        data: {
          notifications,
          meta: {
            page,
            limit,
            total,
            unreadCount
          }
        }
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getUnreadCount(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const unreadCount = await prisma.notification.count({
        where: { userId, isRead: false }
      });

      return res.status(200).json({
        success: true,
        data: { unreadCount }
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async markAsRead(req: Request, res: Response) {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const notification = await prisma.notification.findFirst({
        where: { id, userId }
      });

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      const updated = await prisma.notification.update({
        where: { id },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      return res.status(200).json({
        success: true,
        data: updated
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async markAllAsRead(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      return res.status(200).json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async deleteNotification(req: Request, res: Response) {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const notification = await prisma.notification.findFirst({
        where: { id, userId }
      });

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      await prisma.notification.delete({
        where: { id }
      });

      return res.status(200).json({
        success: true,
        message: 'Notification deleted'
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getPreferences(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      let pref = await prisma.notificationPreference.findUnique({
        where: { userId }
      });

      if (!pref) {
        // Automatically seed defaults
        pref = await prisma.notificationPreference.create({
          data: {
            id: `prf_${ulid().toLowerCase()}`,
            userId,
            emailEnabled: true,
            smsEnabled: true,
            inAppEnabled: true,
            eventPreferences: {}
          }
        });
      }

      return res.status(200).json({
        success: true,
        data: pref
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updatePreferences(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const parsed = updateNotificationPreferencesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid preferences payload', details: parsed.error.format() });
    }

    const {
      emailEnabled,
      smsEnabled,
      inAppEnabled,
      quietHoursEnabled,
      quietStart,
      quietEnd,
      eventPreferences
    } = parsed.data;

    try {
      // Find existing pref to get ID or upsert
      const existing = await prisma.notificationPreference.findUnique({
        where: { userId }
      });

      const updated = await prisma.notificationPreference.upsert({
        where: { userId },
        update: {
          emailEnabled: emailEnabled !== undefined ? emailEnabled : undefined,
          smsEnabled: smsEnabled !== undefined ? smsEnabled : undefined,
          inAppEnabled: inAppEnabled !== undefined ? inAppEnabled : undefined,
          quietHoursEnabled: quietHoursEnabled !== undefined ? quietHoursEnabled : undefined,
          quietStart: quietStart || undefined,
          quietEnd: quietEnd || undefined,
          eventPreferences: eventPreferences || undefined
        },
        create: {
          id: existing?.id || `prf_${ulid().toLowerCase()}`,
          userId,
          emailEnabled: emailEnabled !== undefined ? emailEnabled : true,
          smsEnabled: smsEnabled !== undefined ? smsEnabled : true,
          inAppEnabled: inAppEnabled !== undefined ? inAppEnabled : true,
          quietHoursEnabled: quietHoursEnabled !== undefined ? quietHoursEnabled : false,
          quietStart: quietStart || '22:00',
          quietEnd: quietEnd || '07:00',
          eventPreferences: eventPreferences || {}
        }
      });

      return res.status(200).json({
        success: true,
        data: updated
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
