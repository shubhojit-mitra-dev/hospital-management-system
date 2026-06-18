import { Router } from 'express';
import { ConsultationController } from '../controllers/consultation.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router: Router = Router();

router.get(
  '/',
  authenticate,
  ConsultationController.searchICDCodes
);

export default router;
