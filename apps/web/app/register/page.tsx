'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerRequestSchema, RegisterRequest } from '@repo/types';
import api from '../../lib/axios';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<RegisterRequest>({
    resolver: zodResolver(registerRequestSchema),
    mode: 'onTouched',
  });

  const nextStep = async (e: React.MouseEvent) => {
    e.preventDefault();
    const isValid = await trigger(['firstName', 'lastName', 'email', 'phone']);
    if (isValid) {
      setStep(2);
      setError(null);
    }
  };

  const prevStep = (e: React.MouseEvent) => {
    e.preventDefault();
    setStep(1);
  };

  const onSubmit = async (data: RegisterRequest) => {
    setError(null);
    setIsLoading(true);
    try {
      await api.post('/api/v1/auth/register', data);
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to register';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="relative w-full max-w-md p-8 rounded-2xl bg-slate-900/45 backdrop-blur-xl border border-white/8 shadow-2xl overflow-hidden before:content-[''] before:absolute before:-top-1/2 before:-left-1/2 before:w-[200%] before:height-[200%] before:bg-[radial-gradient(circle,rgba(139,92,246,0.08)_0%,transparent_60%)] before:pointer-events-none">
        
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-violet-300 bg-clip-text text-transparent">
            Create Patient Account
          </h1>
          <p className="text-sm text-slate-400">Register to manage your appointments and records</p>
        </div>

        {/* Wizard Steps indicator */}
        <div className="flex justify-between items-center mb-8 relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -translate-y-1/2 -z-10"></div>
          <div 
            className="absolute top-1/2 left-0 h-0.5 bg-violet-500 -translate-y-1/2 -z-10 transition-all duration-300"
            style={{ width: step === 2 ? '100%' : '0%' }}
          ></div>
          
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition z-10 ${step > 1 ? 'bg-emerald-600 text-white' : 'bg-violet-600 text-white shadow-lg shadow-violet-500/50 active'}`}>
            1
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition z-10 ${step === 2 ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/50' : 'bg-slate-800 text-slate-400 border border-white/10'}`}>
            2
          </div>
        </div>

        {error && (
          <div className="mb-4 text-center text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-200" htmlFor="firstName">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  className={`w-full px-4 py-3 text-sm rounded-lg bg-slate-950/50 border ${errors.firstName ? 'border-red-400' : 'border-white/10'} text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20`}
                  placeholder="John"
                  {...register('firstName')}
                />
                {errors.firstName && <p className="text-xs text-red-400 mt-1.5">{errors.firstName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-200" htmlFor="lastName">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  className={`w-full px-4 py-3 text-sm rounded-lg bg-slate-950/50 border ${errors.lastName ? 'border-red-400' : 'border-white/10'} text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20`}
                  placeholder="Doe"
                  {...register('lastName')}
                />
                {errors.lastName && <p className="text-xs text-red-400 mt-1.5">{errors.lastName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-200" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  className={`w-full px-4 py-3 text-sm rounded-lg bg-slate-950/50 border ${errors.email ? 'border-red-400' : 'border-white/10'} text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20`}
                  placeholder="john.doe@example.com"
                  {...register('email')}
                />
                {errors.email && <p className="text-xs text-red-400 mt-1.5">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-200" htmlFor="phone">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  className={`w-full px-4 py-3 text-sm rounded-lg bg-slate-950/50 border ${errors.phone ? 'border-red-400' : 'border-white/10'} text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20`}
                  placeholder="+919876543210"
                  {...register('phone')}
                />
                {errors.phone && <p className="text-xs text-red-400 mt-1.5">{errors.phone.message}</p>}
              </div>

              <button
                type="button"
                className="w-full py-3 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 active:scale-[0.98] transition cursor-pointer flex items-center justify-center"
                onClick={nextStep}
              >
                Next
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-200" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className={`w-full px-4 py-3 text-sm rounded-lg bg-slate-950/50 border ${errors.password ? 'border-red-400' : 'border-white/10'} text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20`}
                  placeholder="••••••••"
                  {...register('password')}
                />
                {errors.password && <p className="text-xs text-red-400 mt-1.5">{errors.password.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-200" htmlFor="hospitalId">
                  Hospital ID
                </label>
                <input
                  id="hospitalId"
                  type="text"
                  className={`w-full px-4 py-3 text-sm rounded-lg bg-slate-950/50 border ${errors.hospitalId ? 'border-red-400' : 'border-white/10'} text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20`}
                  placeholder="01HXY..."
                  {...register('hospitalId')}
                />
                {errors.hospitalId && <p className="text-xs text-red-400 mt-1.5">{errors.hospitalId.message}</p>}
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  className="w-1/2 py-3 text-sm font-semibold rounded-lg text-white bg-slate-800 hover:bg-slate-700 active:scale-[0.98] transition cursor-pointer flex items-center justify-center border border-white/10"
                  onClick={prevStep}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 active:scale-[0.98] transition cursor-pointer flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white/30 rounded-full border-t-white animate-spin mr-2"></span>
                      Registering...
                    </>
                  ) : (
                    'Register'
                  )}
                </button>
              </div>
            </div>
          )}
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <a href="/login" className="text-violet-400 font-medium hover:underline">
            Sign In
          </a>
        </div>
      </div>
    </div>
  );
}
