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

export * from './permissions.js';

