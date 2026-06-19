'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Calendar, Clock, Heart, Users, Check, AlertCircle, ShieldAlert, BadgeInfo } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
}

interface Doctor {
  id: string;
  specialization: string;
  consultationFee: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface Slot {
  time: string;
  displayTime: string;
  isAvailable: boolean;
}

export default function PatientBookAppointmentPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Data Lists
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  // Selection state
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentType, setAppointmentType] = useState('NEW');
  const [chiefComplaint, setChiefComplaint] = useState('');

  // Fetch Departments on load
  useEffect(() => {
    const fetchDepartments = async () => {
      if (!user?.hospitalId) return;
      try {
        const res = await api.get(`/api/v1/hospitals/${user.hospitalId}/departments`);
        setDepartments(res.data || []);
      } catch (err: any) {
        console.error(err);
        setError('Failed to fetch hospital departments.');
      }
    };
    fetchDepartments();
  }, [user]);

  // Fetch Doctors when department changes
  useEffect(() => {
    const fetchDoctors = async () => {
      if (!selectedDeptId) {
        setDoctors([]);
        return;
      }
      try {
        const res = await api.get('/api/v1/doctors', {
          params: { departmentId: selectedDeptId }
        });
        setDoctors(res.data || []);
        setSelectedDoctorId('');
        setSlots([]);
        setAppointmentTime('');
      } catch (err: any) {
        console.error(err);
      }
    };
    fetchDoctors();
  }, [selectedDeptId]);

  // Fetch available slots when doctor or date changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDoctorId || !appointmentDate) {
        setSlots([]);
        return;
      }
      try {
        const res = await api.get(`/api/v1/doctors/${selectedDoctorId}/availability`, {
          params: { date: appointmentDate }
        });
        setSlots(res.data.slots || []);
        setAppointmentTime('');
      } catch (err: any) {
        console.error(err);
      }
    };
    fetchSlots();
  }, [selectedDoctorId, appointmentDate]);

  const getSelectedDept = () => departments.find((d) => d.id === selectedDeptId);
  const getSelectedDoctor = () => doctors.find((d) => d.id === selectedDoctorId);

  const handleNextStep = () => {
    if (currentStep === 1 && !selectedDeptId) {
      setError('Please select a department.');
      return;
    }
    if (currentStep === 2 && !selectedDoctorId) {
      setError('Please select a consulting doctor.');
      return;
    }
    if (currentStep === 3 && (!appointmentDate || !appointmentTime)) {
      setError('Please choose a date and an available time slot.');
      return;
    }
    setError('');
    setCurrentStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    setError('');
    setCurrentStep((prev) => prev - 1);
  };

  const handleBookAppointment = async () => {
    setLoading(true);
    setError('');
    try {
      // Resolve patientId
      let patientId = user?.patientId;
      if (!patientId && user) {
        const profileRes = await api.get('/api/v1/patients');
        const profiles = profileRes.data?.patients || profileRes.data?.data || [];
        const myProfile = profiles.find((p: any) => p.userId === user.id);
        if (myProfile) {
          patientId = myProfile.id;
        }
      }

      if (!patientId) {
        setError('No patient profile is linked with your account. Please contact administrative staff.');
        setLoading(false);
        return;
      }

      await api.post('/api/v1/appointments', {
        patientId,
        doctorId: selectedDoctorId,
        departmentId: selectedDeptId,
        appointmentDate,
        appointmentTime,
        appointmentType,
        chiefComplaint: chiefComplaint || null,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push('/my-appointments');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to book appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout allowedRoles={['PATIENT']}>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Self-Service Appointment Booking</h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Select a specialist, date, and schedule your appointment online.</p>
          </div>
          <div className="text-xs bg-teal-50 border border-teal-100 text-teal-700 font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
            Step {currentStep} of 4
          </div>
        </div>

        {/* Step Indicator Bar */}
        <div className="relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
          <div className="relative z-10 flex justify-between">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={cn(
                  'h-8 w-8 rounded-full border-2 flex items-center justify-center font-bold text-xs transition duration-300',
                  currentStep === step
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : currentStep > step
                    ? 'bg-teal-50 border-teal-200 text-teal-650'
                    : 'bg-white border-slate-200 text-slate-400'
                )}
              >
                {currentStep > step ? <Check className="h-4 w-4" /> : step}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-700 font-bold rounded-xl text-xs flex items-center gap-2">
            <ShieldAlert className="h-4.5 w-4.5 text-red-650 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 font-bold rounded-xl text-xs flex items-center gap-2">
            <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
            <span>Appointment request submitted successfully! Redirecting you to your schedule...</span>
          </div>
        )}

        {/* Form Wizard Body */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/85 shadow-sm min-h-[300px]">
          
          {/* Step 1: Select Department */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Choose Clinic Department</h2>
                <p className="text-xs text-slate-400 font-medium">Select the clinic department matching your symptoms or consultation needs.</p>
              </div>

              {departments.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-semibold italic text-xs">
                  No departments available in this hospital.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {departments.map((dept) => (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => {
                        setSelectedDeptId(dept.id);
                        setError('');
                      }}
                      className={cn(
                        'p-5 rounded-2xl border text-left transition duration-200 relative cursor-pointer',
                        selectedDeptId === dept.id
                          ? 'bg-teal-50/50 border-teal-500 shadow-sm shadow-teal-500/5'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] uppercase font-mono font-bold text-teal-600 tracking-wider">
                          {dept.code}
                        </span>
                        {selectedDeptId === dept.id && (
                          <div className="bg-teal-600 rounded-full p-0.5 text-white">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-850 text-sm mt-1">{dept.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">
                        {dept.description || 'General specialist clinical consultations and diagnostics.'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Doctor */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Select Consulting Doctor</h2>
                  <p className="text-xs text-slate-400 font-medium">Consult with leading clinical specialists in the {getSelectedDept()?.name} department.</p>
                </div>
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 cursor-pointer"
                >
                  Change Department
                </button>
              </div>

              {doctors.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-semibold italic text-xs bg-slate-50 rounded-2xl border border-slate-100">
                  No doctors found on active duty for {getSelectedDept()?.name} currently.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {doctors.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => {
                        setSelectedDoctorId(doc.id);
                        setError('');
                      }}
                      className={cn(
                        'p-5 rounded-2xl border text-left transition duration-200 relative cursor-pointer flex gap-4',
                        selectedDoctorId === doc.id
                          ? 'bg-teal-50/50 border-teal-500 shadow-sm shadow-teal-500/5'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      )}
                    >
                      <div className="h-10 w-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm shrink-0">
                        {doc.user.firstName[0]}
                      </div>
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-slate-850 text-sm truncate">
                            Dr. {doc.user.firstName} {doc.user.lastName}
                          </h3>
                          {selectedDoctorId === doc.id && (
                            <div className="bg-teal-600 rounded-full p-0.5 text-white">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-400">{doc.specialization}</p>
                        <div className="pt-1.5 flex justify-between items-center border-t border-slate-50 mt-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fee</span>
                          <span className="text-xs font-extrabold text-slate-800">₹{parseFloat(doc.consultationFee).toFixed(0)}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Date & Slots */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Schedule Date & Slot</h2>
                  <p className="text-xs text-slate-400 font-medium">Select an active calendar date and book an available time window.</p>
                </div>
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 cursor-pointer"
                >
                  Change Doctor
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Consultation Date</label>
                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm font-semibold transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Consultation Type</label>
                  <select
                    value={appointmentType}
                    onChange={(e) => setAppointmentType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm font-semibold transition"
                  >
                    <option value="NEW">New Consultation</option>
                    <option value="FOLLOWUP">Follow-up Visit</option>
                  </select>
                </div>
              </div>

              {appointmentDate && (
                <div className="space-y-3.5 pt-4 border-t border-slate-100">
                  <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Available Schedule Slots</span>
                  {slots.length === 0 ? (
                    <div className="p-4 bg-amber-50/50 text-amber-800 text-xs font-bold rounded-xl flex items-center gap-2 border border-amber-100/50">
                      <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                      <span>The doctor does not have any free slots or does not consult on the selected date. Please choose another date.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {slots.map((slot) => (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.isAvailable}
                          onClick={() => {
                            setAppointmentTime(slot.time);
                            setError('');
                          }}
                          className={cn(
                            'py-2 px-1 text-center rounded-xl text-xs font-bold border transition cursor-pointer',
                            !slot.isAvailable ? 'bg-slate-50 text-slate-350 border-slate-100 cursor-not-allowed' :
                            appointmentTime === slot.time ? 'bg-teal-600 text-white border-teal-600' :
                            'bg-white text-slate-600 border-slate-200 hover:bg-teal-50 hover:border-teal-350'
                          )}
                        >
                          {slot.displayTime}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Symptoms & Confirmation */}
          {currentStep === 4 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Column: Symptoms input */}
              <div className="md:col-span-2 space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Describe Symptoms & Concern</h2>
                  <p className="text-xs text-slate-400 font-medium">Adding brief symptom details helps the doctor prepare for your diagnostic consult.</p>
                </div>
                <textarea
                  rows={6}
                  placeholder="Reason for scheduling the appointment, symptoms, or specific health complaints..."
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm font-medium transition leading-relaxed"
                />
              </div>

              {/* Right Column: Summary Card */}
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl space-y-4 font-semibold text-xs text-slate-700">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200/60 pb-2 flex items-center gap-1.5">
                    <BadgeInfo className="h-4.5 w-4.5 text-teal-650" />
                    Appointment Summary
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Department</span>
                      <p className="text-slate-800 font-bold mt-0.5">{getSelectedDept()?.name}</p>
                    </div>

                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Consultant</span>
                      <p className="text-slate-800 font-bold mt-0.5">Dr. {getSelectedDoctor()?.user.firstName} {getSelectedDoctor()?.user.lastName}</p>
                      <p className="text-[10px] text-slate-450 mt-0.5">{getSelectedDoctor()?.specialization}</p>
                    </div>

                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Date & Time</span>
                      <p className="text-slate-800 font-bold mt-0.5">{new Date(appointmentDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      <p className="text-teal-700 font-bold mt-0.5 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {appointmentTime}
                      </p>
                    </div>

                    <div className="border-t border-slate-200/60 pt-3 flex justify-between items-center text-sm font-bold">
                      <span className="text-slate-550">Consultation Fee</span>
                      <span className="text-slate-800 text-lg font-extrabold">₹{parseFloat(getSelectedDoctor()?.consultationFee || '0').toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Wizard Footer controls */}
        {!success && (
          <div className="flex justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-5 py-3 bg-white border border-slate-200 text-slate-650 hover:bg-slate-55 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <ArrowLeft className="h-4 w-4" /> Previous Step
              </button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-2 shadow-md shadow-teal-650/10"
              >
                Next Step <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBookAppointment}
                disabled={loading}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-2 shadow-md shadow-teal-650/10 disabled:opacity-50"
              >
                {loading ? 'Confirming booking...' : 'Confirm & Request Appointment'}
              </button>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
