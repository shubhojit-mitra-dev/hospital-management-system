import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { authenticate, requirePermission } from '../middlewares/auth.middleware.js';

const router: Router = Router();

router.use(authenticate);

router.post('/', requirePermission('staff:write'), AdminController.createStaff);
router.get('/', requirePermission('staff:read'), AdminController.listStaff);
router.get('/:id', requirePermission('staff:read'), AdminController.getStaffDetails);
router.put('/:id', requirePermission('staff:write'), AdminController.updateStaff);
router.patch('/:id/status', requirePermission('staff:write'), AdminController.toggleStaffStatus);
router.delete('/:id', requirePermission('staff:write'), AdminController.deleteStaff);

export default router;
