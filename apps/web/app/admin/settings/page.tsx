'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Clock, CalendarDays, Loader2, Save, Info, Building2 } from 'lucide-react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { HolidayCalendar } from '@/components/HolidayCalendar';

interface HospitalDetails {
  id: string;
  name: string;
  registrationNo: string;
  address: string;
  city: string;
  state: string;
  country: string;
  isActive: boolean;
}

export default function HospitalSettingsPage() {
  const { user } = useAuthStore();
  const hospitalId = user?.hospitalId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // General Hospital profile
  const [profile, setProfile] = useState<HospitalDetails>({
    id: '',
    name: '',
    registrationNo: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    isActive: true,
  });

  // Working Hours (default / client-saved state)
  const [workingHours, setWorkingHours] = useState<Record<string, { open: string; close: string; isHoliday: boolean }>>({
    monday: { open: '08:00', close: '20:00', isHoliday: false },
    tuesday: { open: '08:00', close: '20:00', isHoliday: false },
    wednesday: { open: '08:00', close: '20:00', isHoliday: false },
    thursday: { open: '08:00', close: '20:00', isHoliday: false },
    friday: { open: '08:00', close: '20:00', isHoliday: false },
    saturday: { open: '08:00', close: '14:00', isHoliday: false },
    sunday: { open: '00:00', close: '00:00', isHoliday: true },
  });

  const [slotDuration, setSlotDuration] = useState('30');

  useEffect(() => {
    // Load from LocalStorage if present
    const cachedHours = localStorage.getItem(`workingHours_${hospitalId}`);
    if (cachedHours) {
      try {
        setWorkingHours(JSON.parse(cachedHours));
      } catch (e) {
        console.error(e);
      }
    }
    const cachedSlot = localStorage.getItem(`slotDuration_${hospitalId}`);
    if (cachedSlot) {
      setSlotDuration(cachedSlot);
    }
  }, [hospitalId]);

  useEffect(() => {
    const fetchHospitalDetails = async () => {
      if (!hospitalId) return;
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/api/v1/hospitals/${hospitalId}`);
        if (response.data) {
          setProfile(response.data);
        }
      } catch (err: any) {
        console.error('Failed to fetch hospital settings:', err);
        setError('Failed to fetch hospital info.');
      } finally {
        setLoading(false);
      }
    };

    fetchHospitalDetails();
  }, [hospitalId]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfile((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleHoursChange = (day: string, field: 'open' | 'close' | 'isHoliday', value: string | boolean) => {
    setWorkingHours((prev) => {
      const current = prev[day] || { open: '08:00', close: '20:00', isHoliday: false };
      return {
        ...prev,
        [day]: {
          ...current,
          [field]: value,
        } as { open: string; close: string; isHoliday: boolean },
      };
    });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalId) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // 1. Save general profile settings to API
      await api.put(`/api/v1/hospitals/${hospitalId}`, profile);

      // 2. Save working hours to client-side storage
      localStorage.setItem(`workingHours_${hospitalId}`, JSON.stringify(workingHours));
      localStorage.setItem(`slotDuration_${hospitalId}`, slotDuration);

      setSuccess('Settings updated successfully.');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-16">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Settings className="h-6 w-6 text-teal-600" />
          Settings & Configurations
        </h2>
        <p className="text-sm text-slate-500">Configure clinic schedules, active time slots, and national holidays.</p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-100 text-red-800 text-xs font-semibold rounded-xl">
          <Info className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2.5 p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl">
          <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-8">
        {/* Profile Card */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="h-4 w-4 text-teal-600" />
            Hospital Profile
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">Hospital Name</label>
              <input
                type="text"
                name="name"
                value={profile.name}
                onChange={handleProfileChange}
                className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">Registration Number</label>
              <input
                type="text"
                name="registrationNo"
                value={profile.registrationNo || ''}
                onChange={handleProfileChange}
                className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Address</label>
            <textarea
              name="address"
              value={profile.address || ''}
              onChange={handleProfileChange}
              rows={3}
              className="p-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">City</label>
              <input
                type="text"
                name="city"
                value={profile.city || ''}
                onChange={handleProfileChange}
                className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">State</label>
              <input
                type="text"
                name="state"
                value={profile.state || ''}
                onChange={handleProfileChange}
                className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">Country</label>
              <input
                type="text"
                name="country"
                value={profile.country || ''}
                onChange={handleProfileChange}
                className="h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Working Hours Card */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4 text-teal-600" />
              Working Hours & Slot Duration
            </h3>
            
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Appointment Slot Duration:</label>
              <select
                value={slotDuration}
                onChange={(e) => setSlotDuration(e.target.value)}
                className="h-9 px-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {daysOfWeek.map((day) => {
              const info = workingHours[day] || { open: '08:00', close: '20:00', isHoliday: false };
              return (
                <div
                  key={day}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl gap-4"
                >
                  <div className="w-28 capitalize font-bold text-sm text-slate-700">{day}</div>
                  
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={info.isHoliday}
                        onChange={(e) => handleHoursChange(day, 'isHoliday', e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      Closed / Holiday
                    </label>

                    {!info.isHoliday && (
                      <div className="flex items-center gap-3">
                        <input
                          type="time"
                          value={info.open}
                          onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                          className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold focus:ring-2 focus:ring-teal-500"
                        />
                        <span className="text-xs text-slate-400 font-bold">to</span>
                        <input
                          type="time"
                          value={info.close}
                          onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                          className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-teal-500/10 transition"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Configuration
          </button>
        </div>
      </form>

      {/* Holidays Calendar Section */}
      <div className="border-t border-slate-200/80 pt-10 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-teal-600" />
            Hospital Holidays
          </h3>
          <p className="text-sm text-slate-500">View and update customized clinic holidays in the calendar.</p>
        </div>

        <HolidayCalendar hospitalId={hospitalId} />
      </div>
    </div>
  );
}
