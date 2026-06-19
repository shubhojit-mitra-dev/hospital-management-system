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
  | 'lab_catalog:write'
  | 'pharmacy:read'
  | 'pharmacy:write'
  | 'pharmacy_catalog:write'
  | 'billing:read'
  | 'billing:write'
  | 'inpatient:read'
  | 'inpatient:write'
  | 'ward:write'
  | 'emergency:read'
  | 'emergency:write'
  | 'notifications:read'
  | 'notifications:write';

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
  'pharmacy:read',
  'pharmacy:write',
  'pharmacy_catalog:write',
  'billing:read',
  'billing:write',
  'inpatient:read',
  'inpatient:write',
  'ward:write',
  'emergency:read',
  'emergency:write',
  'notifications:read',
  'notifications:write',
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
    'pharmacy:read',
    'pharmacy:write',
    'pharmacy_catalog:write',
    'billing:read',
    'billing:write',
    'inpatient:read',
    'inpatient:write',
    'ward:write',
    'emergency:read',
    'emergency:write',
    'notifications:read',
    'notifications:write',
  ],
  DOCTOR: [
    'hospital:read',
    'department:read',
    'holiday:read',
    'staff:read',
    'lab:read',
    'lab:write',
    'pharmacy:read',
    'billing:read',
    'inpatient:read',
    'inpatient:write',
    'emergency:read',
    'emergency:write',
    'notifications:read',
    'notifications:write',
  ],
  NURSE: [
    'hospital:read',
    'department:read',
    'holiday:read',
    'staff:read',
    'lab:read',
    'lab:write',
    'inpatient:read',
    'inpatient:write',
    'emergency:read',
    'emergency:write',
    'notifications:read',
    'notifications:write',
  ],
  RECEPTIONIST: [
    'hospital:read',
    'department:read',
    'holiday:read',
    'staff:read',
    'emergency:read',
    'emergency:write',
    'notifications:read',
    'notifications:write',
  ],
  LAB_TECHNICIAN: [
    'hospital:read',
    'department:read',
    'holiday:read',
    'staff:read',
    'lab:read',
    'lab:write',
    'notifications:read',
    'notifications:write',
  ],
  PHARMACIST: [
    'hospital:read',
    'department:read',
    'holiday:read',
    'staff:read',
    'pharmacy:read',
    'pharmacy:write',
    'pharmacy_catalog:write',
    'notifications:read',
    'notifications:write',
  ],
  BILLING_EXECUTIVE: [
    'hospital:read',
    'department:read',
    'holiday:read',
    'staff:read',
    'billing:read',
    'billing:write',
    'notifications:read',
    'notifications:write',
  ],
  PATIENT: [
    'hospital:read',
    'department:read',
    'billing:read',
    'inpatient:read',
    'notifications:read',
    'notifications:write',
  ],
};
