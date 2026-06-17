import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Guard all admin routes with authentication and staff check
router.use(authenticate);
router.use(authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN'));

router.post('/', AdminController.createStaff);
router.get('/', AdminController.listStaff);
router.get('/:id', AdminController.getStaffDetails);
router.put('/:id', AdminController.updateStaff);
router.patch('/:id/status', AdminController.toggleStaffStatus);
router.delete('/:id', AdminController.deleteStaff);

export default router;
