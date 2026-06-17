'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, User, ChevronRight, ChevronLeft, Check, Loader2, Info, AlertCircle } from 'lucide-react';
import api from '@/lib/axios';

interface FormData {
  name: string;
  registrationNo: string;
  address: string;
  city: string;
  state: string;
  country: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  adminPhone: string;
}

interface FormErrors {
  name?: string;
  registrationNo?: string;
  address?: string;
  city?: string;
  state?: string;
  adminEmail?: string;
  adminPassword?: string;
  adminFirstName?: string;
  adminLastName?: string;
}

const initialFormData: FormData = {
  name: '',
  registrationNo: '',
  address: '',
  city: '',
  state: '',
  country: 'India',
  adminEmail: '',
  adminPassword: '',
  adminFirstName: '',
  adminLastName: '',
  adminPhone: '',
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

export default function RegisterHospitalPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear specific field error on change
    if (fieldErrors[name as keyof FormErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateStep1 = (): boolean => {
    const errs: FormErrors = {};
    if (!formData.name.trim()) errs.name = 'Hospital name is required';
    if (!formData.registrationNo.trim()) errs.registrationNo = 'Registration number is required';
    if (!formData.address.trim()) errs.address = 'Address is required';
    if (!formData.city.trim()) errs.city = 'City is required';
    if (!formData.state.trim()) errs.state = 'State is required';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: FormErrors = {};
    if (!formData.adminFirstName.trim()) errs.adminFirstName = 'First name is required';
    if (!formData.adminLastName.trim()) errs.adminLastName = 'Last name is required';
    if (!formData.adminEmail.trim()) {
      errs.adminEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      errs.adminEmail = 'Enter a valid email address';
    }
    if (!formData.adminPassword.trim()) {
      errs.adminPassword = 'Password is required';
    } else if (formData.adminPassword.length < 8) {
      errs.adminPassword = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(formData.adminPassword)) {
      errs.adminPassword = 'Password must contain at least one uppercase letter';
    } else if (!/[a-z]/.test(formData.adminPassword)) {
      errs.adminPassword = 'Password must contain at least one lowercase letter';
    } else if (!/[0-9]/.test(formData.adminPassword)) {
      errs.adminPassword = 'Password must contain at least one number';
    } else if (!/[@$!%*?&]/.test(formData.adminPassword)) {
      errs.adminPassword = 'Password must contain at least one special character (@$!%*?&)';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
      setError(null);
      setFieldErrors({});
    }
  };

  const handlePrev = () => {
    setStep(1);
    setError(null);
    setFieldErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    setError(null);
    try {
      await api.post('/api/v1/hospitals', formData);
      router.push('/super-admin/hospitals');
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to register hospital';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Register Hospital Tenant</h2>
        <p className="text-sm text-slate-500">Create a new isolated tenant workspace and assign its primary administrator.</p>
      </div>

      {/* Progress Indicators */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            step === 1
              ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
              : 'bg-teal-100 text-teal-700'
          }`}>
            {step > 1 ? <Check className="h-4 w-4" /> : '1'}
          </div>
          <span className={`text-xs font-bold ${step === 1 ? 'text-slate-800' : 'text-slate-400'}`}>Hospital Details</span>
        </div>

        <div className="flex-1 h-px bg-slate-200" />

        <div className="flex items-center gap-2.5">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            step === 2
              ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
              : 'bg-slate-100 text-slate-400'
          }`}>
            2
          </div>
          <span className={`text-xs font-bold ${step === 2 ? 'text-slate-800' : 'text-slate-400'}`}>Admin Setup</span>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-100 text-red-800 text-xs font-semibold rounded-xl">
          <Info className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-teal-600" />
              Step 1: Hospital Profile
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Hospital Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Metro General Hospital"
                  className={`h-10 px-3 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${fieldErrors.name ? 'border-red-400' : 'border-slate-200'}`}
                />
                <FieldError message={fieldErrors.name} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Registration Number *</label>
                <input
                  type="text"
                  name="registrationNo"
                  value={formData.registrationNo}
                  onChange={handleChange}
                  placeholder="e.g. DL-HOSP-2026-99"
                  className={`h-10 px-3 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${fieldErrors.registrationNo ? 'border-red-400' : 'border-slate-200'}`}
                />
                <FieldError message={fieldErrors.registrationNo} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">Address *</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Full physical street address..."
                rows={3}
                className={`p-3 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${fieldErrors.address ? 'border-red-400' : 'border-slate-200'}`}
              />
              <FieldError message={fieldErrors.address} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="New Delhi"
                  className={`h-10 px-3 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${fieldErrors.city ? 'border-red-400' : 'border-slate-200'}`}
                />
                <FieldError message={fieldErrors.city} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">State *</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="Delhi"
                  className={`h-10 px-3 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${fieldErrors.state ? 'border-red-400' : 'border-slate-200'}`}
                />
                <FieldError message={fieldErrors.state} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Country</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="India"
                  className="h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-teal-500/10 transition"
              >
                Next Step
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
              <User className="h-4 w-4 text-teal-600" />
              Step 2: Hospital Admin Credentials
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">First Name *</label>
                <input
                  type="text"
                  name="adminFirstName"
                  value={formData.adminFirstName}
                  onChange={handleChange}
                  placeholder="Rakesh"
                  className={`h-10 px-3 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${fieldErrors.adminFirstName ? 'border-red-400' : 'border-slate-200'}`}
                />
                <FieldError message={fieldErrors.adminFirstName} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Last Name *</label>
                <input
                  type="text"
                  name="adminLastName"
                  value={formData.adminLastName}
                  onChange={handleChange}
                  placeholder="Verma"
                  className={`h-10 px-3 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${fieldErrors.adminLastName ? 'border-red-400' : 'border-slate-200'}`}
                />
                <FieldError message={fieldErrors.adminLastName} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">Admin Email *</label>
              <input
                type="email"
                name="adminEmail"
                value={formData.adminEmail}
                onChange={handleChange}
                placeholder="admin@apollodelhi.com"
                className={`h-10 px-3 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${fieldErrors.adminEmail ? 'border-red-400' : 'border-slate-200'}`}
              />
              <FieldError message={fieldErrors.adminEmail} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">Admin Password *</label>
              <input
                type="password"
                name="adminPassword"
                value={formData.adminPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className={`h-10 px-3 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${fieldErrors.adminPassword ? 'border-red-400' : 'border-slate-200'}`}
              />
              <FieldError message={fieldErrors.adminPassword} />
              <p className="text-[11px] text-slate-400 mt-0.5">Min 8 chars, upper & lowercase, number, and special character (@$!%*?&)</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">Admin Phone (Optional)</label>
              <input
                type="text"
                name="adminPhone"
                value={formData.adminPhone}
                onChange={handleChange}
                placeholder="+919999999999"
                className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex justify-between pt-4 gap-4">
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold transition"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-teal-500/10 transition disabled:opacity-70"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Complete Registration
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
