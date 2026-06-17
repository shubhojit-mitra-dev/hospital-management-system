'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordRequestSchema, ResetPasswordRequest } from '@repo/types';
import api from '@/lib/axios';
import { AuthCard } from '@/components/auth/AuthCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const emailParam = searchParams.get('email') || '';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ResetPasswordRequest>({
    resolver: zodResolver(resetPasswordRequestSchema),
    defaultValues: {
      email: emailParam,
    },
  });

  // Keep form in sync if search params change
  useEffect(() => {
    if (emailParam) {
      setValue('email', emailParam);
    }
  }, [emailParam, setValue]);

  const onSubmit = async (data: ResetPasswordRequest) => {
    setError(null);
    setIsLoading(true);
    try {
      await api.post('/api/v1/auth/reset-password', data);
      router.push('/login');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to reset password';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md h-[400px] rounded-2xl bg-white border border-slate-200/80 shadow-xl shadow-slate-200/30 animate-pulse" />
      </div>
    );
  }

  return (
    <AuthCard title="Reset Password" description="Enter the OTP sent to your email and your new password">
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
          {errors.newPassword && <p className="text-xs text-red-500">{errors.newPassword.message}</p>}
        </div>

        <Button type="submit" disabled={isLoading} className="mt-2">
          {isLoading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 rounded-full border-t-white animate-spin mr-2"></span>
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

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen text-slate-400">Loading...</div>}>
      <ResetPasswordContent />
    </React.Suspense>
  );
}
