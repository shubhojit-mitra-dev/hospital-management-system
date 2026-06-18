'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerRequestSchema, RegisterRequest } from '@repo/types';
import api from '@/lib/axios';
import { AuthCard } from '@/components/auth/AuthCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to register';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md h-[500px] rounded-2xl bg-white border border-slate-200/80 shadow-xl shadow-slate-200/30 animate-pulse" />
      </div>
    );
  }

  return (
    <AuthCard title="Create Patient Account" description="Register to manage your appointments and records">
      {/* Wizard Steps indicator */}
      <div className="flex justify-between items-center mb-6 relative px-4">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 -z-10"></div>
        <div 
          className="absolute top-1/2 left-0 h-0.5 bg-teal-600 -translate-y-1/2 -z-10 transition-all duration-300"
          style={{ width: step === 2 ? '100%' : '0%' }}
        ></div>
        
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition z-10 ${step > 1 ? 'bg-emerald-600 text-white' : 'bg-teal-600 text-white shadow-sm shadow-teal-500/20'}`}>
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

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="John"
                aria-invalid={!!errors.firstName}
                {...register('firstName')}
              />
              {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Doe"
                aria-invalid={!!errors.lastName}
                {...register('lastName')}
              />
              {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@example.com"
                aria-invalid={!!errors.email}
                {...register('email')}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+919876543210"
                aria-invalid={!!errors.phone}
                {...register('phone')}
              />
              {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
            </div>

            <Button type="button" onClick={nextStep} className="mt-2">
              Next
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hospitalId">Hospital ID</Label>
              <Input
                id="hospitalId"
                type="text"
                placeholder="01HXY..."
                aria-invalid={!!errors.hospitalId}
                {...register('hospitalId')}
              />
              {errors.hospitalId && <p className="text-xs text-red-500">{errors.hospitalId.message}</p>}
            </div>

            <div className="flex gap-4 pt-2">
              <Button
                type="button"
                variant="outline"
                className="w-1/2"
                onClick={prevStep}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="w-1/2"
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
              </Button>
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
    </AuthCard>
  );
}
