import { Router } from 'express';
import { PharmacyController } from '../controllers/pharmacy.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router: Router = Router();

// --- Medicines Catalog ---
router.get(
  '/medicines',
  authenticate,
  PharmacyController.listMedicines
);

router.post(
  '/medicines',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST'),
  PharmacyController.createMedicine
);

router.get(
  '/medicines/:id',
  authenticate,
  PharmacyController.getMedicineById
);

router.patch(
  '/medicines/:id',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST'),
  PharmacyController.updateMedicine
);

router.delete(
  '/medicines/:id',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN'),
  PharmacyController.deleteMedicine
);

// --- Suppliers ---
router.get(
  '/suppliers',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST'),
  PharmacyController.listSuppliers
);

router.post(
  '/suppliers',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST'),
  PharmacyController.createSupplier
);

router.patch(
  '/suppliers/:id',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN'),
  PharmacyController.updateSupplier
);

// --- Inventory ---
router.get(
  '/inventory',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST'),
  PharmacyController.listInventory
);

router.post(
  '/inventory',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST'),
  PharmacyController.createInventoryBatch
);

router.patch(
  '/inventory/:id',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST'),
  PharmacyController.adjustInventoryBatch
);

router.get(
  '/inventory-alerts/low-stock',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST'),
  PharmacyController.getLowStockAlerts
);

router.get(
  '/inventory-alerts/expiring',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST'),
  PharmacyController.getExpiringAlerts
);

router.get(
  '/inventory-transactions',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST'),
  PharmacyController.getTransactions
);

// --- Prescriptions Fulfillment ---
router.get(
  '/prescriptions',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST'),
  PharmacyController.listPrescriptions
);

router.get(
  '/prescriptions/:id',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST', 'DOCTOR', 'PATIENT'),
  PharmacyController.getPrescriptionById
);

router.post(
  '/prescriptions/:id/dispense',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST'),
  PharmacyController.dispensePrescription
);

export default router;
