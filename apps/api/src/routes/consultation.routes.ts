import { Router } from 'express';
import { ConsultationController } from '../controllers/consultation.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router: Router = Router();

router.post(
  '/',
  authenticate,
  authorize('DOCTOR'),
  ConsultationController.start
);

router.get(
  '/appointment/:appointmentId',
  authenticate,
  ConsultationController.getByAppointmentId
);

router.get(
  '/:id',
  authenticate,
  ConsultationController.getById
);

router.patch(
  '/:id',
  authenticate,
  authorize('DOCTOR'),
  ConsultationController.update
);

router.patch(
  '/:id/complete',
  authenticate,
  authorize('DOCTOR'),
  ConsultationController.complete
);

router.post(
  '/prescription',
  authenticate,
  authorize('DOCTOR'),
  ConsultationController.createPrescription
);

export default router;
