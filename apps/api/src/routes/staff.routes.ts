import { Router } from 'express';
import { StaffController } from '../controllers/staff.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router: Router = Router();

router.post(
  '/',
  authenticate,
  authorize('HOSPITAL_ADMIN'),
  StaffController.create
);

router.get(
  '/',
  authenticate,
  authorize('HOSPITAL_ADMIN'),
  StaffController.list
);

router.get(
  '/:id',
  authenticate,
  authorize('HOSPITAL_ADMIN', 'NURSE', 'RECEPTIONIST'),
  StaffController.getById
);

router.patch(
  '/:id',
  authenticate,
  authorize('HOSPITAL_ADMIN'),
  StaffController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize('HOSPITAL_ADMIN'),
  StaffController.delete
);

export default router;
