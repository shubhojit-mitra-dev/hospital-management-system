'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordRequestSchema, ResetPasswordRequest } from '@repo/types';
import api from '../../lib/axios';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-md p-8 rounded-2xl bg-white border border-slate-200/80 shadow-xl shadow-slate-200/30">
        
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-teal-50 text-teal-600 border border-teal-100/80 shadow-sm">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-1.5 text-slate-950">
            Reset Password
          </h1>
          <p className="text-sm text-slate-500">Enter the OTP sent to your email and your new password</p>
        </div>

        {error && (
          <div className="mb-4 text-center text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-700" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className={`w-full px-4 py-2.5 text-sm rounded-lg bg-slate-50 border ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-teal-600 focus:ring-teal-600/10'} text-slate-900 outline-none transition duration-150 focus:bg-white focus:ring-2`}
              placeholder="you@hospital.com"
              {...register('email')}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1.5">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-700" htmlFor="code">
              Reset Code
            </label>
            <input
              id="code"
              type="text"
              className={`w-full px-4 py-2.5 text-sm rounded-lg bg-slate-50 border ${errors.code ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-teal-600 focus:ring-teal-600/10'} text-slate-900 outline-none transition duration-150 focus:bg-white focus:ring-2`}
              placeholder="Enter 6-digit OTP"
              {...register('code')}
            />
            {errors.code && <p className="text-xs text-red-500 mt-1.5">{errors.code.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-700" htmlFor="newPassword">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              className={`w-full px-4 py-2.5 text-sm rounded-lg bg-slate-50 border ${errors.newPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-teal-600 focus:ring-teal-600/10'} text-slate-900 outline-none transition duration-150 focus:bg-white focus:ring-2`}
              placeholder="••••••••"
              {...register('newPassword')}
            />
            {errors.newPassword && <p className="text-xs text-red-500 mt-1.5">{errors.newPassword.message}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 text-sm font-semibold rounded-lg text-white bg-teal-600 hover:bg-teal-700 active:scale-[0.98] transition duration-150 cursor-pointer flex items-center justify-center shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 rounded-full border-t-white animate-spin mr-2"></span>
                Resetting...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Remembered your password?{' '}
          <a href="/login" className="text-teal-600 font-semibold hover:text-teal-700 hover:underline">
            Sign In
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen text-slate-400">Loading...</div>}>
      <ResetPasswordContent />
    </React.Suspense>
  );
}
