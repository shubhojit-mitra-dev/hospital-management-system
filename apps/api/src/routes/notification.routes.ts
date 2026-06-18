import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router: Router = Router();

// Retrieve list of notifications (paginated, filterable)
router.get(
  '/',
  authenticate,
  NotificationController.listNotifications
);

// Count of unread notifications
router.get(
  '/unread-count',
  authenticate,
  NotificationController.getUnreadCount
);

// Retrieve notification preferences
router.get(
  '/preferences',
  authenticate,
  NotificationController.getPreferences
);

// Update preferences
router.patch(
  '/preferences',
  authenticate,
  NotificationController.updatePreferences
);

// Mark all as read
router.patch(
  '/read-all',
  authenticate,
  NotificationController.markAllAsRead
);

// Mark single notification as read
router.patch(
  '/:id/read',
  authenticate,
  NotificationController.markAsRead
);

// Delete notification
router.delete(
  '/:id',
  authenticate,
  NotificationController.deleteNotification
);

export default router;
