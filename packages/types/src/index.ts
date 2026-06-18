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

export * from './permissions.js';

