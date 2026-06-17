'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginRequestSchema, LoginRequest } from '@repo/types';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { AuthCard } from '@/components/auth/AuthCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const loginStore = useAuthStore((state) => state.login);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
  });

  const onSubmit = async (data: LoginRequest) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await api.post('/api/v1/auth/login', data);
      const responseData = response.data.data || response.data;
      const { accessToken, user } = responseData;
      
      loginStore(user, accessToken);
      if (user.forcePasswordChange) {
        router.push(`/reset-password?email=${encodeURIComponent(user.email)}`);
      } else {
        router.push('/');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to login';
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
    <AuthCard title="Hospital Portal" description="Sign in to your staff or patient account">
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
          <div className="flex justify-between items-center">
            <Label htmlFor="password">Password</Label>
            <a href="/forgot-password" className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline">
              Forgot?
            </a>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
        </div>

        <Button type="submit" disabled={isLoading} className="mt-2">
          {isLoading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 rounded-full border-t-white animate-spin mr-2"></span>
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-500">
        Don't have a patient account?{' '}
        <a href="/register" className="text-teal-600 font-semibold hover:text-teal-700 hover:underline">
          Register
        </a>
      </div>
    </AuthCard>
  );
}
