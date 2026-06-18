'use client';

import React, { useEffect, useState, startTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User, Play, CheckCircle2, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

interface QueueItem {
  id: string;
  tokenNumber: number;
  queueStatus: string;
  calledAt: string | null;
  appointment: {
    id: string;
    chiefComplaint: string | null;
    appointmentTime: string;
    patient: {
      firstName: string;
      lastName: string;
      patientNumber: string;
    };
  };
}

interface Stats {
  total: number;
  waiting: number;
  inProgress: number;
  completed: number;
  skipped: number;
}

export default function DoctorQueuePage() {
  const params = useParams();
  const router = useRouter();
  const doctorId = params.doctorId as string;

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchQueue = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/v1/appointments/queue/${doctorId}`);
      setQueue(res.data.queue || []);
      setStats(res.data.stats || null);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch today\'s queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [doctorId]);

  const handleCallPatient = async (queueId: string) => {
    try {
      await api.patch(`/api/v1/appointments/queue/${queueId}/call`);
      fetchQueue();
    } catch (err) {
      console.error(err);
      alert('Failed to call patient.');
    }
  };

  const handleSkipPatient = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to mark this patient as skipped/no-show?')) return;
    try {
      await api.patch(`/api/v1/appointments/${appointmentId}/cancel`, { reason: 'No-show / Skipped from queue' });
      fetchQueue();
    } catch (err) {
      console.error(err);
      alert('Failed to skip patient.');
    }
  };

  return (
    <DashboardLayout allowedRoles={['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/appointments')}
              className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Today's Patient Queue</h1>
              <p className="text-sm text-slate-500 font-semibold mt-0.5">Manage live token calling list and consultation transitions.</p>
            </div>
          </div>
          <button
            onClick={fetchQueue}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition flex items-center gap-2 text-xs font-bold cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" /> Refresh List
          </button>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Total Checked-In</span>
              <span className="font-bold text-slate-800 text-xl mt-0.5">{stats.total} Patients</span>
            </div>
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="block text-[10px] text-blue-400 font-bold uppercase">Waiting Room</span>
              <span className="font-bold text-blue-700 text-xl mt-0.5">{stats.waiting} Patients</span>
            </div>
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm border-l-4 border-l-orange-500">
              <span className="block text-[10px] text-orange-400 font-bold uppercase">In Consultation</span>
              <span className="font-bold text-orange-700 text-xl mt-0.5">{stats.inProgress} Patients</span>
            </div>
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="block text-[10px] text-emerald-400 font-bold uppercase">Completed</span>
              <span className="font-bold text-emerald-700 text-xl mt-0.5">{stats.completed} Patients</span>
            </div>
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Skipped / Missed</span>
              <span className="font-bold text-slate-500 text-xl mt-0.5">{stats.skipped} Patients</span>
            </div>
          </div>
        )}

        {/* Queue list */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-100 overflow-hidden">
          {error && <div className="p-4 text-center text-red-600 bg-red-50 font-bold">{error}</div>}

          {loading ? (
            <div className="p-12 text-center text-slate-500 font-bold flex flex-col items-center justify-center gap-2">
              <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
              <span>Updating live queue...</span>
            </div>
          ) : queue.length === 0 ? (
            <div className="p-16 text-center text-slate-400 font-bold">
              <Layers className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <span>Queue is empty. No appointments scheduled for today.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-4 px-6">Token</th>
                    <th className="p-4 px-6">Patient</th>
                    <th className="p-4 px-6">Appointment Time</th>
                    <th className="p-4 px-6">Chief Complaint</th>
                    <th className="p-4 px-6">Queue Status</th>
                    <th className="p-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700 text-sm">
                  {queue.map((item) => (
                    <tr key={item.id} className={cn(
                      'hover:bg-slate-50/50 transition-colors',
                      item.queueStatus === 'IN_PROGRESS' && 'bg-orange-50/30'
                    )}>
                      <td className="p-4 px-6">
                        <span className="font-mono text-sm font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-lg border border-teal-100">
                          #{item.tokenNumber}
                        </span>
                      </td>
                      <td className="p-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{item.appointment.patient.firstName} {item.appointment.patient.lastName}</span>
                          <span className="text-[10px] text-slate-400 font-bold font-mono mt-0.5">{item.appointment.patient.patientNumber}</span>
                        </div>
                      </td>
                      <td className="p-4 px-6 font-bold text-xs text-slate-500">
                        {item.appointment.appointmentTime}
                      </td>
                      <td className="p-4 px-6 text-slate-500 italic max-w-[200px] truncate">
                        {item.appointment.chiefComplaint || 'Consultation'}
                      </td>
                      <td className="p-4 px-6">
                        <span className={cn(
                          'px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase',
                          item.queueStatus === 'IN_PROGRESS' ? 'bg-orange-50 text-orange-700' :
                          item.queueStatus === 'DONE' ? 'bg-emerald-50 text-emerald-700' :
                          item.queueStatus === 'SKIPPED' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-700'
                        )}>
                          {item.queueStatus.toLowerCase()}
                        </span>
                      </td>
                      <td className="p-4 px-6 text-right flex justify-end gap-2 items-center">
                        {item.queueStatus === 'WAITING' && (
                          <button
                            onClick={() => handleCallPatient(item.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            <Play className="h-3.5 w-3.5" /> Call In
                          </button>
                        )}
                        {item.queueStatus === 'IN_PROGRESS' && (
                          <button
                            onClick={() => router.push(`/consultation/${item.appointment.id}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition cursor-pointer animate-pulse"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Enter Workspace
                          </button>
                        )}
                        {['WAITING', 'IN_PROGRESS'].includes(item.queueStatus) && (
                          <button
                            onClick={() => handleSkipPatient(item.appointment.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-red-50 hover:text-red-700 border border-slate-200 hover:border-red-100 rounded-lg text-xs font-bold transition cursor-pointer text-slate-500"
                          >
                            <AlertCircle className="h-3.5 w-3.5" /> Skip
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
