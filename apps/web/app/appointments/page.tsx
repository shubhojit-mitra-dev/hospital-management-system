'use client';

import React, { useEffect, useState, startTransition } from 'react';
import Link from 'next/link';
import { Calendar, Search, Check, X, Play, CheckSquare, Plus, Clock, User, Heart } from 'lucide-react';
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
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    patientNumber: string;
  };
  doctor: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  department: {
    name: string;
  };
}

export default function AppointmentsListPage() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const fetchAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/v1/appointments', {
        params: {
          status: statusFilter || undefined,
          date: dateFilter || undefined,
        },
      });
      setAppointments(response.data || []);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter, dateFilter]);

  const handleConfirm = async (id: string) => {
    try {
      await api.patch(`/api/v1/appointments/${id}/confirm`);
      fetchAppointments();
    } catch (err) {
      console.error(err);
      alert('Failed to confirm appointment.');
    }
  };

  const handleStart = async (id: string) => {
    try {
      await api.patch(`/api/v1/appointments/${id}/start`);
      fetchAppointments();
    } catch (err) {
      console.error(err);
      alert('Failed to start consultation.');
    }
  };

  const handleCancel = async (id: string) => {
    const reason = prompt('Please enter a cancellation reason:');
    if (reason === null) return;
    try {
      await api.patch(`/api/v1/appointments/${id}/cancel`, { reason });
      fetchAppointments();
    } catch (err) {
      console.error(err);
      alert('Failed to cancel appointment.');
    }
  };

  const isReceptionistOrAdmin = user && ['HOSPITAL_ADMIN', 'RECEPTIONIST'].includes(user.role);
  const isDoctor = user?.role === 'DOCTOR';

  return (
    <DashboardLayout allowedRoles={['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Consultation Appointments</h1>
            <p className="text-sm text-slate-500 font-semibold mt-1">Book, track, and manage clinic slots and tokens.</p>
          </div>
          <div className="flex gap-2">
            {isDoctor && (
              <Link
                href={`/appointments/queue/${user.id}`}
                className="flex items-center justify-center gap-1.5 px-4.5 py-3 border border-teal-200 hover:bg-teal-50 text-teal-700 rounded-xl text-sm font-semibold transition cursor-pointer"
              >
                <Clock className="h-4 w-4" />
                Live Queue Board
              </Link>
            )}
            {isReceptionistOrAdmin && (
              <Link
                href="/appointments/new"
                className="flex items-center justify-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-teal-600/10 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                New Appointment
              </Link>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-100 flex flex-wrap md:flex-nowrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => startTransition(() => setStatusFilter(e.target.value))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm font-semibold"
            >
              <option value="">All Statuses</option>
              <option value="REQUESTED">Requested</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="IN_CONSULTATION">In Consultation</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Appointment Date</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => startTransition(() => setDateFilter(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm font-semibold"
            />
          </div>
        </div>

        {/* List Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-100 overflow-hidden">
          {error && <div className="p-4 text-center text-red-600 bg-red-50 font-bold">{error}</div>}

          {loading ? (
            <div className="p-12 text-center text-slate-500 font-bold flex flex-col items-center justify-center gap-2">
              <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
              <span>Fetching appointments...</span>
            </div>
          ) : appointments.length === 0 ? (
            <div className="p-16 text-center text-slate-400 font-bold">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <span>No appointments scheduled.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-4 px-6">Token / Time</th>
                    <th className="p-4 px-6">Patient</th>
                    <th className="p-4 px-6">Doctor</th>
                    <th className="p-4 px-6">Dept / Type</th>
                    <th className="p-4 px-6">Status</th>
                    <th className="p-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700 text-sm">
                  {appointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-slate-50/50">
                      <td className="p-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-teal-700 text-xs bg-teal-50 px-2 py-0.5 rounded border border-teal-100 max-w-[80px] text-center font-mono">
                            Token #{apt.tokenNumber}
                          </span>
                          <span className="text-xs text-slate-500 font-bold mt-1">
                            {new Date(apt.appointmentDate).toLocaleDateString()} at {apt.appointmentTime}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{apt.patient.firstName} {apt.patient.lastName}</span>
                          <span className="text-[10px] text-slate-400 font-bold font-mono mt-0.5">{apt.patient.patientNumber}</span>
                        </div>
                      </td>
                      <td className="p-4 px-6">
                        <span className="font-bold text-slate-800">Dr. {apt.doctor.user.firstName} {apt.doctor.user.lastName}</span>
                      </td>
                      <td className="p-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-slate-600 text-xs">{apt.department.name}</span>
                          <span className="text-[10px] text-slate-400 font-bold tracking-wide uppercase mt-0.5">{apt.appointmentType}</span>
                        </div>
                      </td>
                      <td className="p-4 px-6">
                        <span className={cn(
                          'px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase',
                          apt.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-700 border border-blue-100/50' :
                          apt.status === 'IN_CONSULTATION' ? 'bg-orange-50 text-orange-700 border border-orange-100/50' :
                          apt.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50' :
                          apt.status === 'CANCELLED' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700 border border-amber-100/50'
                        )}>
                          {apt.status.replace('_', ' ').toLowerCase()}
                        </span>
                      </td>
                      <td className="p-4 px-6 text-right flex justify-end gap-2 items-center">
                        {isReceptionistOrAdmin && apt.status === 'REQUESTED' && (
                          <button
                            onClick={() => handleConfirm(apt.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" /> Confirm
                          </button>
                        )}
                        {isDoctor && apt.status === 'CONFIRMED' && (
                          <button
                            onClick={() => handleStart(apt.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition cursor-pointer animate-pulse"
                          >
                            <Play className="h-3.5 w-3.5" /> Call In
                          </button>
                        )}
                        {isDoctor && apt.status === 'IN_CONSULTATION' && (
                          <Link
                            href={`/consultation/${apt.id}`}
                            className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition"
                          >
                            <Heart className="h-3.5 w-3.5" /> Consultation Workspace
                          </Link>
                        )}
                        {['REQUESTED', 'CONFIRMED'].includes(apt.status) && (
                          <button
                            onClick={() => handleCancel(apt.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-red-50 hover:text-red-700 border border-slate-200 hover:border-red-100 rounded-lg text-xs font-bold transition cursor-pointer text-slate-600"
                          >
                            <X className="h-3.5 w-3.5" /> Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
