export type Permission =
  | 'hospital:read'
  | 'hospital:write'
  | 'department:read'
  | 'department:write'
  | 'holiday:read'
  | 'holiday:write'
  | 'staff:read'
  | 'staff:write'
  | 'lab:read'
  | 'lab:write'
  | 'lab_catalog:write';

export const ALL_PERMISSIONS: Permission[] = [
  'hospital:read',
  'hospital:write',
  'department:read',
  'department:write',
  'holiday:read',
  'holiday:write',
  'staff:read',
  'staff:write',
  'lab:read',
  'lab:write',
  'lab_catalog:write',
];

export const RolePermissions: Record<string, Permission[]> = {
  SUPER_ADMIN: [...ALL_PERMISSIONS],
  HOSPITAL_ADMIN: [
    'hospital:read',
    'department:read',
    'department:write',
    'holiday:read',
    'holiday:write',
    'staff:read',
    'staff:write',
    'lab:read',
    'lab:write',
    'lab_catalog:write',
  ],
  DOCTOR: [
    'hospital:read',
    'department:read',
    'holiday:read',
    'staff:read',
    'lab:read',
    'lab:write',
  ],
  NURSE: [
    'hospital:read',
    'department:read',
    'holiday:read',
    'staff:read',
    'lab:read',
    'lab:write',
  ],
  RECEPTIONIST: [
    'hospital:read',
    'department:read',
    'holiday:read',
    'staff:read',
  ],
  LAB_TECHNICIAN: [
    'hospital:read',
    'department:read',
    'holiday:read',
    'staff:read',
    'lab:read',
    'lab:write',
  ],
  PHARMACIST: [
    'hospital:read',
    'department:read',
    'holiday:read',
    'staff:read',
  ],
  BILLING_EXECUTIVE: [
    'hospital:read',
    'department:read',
    'holiday:read',
    'staff:read',
  ],
  PATIENT: [
    'hospital:read',
  ],
};
