import { Router } from 'express';
import { EMRController } from '../controllers/emr.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router: Router = Router();

router.post(
  '/upload',
  authenticate,
  authorize('DOCTOR', 'NURSE'),
  EMRController.upload
);

router.get(
  '/patient/:patientId',
  authenticate,
  EMRController.listByPatient
);

router.get(
  '/patient/:patientId/search',
  authenticate,
  EMRController.semanticSearch
);

router.get(
  '/:id/download',
  authenticate,
  EMRController.download
);

export default router;
