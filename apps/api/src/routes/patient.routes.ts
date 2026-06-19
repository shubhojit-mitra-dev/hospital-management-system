import { Router } from 'express';
import { PatientController } from '../controllers/patient.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router: Router = Router();

router.post(
  '/',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST'),
  PatientController.create
);

router.get(
  '/',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'),
  PatientController.list
);

router.get(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'PATIENT'),
  PatientController.getById
);

router.patch(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'PATIENT'),
  PatientController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN'),
  PatientController.delete
);

router.get(
  '/:id/history',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'PATIENT'),
  PatientController.getMedicalHistory
);

router.patch(
  '/:id/history',
  authenticate,
  authorize('DOCTOR', 'NURSE'),
  PatientController.updateMedicalHistory
);

router.get(
  '/:id/vitals',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'PATIENT'),
  PatientController.getVitals
);

router.post(
  '/:id/vitals',
  authenticate,
  authorize('NURSE'),
  PatientController.createVitals
);

router.get(
  '/:id/timeline',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'PATIENT'),
  PatientController.getTimeline
);

export default router;
