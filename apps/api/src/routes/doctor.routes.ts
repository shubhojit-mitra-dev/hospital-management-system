import { Router } from 'express';
import { DoctorController } from '../controllers/doctor.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router: Router = Router();

router.post(
  '/',
  authenticate,
  authorize('HOSPITAL_ADMIN'),
  DoctorController.create
);

router.get(
  '/',
  authenticate,
  DoctorController.list
);

router.get(
  '/:id',
  authenticate,
  DoctorController.getById
);

router.patch(
  '/:id',
  authenticate,
  authorize('HOSPITAL_ADMIN', 'DOCTOR'),
  DoctorController.update
);

router.get(
  '/:id/schedule',
  authenticate,
  DoctorController.getSchedule
);

router.post(
  '/:id/schedule',
  authenticate,
  authorize('HOSPITAL_ADMIN', 'DOCTOR'),
  DoctorController.setSchedule
);

router.get(
  '/:id/availability',
  authenticate,
  DoctorController.getAvailability
);

router.get(
  '/:id/leaves',
  authenticate,
  authorize('HOSPITAL_ADMIN', 'DOCTOR'),
  DoctorController.getLeaves
);

router.post(
  '/:id/leaves',
  authenticate,
  authorize('HOSPITAL_ADMIN', 'DOCTOR'),
  DoctorController.applyLeave
);

router.delete(
  '/:id/leaves/:leaveId',
  authenticate,
  authorize('HOSPITAL_ADMIN', 'DOCTOR'),
  DoctorController.cancelLeave
);

export default router;
