'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, ShieldAlert, User, Calendar, Check, AlertCircle, Clock } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  patientNumber: string;
  phone: string;
}

interface Department {
  id: string;
  name: string;
}

interface Doctor {
  id: string;
  specialization: string;
  consultationFee: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

interface Slot {
  time: string;
  displayTime: string;
  isAvailable: boolean;
}

export default function BookAppointmentPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Lists
  const [patients, setPatients] = useState<Patient[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  // Search Patients State
  const [patientSearch, setPatientSearch] = useState('');

  // Form selections
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentType, setAppointmentType] = useState('NEW');
  const [chiefComplaint, setChiefComplaint] = useState('');

  const fetchInitialData = async () => {
    try {
      if (!user?.hospitalId) return;
      const deptRes = await api.get(`/api/v1/hospitals/${user.hospitalId}/departments`);
      setDepartments(deptRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  // Search patients
  const searchPatients = async (query: string) => {
    if (!query) {
      setPatients([]);
      return;
    }
    try {
      const res = await api.get('/api/v1/patients', {
        params: { search: query }
      });
      setPatients(res.data.patients || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchPatients(patientSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  // Fetch doctors when department changes
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
      } catch (err) {
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
      } catch (err) {
        console.error(err);
      }
    };
    fetchSlots();
  }, [selectedDoctorId, appointmentDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!selectedPatientId || !selectedDoctorId || !selectedDeptId || !appointmentDate || !appointmentTime) {
      setError('Please select a patient, doctor, date, and available slot.');
      setLoading(false);
      return;
    }

    try {
      await api.post('/api/v1/appointments', {
        patientId: selectedPatientId,
        doctorId: selectedDoctorId,
        departmentId: selectedDeptId,
        appointmentDate,
        appointmentTime,
        appointmentType,
        chiefComplaint: chiefComplaint || null,
      });
      router.push('/appointments');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to book appointment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout allowedRoles={['HOSPITAL_ADMIN', 'RECEPTIONIST']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Book Doctor Appointment</h1>
            <p className="text-sm text-slate-500 font-semibold mt-0.5">Assign patients to doctor working calendars and daily queues.</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 font-semibold text-sm flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Booking Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Select Patient */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                <User className="h-4.5 w-4.5 text-teal-600" />
                Step 1: Patient Search & Select
              </h2>
              
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Type patient name, phone, or PAT number..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm font-medium"
                />

                {patients.length > 0 && (
                  <div className="border border-slate-200 rounded-xl max-h-[180px] overflow-y-auto divide-y divide-slate-100">
                    {patients.map((pat) => (
                      <button
                        key={pat.id}
                        type="button"
                        onClick={() => {
                          setSelectedPatientId(pat.id);
                          setPatientSearch(`${pat.firstName} ${pat.lastName} (${pat.patientNumber})`);
                          setPatients([]);
                        }}
                        className="w-full text-left p-3 hover:bg-slate-50 flex justify-between items-center text-sm font-medium text-slate-700 cursor-pointer"
                      >
                        <div>
                          <p className="font-bold">{pat.firstName} {pat.lastName}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{pat.patientNumber} • {pat.phone}</p>
                        </div>
                        {selectedPatientId === pat.id && <Check className="h-4.5 w-4.5 text-teal-600" />}
                      </button>
                    ))}
                  </div>
                )}
                
                {selectedPatientId && (
                  <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5">
                    <Check className="h-4.5 w-4.5" /> Patient successfully selected.
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Select Dept & Doctor */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Calendar className="h-4.5 w-4.5 text-teal-600" />
                Step 2: Department & Doctor details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Department</label>
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm font-semibold transition"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Consulting Doctor</label>
                  <select
                    value={selectedDoctorId}
                    disabled={!selectedDeptId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm font-semibold transition disabled:opacity-50"
                    required
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        Dr. {doc.user.firstName} {doc.user.lastName} ({doc.specialization})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Step 3: Date & Slot Selector */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Clock className="h-4.5 w-4.5 text-teal-600" />
                Step 3: Availability Date & Slots
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Booking Date</label>
                  <input
                    type="date"
                    value={appointmentDate}
                    disabled={!selectedDoctorId}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm font-semibold transition disabled:opacity-50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Appointment Type</label>
                  <select
                    value={appointmentType}
                    onChange={(e) => setAppointmentType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm font-semibold transition"
                  >
                    <option value="NEW">New Consultation</option>
                    <option value="FOLLOWUP">Follow-up</option>
                    <option value="EMERGENCY">Emergency Consultation</option>
                  </select>
                </div>
              </div>

              {/* Time Slots Grid */}
              {appointmentDate && selectedDoctorId && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Available Slots</span>
                  {slots.length === 0 ? (
                    <div className="p-4 bg-amber-50 text-amber-800 text-xs font-bold rounded-xl flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" /> No available slots or doctor works off-schedule today.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {slots.map((slot) => (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.isAvailable}
                          onClick={() => setAppointmentTime(slot.time)}
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
          </div>

          {/* Right Panel: Chief Complaint and Pricing details */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5">Chief Complaint</h2>
              <textarea
                rows={4}
                placeholder="Reason for consultation, symptoms, or concerns..."
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm font-medium transition"
              />
            </div>

            {selectedDoctorId && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 font-semibold text-sm">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">Fee details</h3>
                <div className="flex justify-between text-slate-600">
                  <span>Consultation Charge:</span>
                  <span className="font-bold text-slate-800">
                    ₹{parseFloat(doctors.find(d => d.id === selectedDoctorId)?.consultationFee || '0').toFixed(0)}
                  </span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !appointmentTime}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition shadow-md shadow-teal-600/10 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Booking...' : 'Book Appointment'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
