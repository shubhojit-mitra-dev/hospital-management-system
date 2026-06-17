'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordRequestSchema, ForgotPasswordRequest } from '@repo/types';
import api from '@/lib/axios';
import { AuthCard } from '@/components/auth/AuthCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordRequest>({
    resolver: zodResolver(forgotPasswordRequestSchema),
  });

  const onSubmit = async (data: ForgotPasswordRequest) => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
      await api.post('/api/v1/auth/forgot-password', data);
      setSuccess('Reset code has been sent to your email.');
      router.push(`/reset-password?email=${encodeURIComponent(data.email)}`);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to request reset OTP';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md h-[300px] rounded-2xl bg-white border border-slate-200/80 shadow-xl shadow-slate-200/30 animate-pulse" />
      </div>
    );
  }

  return (
    <AuthCard title="Forgot Password" description="Enter your email to receive a password reset OTP">
      {error && (
        <div className="mb-4 text-center text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 text-center text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 p-3 rounded-lg">
          {success}
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

        <Button type="submit" disabled={isLoading} className="mt-2">
          {isLoading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 rounded-full border-t-white animate-spin mr-2"></span>
              Sending OTP...
            </>
          ) : (
            'Send Reset OTP'
          )}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-500">
        Remember your password?{' '}
        <a href="/login" className="text-teal-600 font-semibold hover:text-teal-700 hover:underline">
          Sign In
        </a>
      </div>
    </AuthCard>
  );
}
