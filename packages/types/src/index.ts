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
