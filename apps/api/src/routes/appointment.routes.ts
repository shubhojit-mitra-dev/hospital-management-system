import { Router } from 'express';
import { AppointmentController } from '../controllers/appointment.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router: Router = Router();

router.post(
  '/',
  authenticate,
  authorize('HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'PATIENT'),
  AppointmentController.book
);

router.get(
  '/',
  authenticate,
  AppointmentController.list
);

router.get(
  '/calendar',
  authenticate,
  AppointmentController.getCalendarEvents
);

router.get(
  '/queue/:doctorId',
  authenticate,
  AppointmentController.getQueue
);

router.patch(
  '/queue/:queueId/call',
  authenticate,
  authorize('HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR'),
  AppointmentController.callQueue
);

router.get(
  '/:id',
  authenticate,
  AppointmentController.getById
);

router.patch(
  '/:id/confirm',
  authenticate,
  authorize('HOSPITAL_ADMIN', 'RECEPTIONIST'),
  AppointmentController.confirm
);

router.patch(
  '/:id/start',
  authenticate,
  authorize('DOCTOR'),
  AppointmentController.startConsultation
);

router.patch(
  '/:id/complete',
  authenticate,
  authorize('DOCTOR'),
  AppointmentController.complete
);

router.patch(
  '/:id/cancel',
  authenticate,
  AppointmentController.cancel
);

router.patch(
  '/:id/reschedule',
  authenticate,
  AppointmentController.reschedule
);

export default router;
