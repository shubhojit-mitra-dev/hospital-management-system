import { Router } from 'express';
import { HospitalController } from '../controllers/hospital.controller.js';
import { DepartmentController } from '../controllers/department.controller.js';
import { HolidayController } from '../controllers/holiday.controller.js';
import { authenticate, requirePermission, requireHospital } from '../middlewares/auth.middleware.js';

const router: Router = Router();

// Hospital CRUD endpoints
router.post(
  '/',
  authenticate,
  requirePermission('hospital:write'),
  HospitalController.create
);
router.get(
  '/',
  authenticate,
  requirePermission('hospital:read'),
  HospitalController.list
);
router.get(
  '/:id',
  authenticate,
  requirePermission('hospital:read'),
  HospitalController.getById
);
router.put(
  '/:id',
  authenticate,
  requirePermission('hospital:write'),
  HospitalController.update
);
router.delete(
  '/:id',
  authenticate,
  requirePermission('hospital:write'),
  HospitalController.delete
);
router.patch(
  '/:id/activate',
  authenticate,
  requirePermission('hospital:write'),
  HospitalController.activate
);

// Department CRUD endpoints nested under /hospitals/:hospitalId/departments
router.post(
  '/:hospitalId/departments',
  authenticate,
  requireHospital,
  requirePermission('department:write'),
  DepartmentController.create
);
router.get(
  '/:hospitalId/departments',
  authenticate,
  requireHospital,
  requirePermission('department:read'),
  DepartmentController.list
);
router.get(
  '/:hospitalId/departments/:id',
  authenticate,
  requireHospital,
  requirePermission('department:read'),
  DepartmentController.getById
);
router.put(
  '/:hospitalId/departments/:id',
  authenticate,
  requireHospital,
  requirePermission('department:write'),
  DepartmentController.update
);
router.delete(
  '/:hospitalId/departments/:id',
  authenticate,
  requireHospital,
  requirePermission('department:write'),
  DepartmentController.delete
);

// Holiday CRUD endpoints nested under /hospitals/:hospitalId/holidays
router.post(
  '/:hospitalId/holidays',
  authenticate,
  requireHospital,
  requirePermission('holiday:write'),
  HolidayController.create
);
router.get(
  '/:hospitalId/holidays',
  authenticate,
  requireHospital,
  requirePermission('holiday:read'),
  HolidayController.list
);
router.get(
  '/:hospitalId/holidays/:id',
  authenticate,
  requireHospital,
  requirePermission('holiday:read'),
  HolidayController.getById
);
router.put(
  '/:hospitalId/holidays/:id',
  authenticate,
  requireHospital,
  requirePermission('holiday:write'),
  HolidayController.update
);
router.delete(
  '/:hospitalId/holidays/:id',
  authenticate,
  requireHospital,
  requirePermission('holiday:write'),
  HolidayController.delete
);

export default router;
