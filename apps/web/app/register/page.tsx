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
    // Validate fields for Step 1
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
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Create Patient Account</h1>
          <p className="auth-subtitle">Register to manage your appointments and records</p>
        </div>

        {/* Wizard Steps indicator */}
        <div className="wizard-steps">
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', background: 'rgba(255,255,255,0.05)', transform: 'translateY(-50%)', zIndex: 0 }}></div>
          <div style={{ position: 'absolute', top: '50%', left: 0, width: step === 2 ? '100%' : '0%', height: '2px', background: 'hsl(var(--primary))', transform: 'translateY(-50%)', zIndex: 0, transition: 'width 0.3s ease' }}></div>
          
          <div className={`wizard-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>1</div>
          <div className={`wizard-step ${step >= 2 ? 'active' : ''}`}>2</div>
        </div>

        {error && (
          <div className="form-error" style={{ marginBottom: '1rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '0.375rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          {step === 1 && (
            <div>
              <div className="form-group">
                <label className="form-label" htmlFor="firstName">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  className={`form-input ${errors.firstName ? 'error' : ''}`}
                  placeholder="John"
                  {...register('firstName')}
                />
                {errors.firstName && <p className="form-error">{errors.firstName.message}</p>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="lastName">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  className={`form-input ${errors.lastName ? 'error' : ''}`}
                  placeholder="Doe"
                  {...register('lastName')}
                />
                {errors.lastName && <p className="form-error">{errors.lastName.message}</p>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="john.doe@example.com"
                  {...register('email')}
                />
                {errors.email && <p className="form-error">{errors.email.message}</p>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="phone">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  className={`form-input ${errors.phone ? 'error' : ''}`}
                  placeholder="+919876543210"
                  {...register('phone')}
                />
                {errors.phone && <p className="form-error">{errors.phone.message}</p>}
              </div>

              <button type="button" className="auth-btn" onClick={nextStep}>
                Next
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="••••••••"
                  {...register('password')}
                />
                {errors.password && <p className="form-error">{errors.password.message}</p>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="hospitalId">
                  Hospital ID
                </label>
                <input
                  id="hospitalId"
                  type="text"
                  className={`form-input ${errors.hospitalId ? 'error' : ''}`}
                  placeholder="01HXY..."
                  {...register('hospitalId')}
                />
                {errors.hospitalId && <p className="form-error">{errors.hospitalId.message}</p>}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="auth-btn" style={{ background: 'rgba(255,255,255,0.05)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)' }} onClick={prevStep}>
                  Back
                </button>
                <button type="submit" className="auth-btn" style={{ marginTop: 0 }} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <span className="spinner"></span>
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

        <div className="auth-footer">
          Already have an account?{' '}
          <a href="/login" className="auth-link">
            Sign In
          </a>
        </div>
      </div>
    </div>
  );
}
