import { Router } from 'express';
import { LabController } from '../controllers/lab.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router: Router = Router();

// --- Lab Catalog Routes ---
router.get(
  '/catalog',
  authenticate,
  LabController.listCatalog
);

router.post(
  '/catalog',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'LAB_TECHNICIAN'),
  LabController.createCatalogItem
);

router.patch(
  '/catalog/:id',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN'),
  LabController.updateCatalogItem
);

router.delete(
  '/catalog/:id',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN'),
  LabController.deleteCatalogItem
);

// --- Lab Order Routes ---
router.post(
  '/orders',
  authenticate,
  authorize('DOCTOR'),
  LabController.createOrder
);

router.get(
  '/orders',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'LAB_TECHNICIAN'),
  LabController.listOrders
);

router.get(
  '/orders/:id',
  authenticate,
  LabController.getOrderById
);

router.patch(
  '/orders/:id/collect-sample',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'NURSE', 'LAB_TECHNICIAN'),
  LabController.collectSample
);

router.patch(
  '/orders/:id/start-processing',
  authenticate,
  authorize('LAB_TECHNICIAN'),
  LabController.startProcessing
);

router.post(
  '/orders/:id/results',
  authenticate,
  authorize('LAB_TECHNICIAN'),
  LabController.uploadResults
);

router.patch(
  '/orders/:id/review',
  authenticate,
  authorize('DOCTOR'),
  LabController.reviewOrder
);

router.patch(
  '/orders/:id/cancel',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR'),
  LabController.cancelOrder
);

router.get(
  '/orders/patient/:patientId',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'PATIENT'),
  LabController.getPatientHistory
);

export default router;
