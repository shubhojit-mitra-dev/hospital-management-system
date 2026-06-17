'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginRequestSchema, LoginRequest } from '@repo/types';
import api from '../../lib/axios';
import { useAuthStore } from '../../store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const loginStore = useAuthStore((state) => state.login);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      const { accessToken, user } = response.data.data;
      
      loginStore(user, accessToken);
      router.push('/');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to login';
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
            Hospital Portal
          </h1>
          <p className="text-sm text-slate-500">Sign in to your staff or patient account</p>
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
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm font-medium text-slate-700" htmlFor="password">
                Password
              </label>
              <a href="/forgot-password" className="text-xs font-medium text-teal-600 hover:text-teal-700 hover:underline">
                Forgot?
              </a>
            </div>
            <input
              id="password"
              type="password"
              className={`w-full px-4 py-2.5 text-sm rounded-lg bg-slate-50 border ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-teal-600 focus:ring-teal-600/10'} text-slate-900 outline-none transition duration-150 focus:bg-white focus:ring-2`}
              placeholder="••••••••"
              {...register('password')}
            />
            {errors.password && <p className="text-xs text-red-500 mt-1.5">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 text-sm font-semibold rounded-lg text-white bg-teal-600 hover:bg-teal-700 active:scale-[0.98] transition duration-150 cursor-pointer flex items-center justify-center shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 rounded-full border-t-white animate-spin mr-2"></span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Don't have a patient account?{' '}
          <a href="/register" className="text-teal-600 font-semibold hover:text-teal-700 hover:underline">
            Register
          </a>
        </div>
      </div>
    </div>
  );
}
