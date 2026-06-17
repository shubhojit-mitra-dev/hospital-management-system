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
      <div className="w-full max-w-md p-8 rounded-2xl bg-white border border-slate-200/80 shadow-xl shadow-slate-200/30">
        
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-teal-50 text-teal-600 border border-teal-100/80 shadow-sm">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-1.5 text-slate-950">
            Create Patient Account
          </h1>
          <p className="text-sm text-slate-500">Register to manage your appointments and records</p>
        </div>

        {/* Wizard Steps indicator */}
        <div className="flex justify-between items-center mb-8 relative px-4">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 -z-10"></div>
          <div 
            className="absolute top-1/2 left-0 h-0.5 bg-teal-600 -translate-y-1/2 -z-10 transition-all duration-300"
            style={{ width: step === 2 ? '100%' : '0%' }}
          ></div>
          
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition z-10 ${step > 1 ? 'bg-emerald-600 text-white' : 'bg-teal-600 text-white shadow-sm shadow-teal-500/20 active'}`}>
            1
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition z-10 ${step === 2 ? 'bg-teal-600 text-white shadow-sm shadow-teal-500/20' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
            2
          </div>
        </div>

        {error && (
          <div className="mb-4 text-center text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700" htmlFor="firstName">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  className={`w-full px-4 py-2.5 text-sm rounded-lg bg-slate-50 border ${errors.firstName ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-teal-600 focus:ring-teal-600/10'} text-slate-900 outline-none transition duration-150 focus:bg-white focus:ring-2`}
                  placeholder="John"
                  {...register('firstName')}
                />
                {errors.firstName && <p className="text-xs text-red-500 mt-1.5">{errors.firstName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700" htmlFor="lastName">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  className={`w-full px-4 py-2.5 text-sm rounded-lg bg-slate-50 border ${errors.lastName ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-teal-600 focus:ring-teal-600/10'} text-slate-900 outline-none transition duration-150 focus:bg-white focus:ring-2`}
                  placeholder="Doe"
                  {...register('lastName')}
                />
                {errors.lastName && <p className="text-xs text-red-500 mt-1.5">{errors.lastName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  className={`w-full px-4 py-2.5 text-sm rounded-lg bg-slate-50 border ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-teal-600 focus:ring-teal-600/10'} text-slate-900 outline-none transition duration-150 focus:bg-white focus:ring-2`}
                  placeholder="john.doe@example.com"
                  {...register('email')}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1.5">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700" htmlFor="phone">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  className={`w-full px-4 py-2.5 text-sm rounded-lg bg-slate-50 border ${errors.phone ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-teal-600 focus:ring-teal-600/10'} text-slate-900 outline-none transition duration-150 focus:bg-white focus:ring-2`}
                  placeholder="+919876543210"
                  {...register('phone')}
                />
                {errors.phone && <p className="text-xs text-red-500 mt-1.5">{errors.phone.message}</p>}
              </div>

              <button
                type="button"
                className="w-full py-2.5 text-sm font-semibold rounded-lg text-white bg-teal-600 hover:bg-teal-700 active:scale-[0.98] transition duration-150 cursor-pointer flex items-center justify-center shadow-sm"
                onClick={nextStep}
              >
                Next
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className={`w-full px-4 py-2.5 text-sm rounded-lg bg-slate-50 border ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-teal-600 focus:ring-teal-600/10'} text-slate-900 outline-none transition duration-150 focus:bg-white focus:ring-2`}
                  placeholder="••••••••"
                  {...register('password')}
                />
                {errors.password && <p className="text-xs text-red-500 mt-1.5">{errors.password.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700" htmlFor="hospitalId">
                  Hospital ID
                </label>
                <input
                  id="hospitalId"
                  type="text"
                  className={`w-full px-4 py-2.5 text-sm rounded-lg bg-slate-50 border ${errors.hospitalId ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-teal-600 focus:ring-teal-600/10'} text-slate-900 outline-none transition duration-150 focus:bg-white focus:ring-2`}
                  placeholder="01HXY..."
                  {...register('hospitalId')}
                />
                {errors.hospitalId && <p className="text-xs text-red-500 mt-1.5">{errors.hospitalId.message}</p>}
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  className="w-1/2 py-2.5 text-sm font-semibold rounded-lg text-slate-700 bg-slate-50 hover:bg-slate-100 active:scale-[0.98] transition duration-150 cursor-pointer flex items-center justify-center border border-slate-200"
                  onClick={prevStep}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 text-sm font-semibold rounded-lg text-white bg-teal-600 hover:bg-teal-700 active:scale-[0.98] transition duration-150 cursor-pointer flex items-center justify-center shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
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

        <div className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <a href="/login" className="text-teal-600 font-semibold hover:text-teal-700 hover:underline">
            Sign In
          </a>
        </div>
      </div>
    </div>
  );
}
