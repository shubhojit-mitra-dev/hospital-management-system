'use client';

import React, { useEffect, useState, startTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Calendar, Clock, ClipboardList, ShieldAlert, Check, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

interface Schedule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  maxPatients: number;
  isActive: boolean;
}

interface Leave {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  leaveType: string;
  status: string;
}

interface Doctor {
  id: string;
  registrationNo: string;
  specialization: string;
  qualification: string;
  experienceYears: number;
  consultationFee: string;
  followUpFee: string;
  slotDurationMins: number;
  isAvailable: boolean;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  department: {
    name: string;
  };
}

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export default function DoctorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const doctorId = params.id as string;

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'schedule' | 'leaves'>('profile');

  // Leave form state
  const [showAddLeave, setShowAddLeave] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    leaveType: 'PERSONAL',
  });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [docRes, schedRes, leavesRes] = await Promise.all([
        api.get(`/api/v1/doctors/${doctorId}`),
        api.get(`/api/v1/doctors/${doctorId}/schedule`),
        api.get(`/api/v1/doctors/${doctorId}/leaves`),
      ]);

      setDoctor(docRes.data);
      setSchedules(schedRes.data || []);
      setLeaves(leavesRes.data || []);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch doctor details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [doctorId]);

  // Profile Save
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!doctor) return;
    try {
      await api.patch(`/api/v1/doctors/${doctorId}`, {
        specialization: doctor.specialization,
        qualification: doctor.qualification,
        experienceYears: doctor.experienceYears,
        consultationFee: doctor.consultationFee,
        followUpFee: doctor.followUpFee,
        slotDurationMins: doctor.slotDurationMins,
      });
      setSuccess('Doctor profile updated successfully.');
    } catch (err) {
      console.error(err);
      setError('Failed to update doctor profile.');
    }
  };

  // Schedule Save
  const handleScheduleToggle = (dayIndex: number) => {
    setSchedules((prev) => {
      const match = prev.find((s) => s.dayOfWeek === dayIndex);
      if (match) {
        return prev.map((s) => s.dayOfWeek === dayIndex ? { ...s, isActive: !s.isActive } : s);
      } else {
        return [...prev, {
          id: '',
          dayOfWeek: dayIndex,
          startTime: '09:00',
          endTime: '17:00',
          maxPatients: 20,
          isActive: true
        }];
      }
    });
  };

  const handleScheduleTimeChange = (dayIndex: number, field: 'startTime' | 'endTime', val: string) => {
    setSchedules((prev) =>
      prev.map((s) => s.dayOfWeek === dayIndex ? { ...s, [field]: val } : s)
    );
  };

  const saveSchedules = async () => {
    setError('');
    setSuccess('');
    try {
      await api.post(`/api/v1/doctors/${doctorId}/schedule`, { schedules });
      setSuccess('Weekly schedules saved successfully.');
    } catch (err) {
      console.error(err);
      setError('Failed to save schedules.');
    }
  };

  // Apply Leave
  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post(`/api/v1/doctors/${doctorId}/leaves`, leaveForm);
      setSuccess('Leave applied successfully.');
      setShowAddLeave(false);
      setLeaveForm({ startDate: '', endDate: '', reason: '', leaveType: 'PERSONAL' });
      // Refresh leaves
      const leavesRes = await api.get(`/api/v1/doctors/${doctorId}/leaves`);
      setLeaves(leavesRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to apply leave.');
    }
  };

  const cancelLeave = async (leaveId: string) => {
    setError('');
    setSuccess('');
    try {
      await api.delete(`/api/v1/doctors/${doctorId}/leaves/${leaveId}`);
      setSuccess('Leave cancelled successfully.');
      // Refresh leaves
      const leavesRes = await api.get(`/api/v1/doctors/${doctorId}/leaves`);
      setLeaves(leavesRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to cancel leave.');
    }
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['HOSPITAL_ADMIN']}>
        <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
          <span className="font-semibold">Loading profile...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!doctor) {
    return (
      <DashboardLayout allowedRoles={['HOSPITAL_ADMIN']}>
        <div className="text-center p-12 text-slate-500">Doctor not found.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['HOSPITAL_ADMIN']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/doctors')}
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Dr. {doctor.user.firstName} {doctor.user.lastName}
            </h1>
            <p className="text-sm text-slate-500 font-semibold mt-0.5">
              {doctor.department.name} • {doctor.specialization}
            </p>
          </div>
        </div>

        {/* Status Messages */}
        {error && <div className="p-4 bg-red-50 text-red-700 font-bold rounded-xl text-sm">{error}</div>}
        {success && <div className="p-4 bg-emerald-50 text-emerald-800 font-bold rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" /> {success}
        </div>}

        {/* Tabs */}
        <div className="flex border-b border-slate-200 gap-6">
          {(['profile', 'schedule', 'leaves'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => startTransition(() => {
                setActiveTab(tab);
                setSuccess('');
                setError('');
              })}
              className={cn(
                'py-3 border-b-2 font-semibold text-sm transition-all capitalize px-1 cursor-pointer',
                activeTab === tab
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              {tab === 'profile' ? 'Clinical Profile' : tab}
            </button>
          ))}
        </div>

        {/* Tab contents */}
        <div className="space-y-6">
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
              <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3">Professional Credentials</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Specialization</label>
                  <input
                    type="text"
                    value={doctor.specialization}
                    onChange={(e) => setDoctor({ ...doctor, specialization: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Qualification</label>
                  <input
                    type="text"
                    value={doctor.qualification}
                    onChange={(e) => setDoctor({ ...doctor, qualification: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Experience (Years)</label>
                  <input
                    type="number"
                    value={doctor.experienceYears}
                    onChange={(e) => setDoctor({ ...doctor, experienceYears: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Consultation Fee (₹)</label>
                  <input
                    type="number"
                    value={doctor.consultationFee}
                    onChange={(e) => setDoctor({ ...doctor, consultationFee: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Follow-up Fee (₹)</label>
                  <input
                    type="number"
                    value={doctor.followUpFee}
                    onChange={(e) => setDoctor({ ...doctor, followUpFee: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Slot Duration (Mins)</label>
                  <select
                    value={doctor.slotDurationMins}
                    onChange={(e) => setDoctor({ ...doctor, slotDurationMins: parseInt(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold transition"
                  >
                    <option value="15">15 Minutes</option>
                    <option value="20">20 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="45">45 Minutes</option>
                    <option value="60">60 Minutes</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition shadow-md shadow-teal-600/10 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  Save Credentials
                </button>
              </div>
            </form>
          )}

          {/* SCHEDULE TAB */}
          {activeTab === 'schedule' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Weekly availability hours</h2>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Toggle working days and set start / end time slots.</p>
                </div>
                <button
                  onClick={saveSchedules}
                  className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-teal-600/10 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  Save Schedules
                </button>
              </div>

              <div className="space-y-4">
                {DAYS_OF_WEEK.map((dayName, idx) => {
                  const sched = schedules.find((s) => s.dayOfWeek === idx);
                  const isActive = sched ? sched.isActive : false;

                  return (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50/20 text-sm font-semibold">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => handleScheduleToggle(idx)}
                          className="h-4.5 w-4.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                        />
                        <span className="font-bold text-slate-800 min-w-[100px]">{dayName}</span>
                      </div>

                      {isActive && sched && (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Start</span>
                            <input
                              type="time"
                              value={sched.startTime}
                              onChange={(e) => handleScheduleTimeChange(idx, 'startTime', e.target.value)}
                              className="px-2 py-1 border border-slate-200 rounded-lg text-sm bg-white"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 uppercase font-bold">End</span>
                            <input
                              type="time"
                              value={sched.endTime}
                              onChange={(e) => handleScheduleTimeChange(idx, 'endTime', e.target.value)}
                              className="px-2 py-1 border border-slate-200 rounded-lg text-sm bg-white"
                            />
                          </div>
                        </div>
                      )}

                      {!isActive && (
                        <span className="text-slate-400 text-xs font-bold italic">Not working / Closed</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LEAVES TAB */}
          {activeTab === 'leaves' && (
            <div className="space-y-6">
              {/* Apply Leave Modal trigger */}
              {showAddLeave ? (
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5">Record Doctor Leave</h3>
                  <form onSubmit={handleLeaveSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Start Date</label>
                      <input
                        type="date"
                        value={leaveForm.startDate}
                        onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">End Date</label>
                      <input
                        type="date"
                        value={leaveForm.endDate}
                        onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Leave Type</label>
                      <select
                        value={leaveForm.leaveType}
                        onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold"
                      >
                        <option value="PERSONAL">Personal</option>
                        <option value="SICK">Sick Leave</option>
                        <option value="CONFERENCE">Conference</option>
                        <option value="VACATION">Vacation</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Reason</label>
                      <input
                        type="text"
                        value={leaveForm.reason}
                        onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                        placeholder="e.g. Attending Cardiologists Conference"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold"
                      />
                    </div>
                    <div className="flex gap-2 col-span-1 md:col-span-4 justify-end mt-2">
                      <button
                        type="submit"
                        className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Save Leave
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddLeave(false)}
                        className="px-5 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowAddLeave(true)}
                    className="flex items-center gap-1.5 px-4.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Plus className="h-4 w-4" /> Add Leave Record
                  </button>
                </div>
              )}

              {/* Leaves List */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-800">Leave Logs & History</h3>
                </div>
                {leaves.length === 0 ? (
                  <p className="p-8 text-center text-slate-400 font-semibold italic">No leave history found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase">
                          <th className="p-4 px-6">Leave Range</th>
                          <th className="p-4 px-6">Type</th>
                          <th className="p-4 px-6">Reason</th>
                          <th className="p-4 px-6">Status</th>
                          <th className="p-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {leaves.map((l) => (
                          <tr key={l.id} className="hover:bg-slate-50/50">
                            <td className="p-4 px-6 text-xs text-slate-500">
                              {new Date(l.startDate).toLocaleDateString()} to {new Date(l.endDate).toLocaleDateString()}
                            </td>
                            <td className="p-4 px-6">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-md">
                                {l.leaveType}
                              </span>
                            </td>
                            <td className="p-4 px-6 text-slate-600">{l.reason || '—'}</td>
                            <td className="p-4 px-6">
                              <span className={cn(
                                'px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase',
                                l.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                                l.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                              )}>
                                {l.status.toLowerCase()}
                              </span>
                            </td>
                            <td className="p-4 px-6 text-right">
                              {l.status === 'APPROVED' && (
                                <button
                                  onClick={() => cancelLeave(l.id)}
                                  className="text-red-500 hover:text-red-700 text-xs font-bold transition cursor-pointer"
                                >
                                  Cancel Leave
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
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
