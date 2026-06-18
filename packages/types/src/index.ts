import { z } from "zod";

export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[@$!%*?&]/, "Password must contain at least one special character (@$!%*?&)");

// Register Request
export const registerRequestSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  phone: z.string().min(1, "Phone number is required"),
  hospitalId: z.string().min(1, "Hospital ID is required"),
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

// Login Request
export const loginRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

// Forgot Password Request
export const forgotPasswordRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
});
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;

// Reset Password Request
export const resetPasswordRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().min(1, "Reset code is required"),
  newPassword: passwordSchema,
});
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;

// Verify Email Request
export const verifyEmailRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().min(1, "Verification code is required"),
});
export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>;

// Change Password Request
export const changePasswordRequestSchema = z.object({
  oldPassword: z.string().min(1, "Old password is required"),
  newPassword: passwordSchema,
});
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;

// Laboratory Management Schemas
export const createLabOrderSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  consultationId: z.string().optional(),
  priority: z.enum(["ROUTINE", "URGENT", "STAT"]).default("ROUTINE"),
  clinicalNotes: z.string().optional(),
  tests: z.array(z.object({
    testCatalogId: z.string().min(1, "Test Catalog ID is required"),
    testCode: z.string().min(1, "Test Code is required")
  })).min(1, "At least one test must be ordered")
});
export type CreateLabOrderRequest = z.infer<typeof createLabOrderSchema>;

export const uploadLabResultsSchema = z.object({
  items: z.array(z.object({
    labOrderItemId: z.string().min(1, "Lab Order Item ID is required"),
    resultValues: z.record(z.string()),
    resultInterpretation: z.enum(["NORMAL", "ABNORMAL", "CRITICAL"]),
    technicianNotes: z.string().optional(),
    results: z.array(z.object({
      parameterName: z.string().min(1, "Parameter name is required"),
      resultValue: z.string().min(1, "Result value is required"),
      unit: z.string().optional(),
      referenceMin: z.string().optional(),
      referenceMax: z.string().optional(),
      isAbnormal: z.boolean().default(false),
      isCritical: z.boolean().default(false)
    }))
  })),
  reportFileKey: z.string().optional()
});
export type UploadLabResultsRequest = z.infer<typeof uploadLabResultsSchema>;

// Pharmacy & Inventory Management Schemas
export const addMedicineSchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  genericName: z.string().min(1, "Generic name is required"),
  composition: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  manufacturer: z.string().optional(),
  drugSchedule: z.string().optional(),
  isPrescriptionRequired: z.boolean().default(true),
  unitOfMeasure: z.string().default("Tablet"),
  mrp: z.number().optional(),
  sellingPrice: z.number().min(0, "Selling price must be non-negative")
});
export type AddMedicineRequest = z.infer<typeof addMedicineSchema>;

export const addInventoryBatchSchema = z.object({
  medicineId: z.string().min(1, "Medicine ID is required"),
  batchNumber: z.string().min(1, "Batch number is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  reorderLevel: z.number().int().default(50),
  manufactureDate: z.string().optional(),
  expiryDate: z.string().min(1, "Expiry date is required"),
  purchasePrice: z.number().optional(),
  supplierId: z.string().optional(),
  location: z.string().optional()
});
export type AddInventoryBatchRequest = z.infer<typeof addInventoryBatchSchema>;

export const dispensePrescriptionSchema = z.object({
  items: z.array(z.object({
    prescriptionItemId: z.string().min(1, "Prescription Item ID is required"),
    quantityDispensed: z.number().int().min(0, "Quantity must be non-negative"),
    inventoryId: z.string().optional(),
    batchNumber: z.string().optional(),
    reason: z.string().optional()
  })),
  notes: z.string().optional()
});
export type DispensePrescriptionRequest = z.infer<typeof dispensePrescriptionSchema>;

// Billing & Payments Schemas
export const createInvoiceSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  appointmentId: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    itemType: z.enum(["CONSULTATION", "LAB_TEST", "MEDICINE", "ROOM", "PROCEDURE", "EMERGENCY", "MISC"]),
    description: z.string().min(1, "Description is required"),
    quantity: z.number().int().default(1),
    unitPrice: z.number().min(0, "Unit price must be non-negative"),
    referenceType: z.string().optional(),
    referenceId: z.string().optional()
  })).optional()
});
export type CreateInvoiceRequest = z.infer<typeof createInvoiceSchema>;

export const addInvoiceItemSchema = z.object({
  itemType: z.enum(["CONSULTATION", "LAB_TEST", "MEDICINE", "ROOM", "PROCEDURE", "EMERGENCY", "MISC"]),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().int().default(1),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  referenceType: z.string().optional(),
  referenceId: z.string().optional()
});
export type AddInvoiceItemRequest = z.infer<typeof addInvoiceItemSchema>;

export const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.number().min(0.01, "Amount must be greater than zero"),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "INSURANCE", "CHEQUE", "NEFT"]),
  upiTransactionId: z.string().optional(),
  upiVpa: z.string().optional(),
  cardLastFour: z.string().optional(),
  cardType: z.string().optional(),
  notes: z.string().optional()
});
export type RecordPaymentRequest = z.infer<typeof recordPaymentSchema>;

export const initiatePaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.number().min(0.01, "Amount must be greater than zero"),
  paymentMethod: z.string().default("UPI"),
  gatewayName: z.string().default("RAZORPAY")
});
export type InitiatePaymentRequest = z.infer<typeof initiatePaymentSchema>;

// --- Inpatient Ward & Bed ---
export const createWardSchema = z.object({
  name: z.string().min(1, "Name is required"),
  wardType: z.enum(["GENERAL", "SEMI_PRIVATE", "PRIVATE", "ICU", "HDU", "NICU", "PEDIATRIC"]),
  floor: z.string().optional(),
  totalBeds: z.number().int().min(1, "Total beds must be at least 1"),
  chargePerDay: z.number().min(0, "Charge per day must be non-negative")
});
export type CreateWardRequest = z.infer<typeof createWardSchema>;

export const createBedSchema = z.object({
  bedNumber: z.string().min(1, "Bed number is required"),
  bedType: z.enum(["STANDARD", "ICU", "OXYGEN", "VENTILATOR"]).default("STANDARD"),
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE", "RESERVED"]).default("AVAILABLE")
});
export type CreateBedRequest = z.infer<typeof createBedSchema>;

// --- Admission ---
export const createAdmissionSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  doctorId: z.string().min(1, "Doctor ID is required"),
  departmentId: z.string().min(1, "Department ID is required"),
  wardId: z.string().min(1, "Ward ID is required"),
  bedId: z.string().min(1, "Bed ID is required"),
  admissionType: z.enum(["PLANNED", "EMERGENCY", "POST_OP"]),
  chiefComplaint: z.string().optional(),
  admissionDiagnosis: z.string().optional(),
  primaryNurseId: z.string().optional(),
  attendantName: z.string().optional(),
  attendantPhone: z.string().optional(),
  attendantRelation: z.string().optional()
});
export type CreateAdmissionRequest = z.infer<typeof createAdmissionSchema>;

export const recordAdmissionNoteSchema = z.object({
  noteType: z.enum(["DOCTOR_ROUND", "NURSE_NOTE", "PROCEDURE", "INCIDENT"]),
  notes: z.string().min(1, "Notes are required")
});
export type RecordAdmissionNoteRequest = z.infer<typeof recordAdmissionNoteSchema>;

export const transferPatientSchema = z.object({
  toWardId: z.string().min(1, "Destination ward ID is required"),
  toBedId: z.string().min(1, "Destination bed ID is required"),
  reason: z.string().optional()
});
export type TransferPatientRequest = z.infer<typeof transferPatientSchema>;

export const dischargePatientSchema = z.object({
  dischargeDiagnosis: z.string().min(1, "Discharge diagnosis is required"),
  dischargeCondition: z.enum(["RECOVERED", "IMPROVED", "REFERRED", "AGAINST_ADVICE", "DEATH"]),
  dischargeInstructions: z.string().optional()
});
export type DischargePatientRequest = z.infer<typeof dischargePatientSchema>;

// --- Emergency Management ---
export const createEmergencyCaseSchema = z.object({
  patientId: z.string().optional(),
  patientName: z.string().optional(),
  patientAge: z.number().int().optional(),
  patientGender: z.string().optional(),
  patientPhone: z.string().optional(),
  broughtBy: z.string().optional(),
  triageLevel: z.enum(["IMMEDIATE", "EMERGENT", "URGENT", "LESS_URGENT", "NON_URGENT"]),
  chiefComplaint: z.string().min(1, "Chief complaint is required"),
  symptoms: z.array(z.string()).optional(),
  mechanismOfInjury: z.string().optional(),
  bpSystolic: z.number().int().optional(),
  bpDiastolic: z.number().int().optional(),
  pulse: z.number().int().optional(),
  temperature: z.number().optional(),
  spo2: z.number().int().optional(),
  gcsScore: z.number().int().min(3).max(15).optional()
});
export type CreateEmergencyCaseRequest = z.infer<typeof createEmergencyCaseSchema>;

export const updateTriageSchema = z.object({
  triageLevel: z.enum(["IMMEDIATE", "EMERGENT", "URGENT", "LESS_URGENT", "NON_URGENT"])
});
export type UpdateTriageRequest = z.infer<typeof updateTriageSchema>;

export const logEmergencyActionSchema = z.object({
  actionType: z.enum(["MEDICATION", "PROCEDURE", "INVESTIGATION", "NOTE"]),
  description: z.string().min(1, "Description is required")
});
export type LogEmergencyActionRequest = z.infer<typeof logEmergencyActionSchema>;

export const createDutyRosterSchema = z.object({
  departmentId: z.string().min(1, "Department ID is required"),
  userId: z.string().min(1, "User ID is required"),
  userRole: z.enum(["DOCTOR", "NURSE"]),
  shiftDate: z.string().min(1, "Shift date is required"),
  shiftType: z.enum(["MORNING", "EVENING", "NIGHT"]),
  shiftStart: z.string().min(1, "Shift start time is required"),
  shiftEnd: z.string().min(1, "Shift end time is required"),
  isOnCall: z.boolean().default(false)
});
export type CreateDutyRosterRequest = z.infer<typeof createDutyRosterSchema>;

// --- Notifications System ---
export const updateNotificationPreferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietStart: z.string().optional(),
  quietEnd: z.string().optional(),
  eventPreferences: z.any().optional() // Handles dynamic JSON map preferences
});
export type UpdateNotificationPreferencesRequest = z.infer<typeof updateNotificationPreferencesSchema>;

export * from './permissions.js';

