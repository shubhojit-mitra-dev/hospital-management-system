'use client';

import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2, CalendarDays, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  isRecurring: boolean;
}

interface HolidayCalendarProps {
  hospitalId?: string;
  readOnly?: boolean;
}

export function HolidayCalendar({ hospitalId, readOnly = false }: HolidayCalendarProps) {
  const { user } = useAuthStore();
  const activeHospitalId = hospitalId || user?.hospitalId;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states for adding holiday
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [holidayName, setHolidayName] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const fetchHolidays = async () => {
    if (!activeHospitalId) return;
    setLoading(true);
    try {
      const response = await api.get(`/api/v1/hospitals/${activeHospitalId}/holidays`);
      // API response: { success: true, data: [...] } or direct array
      const list = response.data.data || response.data || [];
      setHolidays(list);
    } catch (err: any) {
      console.error('Failed to fetch holidays', err);
      setError('Could not load holidays');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [activeHospitalId]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (dateStr: string) => {
    if (readOnly) return;
    setSelectedDate(dateStr);
    setFormOpen(true);
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHospitalId || !selectedDate || !holidayName.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/api/v1/hospitals/${activeHospitalId}/holidays`, {
        date: selectedDate,
        name: holidayName.trim(),
        isRecurring,
      });
      setHolidayName('');
      setIsRecurring(false);
      setFormOpen(false);
      fetchHolidays();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to add holiday';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (readOnly || !activeHospitalId) return;
    if (!confirm('Are you sure you want to delete this holiday?')) return;

    setLoading(true);
    try {
      await api.delete(`/api/v1/hospitals/${activeHospitalId}/holidays/${id}`);
      fetchHolidays();
    } catch (err: any) {
      console.error('Failed to delete holiday', err);
      setError('Failed to delete holiday');
      setLoading(false);
    }
  };

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const calendarCells = [];
  // Fill leading empty cells
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarCells.push(null);
  }
  // Fill days
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(new Date(year, month, d));
  }

  const getHolidaysForDate = (date: Date) => {
    const formatted = formatDate(date);
    return holidays.filter((h) => {
      if (h.isRecurring) {
        // Match MM-DD
        return h.date.substring(5) === formatted.substring(5);
      }
      return h.date === formatted;
    });
  };

  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Calendar Grid */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200/80 shadow-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-teal-600" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {monthNames[month]} {year}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-md transition"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-slate-400 mb-2 uppercase tracking-wider">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Calendar Cells */}
        <div className="grid grid-cols-7 gap-2">
          {calendarCells.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} className="h-24 bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border border-transparent" />;
            }
            
            const cellHolidays = getHolidaysForDate(date);
            const isToday = formatDate(date) === formatDate(new Date());
            const dateStr = formatDate(date);

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => handleDateClick(dateStr)}
                className={cn(
                  'h-24 p-2 text-left flex flex-col justify-between border rounded-xl transition-all relative overflow-hidden group',
                  isToday 
                    ? 'border-teal-500 bg-teal-50/35 dark:bg-teal-950/10' 
                    : 'border-slate-100 hover:border-slate-300 bg-slate-50/30 hover:bg-white dark:border-slate-800/40 dark:hover:border-slate-700',
                  cellHolidays.length > 0 && 'border-red-200/80 bg-red-50/20 dark:bg-red-950/5'
                )}
              >
                <span className={cn(
                  'text-xs font-semibold px-2 py-0.5 rounded-full inline-block',
                  isToday ? 'bg-teal-600 text-white' : 'text-slate-600 dark:text-slate-400'
                )}>
                  {date.getDate()}
                </span>
                
                <div className="w-full mt-1 space-y-1 overflow-hidden">
                  {cellHolidays.slice(0, 2).map((h) => (
                    <div
                      key={h.id}
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded font-medium truncate',
                        h.isRecurring 
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                      )}
                      title={h.name}
                    >
                      {h.name}
                    </div>
                  ))}
                  {cellHolidays.length > 2 && (
                    <div className="text-[9px] text-slate-400 font-semibold pl-1">
                      +{cellHolidays.length - 2} more
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sidebar - Add / List Holidays */}
      <div className="flex flex-col gap-6">
        {/* Add Holiday Form */}
        {formOpen && !readOnly && (
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200/80 shadow-md">
            <h4 className="text-md font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-teal-600" />
              Add Holiday
            </h4>
            <form onSubmit={handleAddHoliday} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Selected Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Holiday Name</label>
                <input
                  type="text"
                  placeholder="e.g. Independence Day"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="recurring" className="text-xs font-semibold text-slate-600 cursor-pointer">
                  Recurring every year
                </label>
              </div>

              {error && (
                <div className="text-xs text-red-500 bg-red-50 border border-red-100 p-2 rounded-lg text-center">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="flex-1 h-9 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-9 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition flex items-center justify-center gap-1.5"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Holidays List */}
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200/80 shadow-md flex-1 overflow-hidden flex flex-col">
          <h4 className="text-md font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-teal-600" />
            Holidays List
          </h4>

          {loading && holidays.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          ) : holidays.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-8">
              No holidays configured yet.
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
              {holidays.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/40 rounded-xl"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{h.name}</p>
                    <p className="text-xs text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                      <span>{h.date}</span>
                      {h.isRecurring && (
                        <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 px-1.5 py-0.2 rounded text-[10px] font-semibold">
                          Recurring
                        </span>
                      )}
                    </p>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => handleDeleteHoliday(h.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50/50 transition"
                      title="Delete holiday"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
