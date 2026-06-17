'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { verifyEmailRequestSchema, VerifyEmailRequest } from '@repo/types';
import api from '../../lib/axios';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const emailParam = searchParams.get('email') || '';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<VerifyEmailRequest>({
    resolver: zodResolver(verifyEmailRequestSchema),
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

  const onSubmit = async (data: VerifyEmailRequest) => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
      await api.post('/api/v1/auth/verify-email', data);
      router.push('/login');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to verify email';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="relative w-full max-w-md p-8 rounded-2xl bg-slate-900/45 backdrop-blur-xl border border-white/8 shadow-2xl overflow-hidden before:content-[''] before:absolute before:-top-1/2 before:-left-1/2 before:w-[200%] before:height-[200%] before:bg-[radial-gradient(circle,rgba(139,92,246,0.08)_0%,transparent_60%)] before:pointer-events-none">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-violet-300 bg-clip-text text-transparent">
            Verify Email
          </h1>
          <p className="text-sm text-slate-400">Please enter the 6-digit OTP code sent to your email</p>
        </div>

        {error && (
          <div className="mb-4 text-center text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 text-center text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-200" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className={`w-full px-4 py-3 text-sm rounded-lg bg-slate-950/50 border ${errors.email ? 'border-red-400' : 'border-white/10'} text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20`}
              placeholder="you@hospital.com"
              {...register('email')}
            />
            {errors.email && <p className="text-xs text-red-400 mt-1.5">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-200" htmlFor="code">
              Verification Code
            </label>
            <input
              id="code"
              type="text"
              className={`w-full px-4 py-3 text-sm rounded-lg bg-slate-950/50 border ${errors.code ? 'border-red-400' : 'border-white/10'} text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20`}
              placeholder="Enter 6-digit code"
              {...register('code')}
            />
            {errors.code && <p className="text-xs text-red-400 mt-1.5">{errors.code.message}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-3 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 active:scale-[0.98] transition cursor-pointer flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 rounded-full border-t-white animate-spin mr-2"></span>
                Verifying...
              </>
            ) : (
              'Verify Email'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          Didn't get the code?{' '}
          <a href="/login" className="text-violet-400 font-medium hover:underline">
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}
