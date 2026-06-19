'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, ChevronRight, AlertTriangle, CheckCircle, ShieldAlert, X, Edit, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

interface Appointment {
  id: string;
  tokenNumber: number;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  status: string;
  chiefComplaint: string | null;
  cancellationReason: string | null;
  doctor: {
    id: string;
    specialization: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  department: {
    name: string;
  };
}

interface Slot {
  time: string;
  displayTime: string;
  isAvailable: boolean;
}

export default function MyAppointmentsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  // Cancel Modal State
  const [cancelingApt, setCancelingApt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Reschedule Modal State
  const [reschedulingApt, setReschedulingApt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<Slot[]>([]);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  const fetchAppointments = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/v1/appointments');
      setAppointments(res.data || []);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load your appointments schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [user]);

  // Fetch available slots for rescheduling
  useEffect(() => {
    const fetchRescheduleSlots = async () => {
      if (!reschedulingApt || !rescheduleDate) {
        setRescheduleSlots([]);
        return;
      }
      try {
        const res = await api.get(`/api/v1/doctors/${reschedulingApt.doctor.id}/availability`, {
          params: { date: rescheduleDate }
        });
        setRescheduleSlots(res.data.slots || []);
        setRescheduleTime('');
      } catch (err: any) {
        console.error(err);
      }
    };
    fetchRescheduleSlots();
  }, [reschedulingApt, rescheduleDate]);

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelingApt) return;
    setCancelLoading(true);
    try {
      await api.patch(`/api/v1/appointments/${cancelingApt.id}/cancel`, {
        reason: cancelReason || 'Cancelled by patient online.'
      });
      setCancelingApt(null);
      setCancelReason('');
      fetchAppointments();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to cancel the appointment.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingApt || !rescheduleDate || !rescheduleTime) return;
    setRescheduleLoading(true);
    try {
      await api.patch(`/api/v1/appointments/${reschedulingApt.id}/reschedule`, {
        newDate: rescheduleDate,
        newTime: rescheduleTime
      });
      setReschedulingApt(null);
      setRescheduleDate('');
      setRescheduleTime('');
      fetchAppointments();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to reschedule the appointment.');
    } finally {
      setRescheduleLoading(false);
    }
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Categorize
  const upcomingList = appointments.filter((apt) => {
    const aptDate = new Date(apt.appointmentDate);
    return (aptDate >= now && !['CANCELLED', 'COMPLETED', 'RESCHEDULED'].includes(apt.status));
  });

  const pastList = appointments.filter((apt) => {
    const aptDate = new Date(apt.appointmentDate);
    return (aptDate < now || ['CANCELLED', 'COMPLETED', 'RESCHEDULED'].includes(apt.status));
  });

  const currentList = activeTab === 'upcoming' ? upcomingList : pastList;

  return (
    <DashboardLayout allowedRoles={['PATIENT']}>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">My Consultations & Appointments</h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">View and manage your upcoming schedule and past consultation records.</p>
          </div>
          <button
            onClick={() => router.push('/book-appointment')}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/10 transition cursor-pointer self-start sm:self-center"
          >
            Book New Appointment
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-700 font-bold rounded-xl text-xs flex items-center gap-2">
            <ShieldAlert className="h-4.5 w-4.5 text-red-650 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex gap-2 border-b border-slate-200/60 pb-0.5">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={cn(
              'px-4 py-2.5 font-bold text-xs border-b-2 transition-all cursor-pointer',
              activeTab === 'upcoming'
                ? 'border-teal-600 text-teal-750'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            Upcoming Consultations ({upcomingList.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={cn(
              'px-4 py-2.5 font-bold text-xs border-b-2 transition-all cursor-pointer',
              activeTab === 'past'
                ? 'border-teal-600 text-teal-750'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            History & Closed ({pastList.length})
          </button>
        </div>

        {/* Main List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3">
            <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
            <span>Loading schedule...</span>
          </div>
        ) : currentList.length === 0 ? (
          <div className="text-center p-16 bg-slate-50 rounded-2xl border border-slate-200/60 italic text-slate-400 font-medium text-xs">
            No {activeTab} appointments found.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {currentList.map((apt) => {
              const aptDateObj = new Date(apt.appointmentDate);
              return (
                <div
                  key={apt.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  {/* Left block: details */}
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-650 shrink-0 mt-0.5">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div className="space-y-1 font-semibold text-xs text-slate-700">
                      <h3 className="text-sm font-extrabold text-slate-850">
                        Dr. {apt.doctor.user.firstName} {apt.doctor.user.lastName}
                      </h3>
                      <p className="text-slate-400 font-bold">{apt.doctor.specialization} • {apt.department.name}</p>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1.5 text-slate-600 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {aptDateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1 text-teal-700 font-bold">
                          <Clock className="h-3.5 w-3.5" />
                          {apt.appointmentTime}
                        </span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase text-slate-550">
                          Token #{apt.tokenNumber}
                        </span>
                      </div>
                      
                      {apt.chiefComplaint && (
                        <p className="text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 inline-block mt-2">
                          <strong className="text-slate-700">Complaint:</strong> {apt.chiefComplaint}
                        </p>
                      )}

                      {apt.status === 'CANCELLED' && apt.cancellationReason && (
                        <p className="text-[11px] text-red-700 bg-red-50/50 px-2.5 py-1.5 rounded-lg border border-red-100 inline-block mt-2">
                          <strong className="text-red-800">Cancellation Reason:</strong> {apt.cancellationReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right block: status badge & actions */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 border-slate-100 pt-3.5 md:pt-0 gap-3.5">
                    <span
                      className={cn(
                        'text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider',
                        apt.status === 'CONFIRMED'
                          ? 'bg-emerald-150 text-emerald-800 bg-emerald-100'
                          : apt.status === 'REQUESTED'
                          ? 'bg-blue-100 text-blue-800'
                          : apt.status === 'COMPLETED'
                          ? 'bg-teal-100 text-teal-800'
                          : apt.status === 'CANCELLED'
                          ? 'bg-red-100 text-red-800'
                          : apt.status === 'RESCHEDULED'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-100 text-amber-800'
                      )}
                    >
                      {apt.status}
                    </span>

                    {/* Active Patient operations */}
                    {activeTab === 'upcoming' && ['REQUESTED', 'CONFIRMED'].includes(apt.status) && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReschedulingApt(apt);
                            setRescheduleDate(apt.appointmentDate.split('T')[0] ?? '');
                          }}
                          className="p-2 border border-slate-200 text-slate-600 hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50/20 rounded-xl transition cursor-pointer"
                          title="Reschedule Consultation"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancelingApt(apt)}
                          className="p-2 border border-slate-200 text-slate-650 hover:border-red-500 hover:text-red-700 hover:bg-red-50/20 rounded-xl transition cursor-pointer"
                          title="Cancel Consultation"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Cancel Appointment */}
        {cancelingApt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white max-w-md w-full rounded-2xl border border-slate-200/80 shadow-2xl p-6 relative animate-in zoom-in-95 duration-150">
              <button
                onClick={() => setCancelingApt(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              
              <form onSubmit={handleCancelSubmit} className="space-y-4">
                <div className="flex items-center gap-2.5 text-red-650">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <h3 className="font-extrabold text-slate-850 text-sm">Cancel Doctor Appointment?</h3>
                </div>
                
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Are you sure you want to cancel your consultation scheduled with{' '}
                  <strong className="text-slate-800">
                    Dr. {cancelingApt.doctor.user.firstName} {cancelingApt.doctor.user.lastName}
                  </strong>{' '}
                  on {new Date(cancelingApt.appointmentDate).toLocaleDateString()} at {cancelingApt.appointmentTime}?
                </p>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Reason for Cancellation</label>
                  <textarea
                    rows={3}
                    placeholder="Provide a brief explanation..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 text-xs font-medium transition"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCancelingApt(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Keep Appointment
                  </button>
                  <button
                    type="submit"
                    disabled={cancelLoading}
                    className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-650/10 cursor-pointer disabled:opacity-50"
                  >
                    {cancelLoading ? 'Canceling...' : 'Confirm Cancellation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Reschedule Appointment */}
        {reschedulingApt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white max-w-lg w-full rounded-2xl border border-slate-200/80 shadow-2xl p-6 relative animate-in zoom-in-95 duration-150">
              <button
                onClick={() => setReschedulingApt(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              
              <form onSubmit={handleRescheduleSubmit} className="space-y-4">
                <div className="flex items-center gap-2.5 text-teal-650">
                  <Clock className="h-5 w-5 shrink-0" />
                  <h3 className="font-extrabold text-slate-850 text-sm">Reschedule Appointment</h3>
                </div>

                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Select a new date and choose from available slots to reschedule your appointment with{' '}
                  <strong className="text-slate-850">
                    Dr. {reschedulingApt.doctor.user.firstName} {reschedulingApt.doctor.user.lastName}
                  </strong>.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">New Consultation Date</label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-xs font-semibold transition"
                      required
                    />
                  </div>

                  {rescheduleDate && (
                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Choose New Time Slot</span>
                      {rescheduleSlots.length === 0 ? (
                        <div className="p-3 bg-amber-50 text-amber-800 text-xs font-bold rounded-xl flex items-center gap-2">
                          <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                          No available slots or doctor works off-schedule today.
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-1">
                          {rescheduleSlots.map((slot) => (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={!slot.isAvailable}
                              onClick={() => setRescheduleTime(slot.time)}
                              className={cn(
                                'py-2 px-1 text-center rounded-xl text-[11px] font-bold border transition cursor-pointer',
                                !slot.isAvailable ? 'bg-slate-50 text-slate-350 border-slate-100 cursor-not-allowed' :
                                rescheduleTime === slot.time ? 'bg-teal-600 text-white border-teal-600' :
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

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReschedulingApt(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-650 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Keep Schedule
                  </button>
                  <button
                    type="submit"
                    disabled={rescheduleLoading || !rescheduleTime}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/10 cursor-pointer disabled:opacity-50"
                  >
                    {rescheduleLoading ? 'Rescheduling...' : 'Confirm Reschedule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
