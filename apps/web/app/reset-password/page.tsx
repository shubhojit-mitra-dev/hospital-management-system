'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { resetPasswordRequestSchema, ResetPasswordRequest } from '@repo/types';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { AuthCard } from '@/components/auth/AuthCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

// Schema for the forced-change flow (old password → new password)
const forceChangeSchema = z.object({
  oldPassword: z.string().min(1, 'Current (temporary) password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[@$!%*?&]/, 'Must contain a special character (@$!%*?&)'),
});
type ForceChangeRequest = z.infer<typeof forceChangeSchema>;

// ─── Forced password change (for admins with temp passwords) ───────────────
function ForcePasswordChangeForm() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForceChangeRequest>({
    resolver: zodResolver(forceChangeSchema),
  });

  const onSubmit = async (data: ForceChangeRequest) => {
    setError(null);
    setIsLoading(true);
    try {
      await api.post('/api/v1/auth/me/password', {
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      });
      // Force logout so the user re-authenticates with the new password
      // (the JWT still has forcePasswordChange=false info only after re-login)
      logout();
      router.push('/login?passwordChanged=1');
    } catch (err: any) {
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to change password';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title="Set Your Password"
      description={`Welcome${user?.firstName ? `, ${user.firstName}` : ''}! Your account was created with a temporary password. Please set a new one to continue.`}
    >
      {error && (
        <div className="mb-4 text-center text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="oldPassword">Temporary Password</Label>
          <Input
            id="oldPassword"
            type="password"
            placeholder="Enter the password you were given"
            aria-invalid={!!errors.oldPassword}
            {...register('oldPassword')}
          />
          {errors.oldPassword && (
            <p className="text-xs text-red-500">{errors.oldPassword.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="newPassword">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            placeholder="••••••••"
            aria-invalid={!!errors.newPassword}
            {...register('newPassword')}
          />
          {errors.newPassword && (
            <p className="text-xs text-red-500">{errors.newPassword.message}</p>
          )}
          <p className="text-[11px] text-slate-400">
            Min 8 chars · uppercase · lowercase · number · special (@$!%*?&)
          </p>
        </div>

        <Button type="submit" disabled={isLoading} className="mt-2">
          {isLoading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 rounded-full border-t-white animate-spin mr-2" />
              Saving...
            </>
          ) : (
            'Set New Password & Continue'
          )}
        </Button>
      </form>
    </AuthCard>
  );
}

// ─── OTP-based reset (from forgot-password link) ────────────────────────────
function OtpResetForm({ emailParam }: { emailParam: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ResetPasswordRequest>({
    resolver: zodResolver(resetPasswordRequestSchema),
    defaultValues: { email: emailParam },
  });

  useEffect(() => {
    if (emailParam) setValue('email', emailParam);
  }, [emailParam, setValue]);

  const onSubmit = async (data: ResetPasswordRequest) => {
    setError(null);
    setIsLoading(true);
    try {
      await api.post('/api/v1/auth/reset-password', data);
      router.push('/login');
    } catch (err: any) {
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to reset password';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title="Reset Password"
      description="Enter the OTP sent to your email and your new password"
    >
      {error && (
        <div className="mb-4 text-center text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@hospital.com"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code">Reset Code</Label>
          <Input
            id="code"
            type="text"
            placeholder="Enter 6-digit OTP"
            aria-invalid={!!errors.code}
            {...register('code')}
          />
          {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="newPassword">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            placeholder="••••••••"
            aria-invalid={!!errors.newPassword}
            {...register('newPassword')}
          />
          {errors.newPassword && (
            <p className="text-xs text-red-500">{errors.newPassword.message}</p>
          )}
        </div>

        <Button type="submit" disabled={isLoading} className="mt-2">
          {isLoading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 rounded-full border-t-white animate-spin mr-2" />
              Resetting...
            </>
          ) : (
            'Reset Password'
          )}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-500">
        Remembered your password?{' '}
        <a href="/login" className="text-teal-600 font-semibold hover:text-teal-700 hover:underline">
          Sign In
        </a>
      </div>
    </AuthCard>
  );
}

// ─── Page router ────────────────────────────────────────────────────────────
function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const { isAuthenticated, user } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md h-[400px] rounded-2xl bg-white border border-slate-200/80 shadow-xl animate-pulse" />
      </div>
    );
  }

  // Logged-in admin with forcePasswordChange → use change-password flow (no OTP needed)
  if (isAuthenticated && user?.forcePasswordChange) {
    return <ForcePasswordChangeForm />;
  }

  // Came from forgot-password link → OTP flow
  const emailParam = searchParams.get('email') || '';
  return <OtpResetForm emailParam={emailParam} />;
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen text-slate-400">
          Loading...
        </div>
      }
    >
      <ResetPasswordContent />
    </React.Suspense>
  );
}
