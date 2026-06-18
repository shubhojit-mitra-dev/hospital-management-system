import { Router } from 'express';
import { EmergencyController } from '../controllers/emergency.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router: Router = Router();

// --- Duty Roster ---
router.get(
  '/duty-roster',
  authenticate,
  EmergencyController.getDutyRoster
);

router.post(
  '/duty-roster',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN'),
  EmergencyController.upsertDutyRoster
);

// --- Emergency Cases ---
router.post(
  '/',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'NURSE', 'DOCTOR'),
  EmergencyController.createEmergencyCase
);

router.get(
  '/',
  authenticate,
  EmergencyController.listActiveEmergencies
);

router.get(
  '/:id',
  authenticate,
  EmergencyController.getEmergencyCaseById
);

router.patch(
  '/:id/triage',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'NURSE', 'DOCTOR'),
  EmergencyController.updateTriageLevel
);

router.patch(
  '/:id/assign',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'NURSE'),
  EmergencyController.assignDoctor
);

router.post(
  '/:id/actions',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE'),
  EmergencyController.logAction
);

router.post(
  '/:id/close',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR'),
  EmergencyController.closeEmergencyCase
);

export default router;
