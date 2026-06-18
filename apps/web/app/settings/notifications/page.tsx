'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal, ShieldAlert, Check, Clock, Save, Volume2 } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';

export default function NotificationPreferencesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Preferences state
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [eventPreferences, setEventPreferences] = useState<Record<string, { email: boolean; sms: boolean; inApp: boolean }>>({});

  const eventTypes = [
    { type: 'APPOINTMENT_BOOKED', label: 'Appointment Booking & Confirmations', desc: 'When patients book, cancel, or reschedule slots.' },
    { type: 'LAB_REPORT_READY', label: 'Lab Diagnostics Ready', desc: 'When laboratory test orders are completed by technicians.' },
    { type: 'PRESCRIPTION_READY', label: 'Prescription Ready / Dispenses', desc: 'When doctors submit consultations or pharmacists fulfill Rx items.' },
    { type: 'INVOICE_GENERATED', label: 'Invoice Bill Generations', desc: 'When bills are closed or initial invoices are generated.' },
    { type: 'PAYMENT_RECEIVED', label: 'Payment Fulfillments', desc: 'When billing cashier transactions or online payments clear.' },
    { type: 'EMERGENCY_ASSIGNED', label: 'Emergency Assignments (ER)', desc: 'When an emergency ESI case matches duty doctor assignments.' },
    { type: 'CRITICAL_LAB_VALUE', label: 'Critical Diagnostic Values', desc: 'Critical abnormal patient lab results that require immediate review.' },
    { type: 'INVENTORY_LOW_STOCK', label: 'Inventory Low Stock Warnings', desc: 'Warning when pharmaceutical stock drops below reorder thresholds.' }
  ];

  const loadPreferences = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/v1/notifications/preferences');
      if (res.data?.success) {
        const d = res.data.data;
        setEmailEnabled(d.emailEnabled);
        setSmsEnabled(d.smsEnabled);
        setInAppEnabled(d.inAppEnabled);
        setQuietHoursEnabled(d.quietHoursEnabled);
        setQuietStart(d.quietStart || '22:00');
        setQuietEnd(d.quietEnd || '07:00');
        
        // Populate standard structure if eventPreferences is empty
        const initialEventPrefs = d.eventPreferences || {};
        const populatedPrefs: any = {};
        eventTypes.forEach(ev => {
          populatedPrefs[ev.type] = initialEventPrefs[ev.type] || { email: true, sms: true, inApp: true };
        });
        setEventPreferences(populatedPrefs);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch notification preference settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreferences();
  }, []);

  const handleToggleEventChannel = (eventType: string, channel: 'email' | 'sms' | 'inApp') => {
    setEventPreferences(prev => {
      const current = prev[eventType] || { email: true, sms: true, inApp: true };
      const updated = {
        ...prev,
        [eventType]: {
          ...current,
          [channel]: !current[channel]
        }
      };
      return updated;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        emailEnabled,
        smsEnabled,
        inAppEnabled,
        quietHoursEnabled,
        quietStart,
        quietEnd,
        eventPreferences
      };

      const res = await api.patch('/api/v1/notifications/preferences', payload);
      if (res.data?.success) {
        setSuccess('Preferences saved successfully.');
        setTimeout(() => setSuccess(''), 4000);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to update preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl mx-auto font-semibold text-xs text-slate-700">
        
        {/* Header Actions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <button 
            onClick={() => router.back()} 
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            Back
          </button>
          <span className="text-xs font-semibold text-slate-450 uppercase tracking-widest font-extrabold flex items-center gap-1.5">
            <SlidersHorizontal className="h-4 w-4" />
            Config Matrix
          </span>
        </div>

        {error && <div className="p-4.5 bg-red-50 border border-red-150 text-red-800 rounded-xl font-bold">{error}</div>}
        {success && <div className="p-4.5 bg-emerald-50 border border-emerald-150 text-emerald-850 rounded-xl font-bold animate-fade-in">{success}</div>}

        {loading ? (
          <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3 bg-white border border-slate-200/80 rounded-2xl">
            <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
            <span>Loading preferences configurations...</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-8">
            
            {/* Master Channels Grid */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
              <div>
                <h2 className="text-sm font-extrabold text-slate-800 tracking-tight">Global Dispatch Toggles</h2>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Quickly enable or disable push channels globally for all notification event types.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/20 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="font-extrabold text-slate-800">Email Notifications</span>
                    <p className="text-[10px] text-slate-400 font-semibold">AWS SES Delivery Channel</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailEnabled}
                    onChange={(e) => setEmailEnabled(e.target.checked)}
                    className="h-5.5 w-5.5 text-teal-600 border-slate-350 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/20 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="font-extrabold text-slate-800">SMS Notifications</span>
                    <p className="text-[10px] text-slate-400 font-semibold">Twilio Delivery Channel</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={smsEnabled}
                    onChange={(e) => setSmsEnabled(e.target.checked)}
                    className="h-5.5 w-5.5 text-teal-600 border-slate-350 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/20 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="font-extrabold text-slate-800">In-App Notifications</span>
                    <p className="text-[10px] text-slate-400 font-semibold">Dashboard Badge & Bell Dropdown</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={inAppEnabled}
                    onChange={(e) => setInAppEnabled(e.target.checked)}
                    className="h-5.5 w-5.5 text-teal-600 border-slate-350 rounded-lg cursor-pointer"
                  />
                </div>

              </div>
            </div>

            {/* Quiet Hours Settings */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                    <Clock className="h-5 w-5 text-indigo-500" />
                    Quiet Hours Control
                  </h2>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Mute SMS and Email alerts during rest periods. Priority CRITICAL alarms are exempt.</p>
                </div>
                <input
                  type="checkbox"
                  checked={quietHoursEnabled}
                  onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                  className="h-5.5 w-5.5 text-teal-600 border-slate-350 rounded-lg cursor-pointer animate-pulse"
                />
              </div>

              {quietHoursEnabled && (
                <div className="grid grid-cols-2 gap-6 pt-3 border-t border-slate-100 max-w-md animate-in slide-in-from-top-2 duration-150">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-wider mb-1">Quiet Period Starts</label>
                    <input
                      type="time"
                      value={quietStart}
                      onChange={(e) => setQuietStart(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-wider mb-1">Quiet Period Ends</label>
                    <input
                      type="time"
                      value={quietEnd}
                      onChange={(e) => setQuietEnd(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-center"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Detailed Event Preference Grid */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
              <div>
                <h2 className="text-sm font-extrabold text-slate-800 tracking-tight">Granular Event Preferences Matrix</h2>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Toggle channel overrides per alert event type. Global toggles override these selections.</p>
              </div>

              <div className="border border-slate-200/80 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-450 uppercase font-extrabold tracking-wider">
                      <th className="p-4 w-1/2">Event Alert Channel Trigger</th>
                      <th className="p-4 text-center">In-App</th>
                      <th className="p-4 text-center">Email</th>
                      <th className="p-4 text-center">SMS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {eventTypes.map((ev) => {
                      const vals = eventPreferences[ev.type] || { email: true, sms: true, inApp: true };
                      return (
                        <tr key={ev.type} className="hover:bg-slate-50/40 transition">
                          <td className="p-4 space-y-0.5">
                            <span className="font-extrabold text-slate-800 block text-xs">{ev.label}</span>
                            <span className="text-[10px] text-slate-400 font-semibold block leading-normal pr-4">{ev.desc}</span>
                          </td>
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={vals.inApp}
                              onChange={() => handleToggleEventChannel(ev.type, 'inApp')}
                              className="h-4.5 w-4.5 text-teal-650 border-slate-300 rounded cursor-pointer"
                            />
                          </td>
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={vals.email}
                              onChange={() => handleToggleEventChannel(ev.type, 'email')}
                              className="h-4.5 w-4.5 text-teal-650 border-slate-300 rounded cursor-pointer"
                            />
                          </td>
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={vals.sms}
                              onChange={() => handleToggleEventChannel(ev.type, 'sms')}
                              className="h-4.5 w-4.5 text-teal-650 border-slate-300 rounded cursor-pointer"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-650/15 cursor-pointer disabled:opacity-55 flex items-center gap-1.5"
              >
                <Save className="h-4.5 w-4.5" />
                {saving ? 'Saving Preferences...' : 'Save All Preferences'}
              </button>
            </div>

          </form>
        )}

      </div>
    </DashboardLayout>
  );
}
