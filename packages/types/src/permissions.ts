export type Permission =
  | 'hospital:read'
  | 'hospital:write'
  | 'department:read'
  | 'department:write'
  | 'holiday:read'
  | 'holiday:write'
  | 'staff:read'
  | 'staff:write';

export const ALL_PERMISSIONS: Permission[] = [
  'hospital:read',
  'hospital:write',
  'department:read',
  'department:write',
  'holiday:read',
  'holiday:write',
  'staff:read',
  'staff:write',
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
  ],
  DOCTOR: [
    'hospital:read',
    'department:read',
    'holiday:read',
    'staff:read',
  ],
  NURSE: [
    'hospital:read',
    'department:read',
    'holiday:read',
    'staff:read',
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
