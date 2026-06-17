'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordRequestSchema, ForgotPasswordRequest } from '@repo/types';
import api from '../../lib/axios';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
            Forgot Password
          </h1>
          <p className="text-sm text-slate-500">Enter your email to receive a password reset OTP</p>
        </div>

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

          <button
            type="submit"
            className="w-full py-2.5 text-sm font-semibold rounded-lg text-white bg-teal-600 hover:bg-teal-700 active:scale-[0.98] transition duration-150 cursor-pointer flex items-center justify-center shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 rounded-full border-t-white animate-spin mr-2"></span>
                Sending OTP...
              </>
            ) : (
              'Send Reset OTP'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Remember your password?{' '}
          <a href="/login" className="text-teal-600 font-semibold hover:text-teal-700 hover:underline">
            Sign In
          </a>
        </div>
      </div>
    </div>
  );
}
