import { Router } from 'express';
import { InpatientController } from '../controllers/inpatient.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router: Router = Router();

// --- Ward & Bed Management ---
router.get(
  '/wards',
  authenticate,
  InpatientController.listWards
);

router.post(
  '/wards',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN'),
  InpatientController.createWard
);

router.get(
  '/wards/:id',
  authenticate,
  InpatientController.getWardById
);

router.post(
  '/wards/:id/beds',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN'),
  InpatientController.addBedsToWard
);

router.patch(
  '/wards/:id/beds/:bedId',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'NURSE'),
  InpatientController.updateBedStatus
);

// --- Bed Availability ---
router.get(
  '/availability',
  authenticate,
  InpatientController.getBedAvailability
);

// --- Admission Lifecycle ---
router.post(
  '/admissions',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR'),
  InpatientController.createAdmission
);

router.get(
  '/admissions',
  authenticate,
  InpatientController.listAdmissions
);

router.get(
  '/admissions/:id',
  authenticate,
  InpatientController.getAdmissionById
);

router.post(
  '/admissions/:id/transfer',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR'),
  InpatientController.transferPatient
);

router.post(
  '/admissions/:id/notes',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE'),
  InpatientController.recordRoundNote
);

router.post(
  '/admissions/:id/discharge',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR'),
  InpatientController.dischargePatient
);

// --- Daily Billing Simulation Trigger ---
router.post(
  '/billing/trigger-daily',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'BILLING_EXECUTIVE'),
  InpatientController.triggerDailyBilling
);

export default router;
