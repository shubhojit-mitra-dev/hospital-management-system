'use client';

import React, { useEffect, useState } from 'react';
import { Save, Clock, CheckCircle2 } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

interface Schedule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  maxPatients: number;
  isActive: boolean;
}

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export default function DoctorSchedulePage() {
  const { user } = useAuthStore();
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDoctorAndSchedule = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError('');
    try {
      // Step 1: Find Doctor Profile
      const docRes = await api.get('/api/v1/doctors', {
        params: { userId: user.id }
      });
      const doctorProfile = docRes.data?.[0];
      if (!doctorProfile) {
        setError('Doctor profile not found for this user account.');
        setLoading(false);
        return;
      }
      setDoctorId(doctorProfile.id);

      // Step 2: Fetch Schedules
      const schedRes = await api.get(`/api/v1/doctors/${doctorProfile.id}/schedule`);
      setSchedules(schedRes.data || []);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load schedule details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorAndSchedule();
  }, [user]);

  const handleToggle = (dayIndex: number) => {
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

  const handleTimeChange = (dayIndex: number, field: 'startTime' | 'endTime', val: string) => {
    setSchedules((prev) =>
      prev.map((s) => s.dayOfWeek === dayIndex ? { ...s, [field]: val } : s)
    );
  };

  const saveSchedules = async () => {
    if (!doctorId) return;
    setError('');
    setSuccess('');
    try {
      await api.post(`/api/v1/doctors/${doctorId}/schedule`, { schedules });
      setSuccess('Weekly schedule updated successfully.');
    } catch (err) {
      console.error(err);
      setError('Failed to save schedule.');
    }
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['DOCTOR']}>
        <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
          <span className="font-semibold">Loading schedule configuration...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['DOCTOR']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Configure My Weekly Hours</h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">Specify which days and times you are available for consultations.</p>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-700 font-bold rounded-xl text-sm">{error}</div>}
        {success && <div className="p-4 bg-emerald-50 text-emerald-800 font-bold rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" /> {success}
        </div>}

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-teal-600" />
              Availability Grid
            </h2>
            <button
              onClick={saveSchedules}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-teal-600/10 cursor-pointer"
            >
              Save Schedule
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
                      onChange={() => handleToggle(idx)}
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
                          onChange={(e) => handleTimeChange(idx, 'startTime', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-lg text-sm bg-white"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">End</span>
                        <input
                          type="time"
                          value={sched.endTime}
                          onChange={(e) => handleTimeChange(idx, 'endTime', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-lg text-sm bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {!isActive && (
                    <span className="text-slate-400 text-xs font-bold italic">Not working / Offline</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
