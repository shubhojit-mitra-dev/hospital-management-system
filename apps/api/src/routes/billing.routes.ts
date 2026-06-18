import { Router } from 'express';
import { BillingController } from '../controllers/billing.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router: Router = Router();

// --- Invoices ---
router.post(
  '/invoices',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'BILLING_EXECUTIVE'),
  BillingController.createInvoice
);

router.get(
  '/invoices',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'BILLING_EXECUTIVE'),
  BillingController.listInvoices
);

router.get(
  '/invoices/:id',
  authenticate,
  BillingController.getInvoiceById
);

router.patch(
  '/invoices/:id',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'BILLING_EXECUTIVE'),
  BillingController.updateInvoice
);

router.post(
  '/invoices/:id/finalize',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'BILLING_EXECUTIVE'),
  BillingController.finalizeInvoice
);

router.post(
  '/invoices/:id/items',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'BILLING_EXECUTIVE'),
  BillingController.addInvoiceItem
);

router.delete(
  '/invoices/:id/items/:itemId',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'BILLING_EXECUTIVE'),
  BillingController.removeInvoiceItem
);

router.post(
  '/invoices/:id/cancel',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN'),
  BillingController.cancelInvoice
);

router.get(
  '/invoices/patient/:patientId',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'BILLING_EXECUTIVE', 'PATIENT'),
  BillingController.getPatientInvoiceHistory
);

// --- Payments ---
router.post(
  '/payments/cash',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'BILLING_EXECUTIVE'),
  BillingController.recordCashPayment
);

router.post(
  '/payments/initiate',
  authenticate,
  BillingController.initiateGatewayPayment
);

router.post(
  '/payments/verify',
  authenticate,
  BillingController.verifyGatewayPayment
);

router.get(
  '/payments/invoice/:invoiceId',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'BILLING_EXECUTIVE', 'PATIENT'),
  BillingController.getPaymentsForInvoice
);

router.post(
  '/payments/refund',
  authenticate,
  authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN'),
  BillingController.initiateRefund
);

export default router;
