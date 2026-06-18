'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  Clock, 
  User, 
  Plus, 
  PhoneCall, 
  Building2, 
  ShieldAlert, 
  AlertCircle,
  CheckCircle2,
  CalendarCheck
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

interface RosterItem {
  id: string;
  departmentId: string;
  userId: string;
  userRole: 'DOCTOR' | 'NURSE';
  shiftDate: string;
  shiftType: 'MORNING' | 'EVENING' | 'NIGHT';
  shiftStart: string;
  shiftEnd: string;
  isOnCall: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  department: {
    id: string;
    name: string;
  };
}

export default function DutyRosterPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [rosters, setRosters] = useState<RosterItem[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [nurses, setNurses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [shiftDate, setShiftDate] = useState('');
  const [shiftType, setShiftType] = useState<'MORNING' | 'EVENING' | 'NIGHT'>('MORNING');
  const [departmentId, setDepartmentId] = useState('');
  const [userRole, setUserRole] = useState<'DOCTOR' | 'NURSE'>('DOCTOR');
  const [userId, setUserId] = useState('');
  const [shiftStart, setShiftStart] = useState('06:00');
  const [shiftEnd, setShiftEnd] = useState('14:00');
  const [isOnCall, setIsOnCall] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'HOSPITAL_ADMIN';

  const loadRosterData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch rosters
      const rosterRes = await api.get('/api/v1/emergency/duty-roster');
      setRosters(rosterRes.data?.data || []);

      if (currentUser?.hospitalId) {
        // Fetch departments, doctors, and staff
        const [deptRes, docRes, staffRes] = await Promise.all([
          api.get(`/api/v1/hospitals/${currentUser.hospitalId}/departments`),
          api.get('/api/v1/doctors'),
          api.get('/api/v1/staff')
        ]);
        
        setDepartments(deptRes.data?.departments || deptRes.data?.data || []);
        setDoctors(docRes.data?.doctors || docRes.data?.data || []);
        
        const staffList = staffRes.data?.data || staffRes.data?.staff || [];
        setNurses(staffList.filter((s: any) => s.role === 'NURSE' || s.user?.role === 'NURSE'));
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to retrieve duty rosters and lookup records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRosterData();
  }, [currentUser]);

  // Adjust default shift times on type change
  const handleShiftTypeChange = (type: 'MORNING' | 'EVENING' | 'NIGHT') => {
    setShiftType(type);
    if (type === 'MORNING') {
      setShiftStart('06:00');
      setShiftEnd('14:00');
    } else if (type === 'EVENING') {
      setShiftStart('14:00');
      setShiftEnd('22:00');
    } else {
      setShiftStart('22:00');
      setShiftEnd('06:00');
    }
  };

  const handleAddRoster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftDate || !departmentId || !userId || !shiftStart || !shiftEnd) {
      alert('Please fill out all required shift details.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      const payload = {
        departmentId,
        userId,
        userRole,
        shiftDate,
        shiftType,
        shiftStart,
        shiftEnd,
        isOnCall
      };

      const res = await api.post('/api/v1/emergency/duty-roster', payload);
      if (res.data?.success) {
        setSuccessMsg('Shift successfully scheduled and assigned.');
        // Reset inputs
        setUserId('');
        setIsOnCall(false);
        // Reload list
        const updatedRosters = await api.get('/api/v1/emergency/duty-roster');
        setRosters(updatedRosters.data?.data || []);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to schedule shift. Verify if shift overlap exists.');
    } finally {
      setSubmitting(false);
    }
  };

  const getShiftBadgeStyles = (type: string) => {
    switch (type) {
      case 'MORNING':
        return 'bg-amber-50 text-amber-800 border-amber-250';
      case 'EVENING':
        return 'bg-blue-50 text-blue-800 border-blue-250';
      case 'NIGHT':
        return 'bg-indigo-50 text-indigo-800 border-indigo-250';
      default:
        return 'bg-slate-50 text-slate-800 border-slate-200';
    }
  };

  // Stats calculation
  const todayStr = new Date().toISOString().split('T')[0];
  
  const rostersToday = rosters.filter(r => {
    const rDate = new Date(r.shiftDate).toISOString().split('T')[0];
    return rDate === todayStr;
  });

  const onCallDoctorsCount = rostersToday.filter(r => r.userRole === 'DOCTOR' && r.isOnCall).length;
  const activeNursesCount = rostersToday.filter(r => r.userRole === 'NURSE').length;

  return (
    <DashboardLayout allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'NURSE', 'DOCTOR']}>
      <div className="space-y-8 font-semibold text-xs text-slate-700">
        
        {/* Header Title */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
              <CalendarCheck className="h-7 w-7 text-indigo-650" />
              Duty Roster Management
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Configure clinical shifts, manage doctor / nurse ER schedules, and coordinate on-call emergencies.</p>
          </div>
          <button 
            onClick={() => router.push('/emergency')}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold transition self-start sm:self-center cursor-pointer"
          >
            Go to ER Board
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Scheduled Today</span>
            <h3 className="text-xl font-bold text-slate-850 mt-1">{rostersToday.length} Staff</h3>
          </div>
          <div className="bg-emerald-50/50 border border-emerald-150 p-5 rounded-2xl text-emerald-900">
            <span className="text-[10px] text-emerald-650 font-bold uppercase tracking-wider block">On-Call ER MDs Today</span>
            <h3 className="text-xl font-bold mt-1 flex items-center gap-1.5">
              <PhoneCall className="h-4.5 w-4.5 text-emerald-600 animate-bounce" />
              {onCallDoctorsCount} Doctors
            </h3>
          </div>
          <div className="bg-indigo-50/50 border border-indigo-150 p-5 rounded-2xl text-indigo-900">
            <span className="text-[10px] text-indigo-650 font-bold uppercase tracking-wider block">Duty Nurses Today</span>
            <h3 className="text-xl font-bold mt-1">{activeNursesCount} Nurses</h3>
          </div>
        </div>

        {error && (
          <div className="p-4.5 bg-red-50 border border-red-150 text-red-800 rounded-xl flex items-center gap-3 font-bold">
            <AlertCircle className="h-5 w-5 text-red-650 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4.5 bg-emerald-50 border border-emerald-150 text-emerald-850 rounded-xl flex items-center gap-3 font-bold animate-fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3 bg-white border border-slate-200/80 rounded-2xl">
            <div className="h-8 w-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
            <span>Synchronizing roster databases...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left/Middle Column: Roster list */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-800 tracking-tight">Weekly Roster & Schedules</h2>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Listed in chronological order. Active schedules verify ER auto-doctor-assignments.</p>
                </div>

                {rosters.length === 0 ? (
                  <div className="text-center p-16 text-slate-400 italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    No active roster shifts scheduled yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rosters.map((r) => {
                      const formattedDate = new Date(r.shiftDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      });

                      const isRosterToday = new Date(r.shiftDate).toISOString().split('T')[0] === todayStr;

                      return (
                        <div 
                          key={r.id} 
                          className={cn(
                            "p-4.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition",
                            isRosterToday 
                              ? "bg-slate-50/80 border-slate-250/90 shadow-sm ring-1 ring-slate-100" 
                              : "bg-white border-slate-200 hover:bg-slate-50/40"
                          )}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="font-extrabold text-slate-800 text-xs">{formattedDate}</span>
                              {isRosterToday && (
                                <span className="bg-slate-900 text-white text-[8px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full">
                                  Today
                                </span>
                              )}
                              <span className={cn('text-[9px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border', getShiftBadgeStyles(r.shiftType))}>
                                {r.shiftType}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-6 text-[11px] text-slate-550 font-bold">
                              <span className="flex items-center gap-1.5 text-slate-800">
                                <User className="h-4 w-4 text-slate-400" />
                                {r.userRole === 'DOCTOR' ? 'Dr. ' : ''}{r.user?.firstName} {r.user?.lastName} ({r.userRole})
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Building2 className="h-4 w-4 text-slate-400" />
                                {r.department?.name}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4.5 justify-between sm:justify-end">
                            <div className="flex items-center gap-1.5 text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
                              <Clock className="h-4 w-4 text-slate-400" />
                              <span className="font-extrabold">{r.shiftStart} - {r.shiftEnd}</span>
                            </div>

                            {r.isOnCall ? (
                              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider shrink-0 shadow-sm animate-pulse">
                                <PhoneCall className="h-3.5 w-3.5 text-emerald-600" />
                                <span>ON-CALL</span>
                              </div>
                            ) : (
                              <div className="h-8 w-24 shrink-0 hidden sm:block"></div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Shift Scheduler Form (Only for Admin) */}
            <div className="space-y-6">
              {isAdmin ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-800 tracking-tight">Schedule ER Shift</h2>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Assign doctors or nurses to scheduled shifts. On-call doctor automatically matches ESI-1 entries.</p>
                  </div>

                  <form onSubmit={handleAddRoster} className="space-y-4.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-wider mb-1.5">Shift Date *</label>
                      <input
                        type="date"
                        required
                        value={shiftDate}
                        onChange={(e) => setShiftDate(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-wider mb-1.5">Shift Cycle *</label>
                      <select
                        value={shiftType}
                        onChange={(e) => handleShiftTypeChange(e.target.value as any)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-indigo-500"
                      >
                        <option value="MORNING">Morning (06:00 - 14:00)</option>
                        <option value="EVENING">Evening (14:00 - 22:00)</option>
                        <option value="NIGHT">Night (22:00 - 06:00)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-wider mb-1.5">Department Context *</label>
                      <select
                        required
                        value={departmentId}
                        onChange={(e) => setDepartmentId(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- Select Department --</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-wider mb-1.5">Staff Class *</label>
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 border border-slate-200 rounded-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setUserRole('DOCTOR');
                            setUserId('');
                          }}
                          className={cn(
                            'py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition cursor-pointer',
                            userRole === 'DOCTOR' ? 'bg-white text-slate-800 shadow-sm border border-slate-150' : 'text-slate-500 hover:text-slate-800'
                          )}
                        >
                          Doctor
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUserRole('NURSE');
                            setUserId('');
                          }}
                          className={cn(
                            'py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition cursor-pointer',
                            userRole === 'NURSE' ? 'bg-white text-slate-800 shadow-sm border border-slate-150' : 'text-slate-500 hover:text-slate-800'
                          )}
                        >
                          Nurse
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-wider mb-1.5">Assign User *</label>
                      <select
                        required
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- Select Staff Member --</option>
                        {userRole === 'DOCTOR' ? (
                          doctors.map((doc) => (
                            <option key={doc.userId || doc.id} value={doc.userId || doc.id}>
                              Dr. {doc.firstName || doc.user?.firstName} {doc.lastName || doc.user?.lastName}
                            </option>
                          ))
                        ) : (
                          nurses.map((nurse) => (
                            <option key={nurse.userId || nurse.id} value={nurse.userId || nurse.id}>
                              {nurse.firstName || nurse.user?.firstName} {nurse.lastName || nurse.user?.lastName}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-wider mb-1">Shift Start</label>
                        <input
                          type="text"
                          required
                          placeholder="06:00"
                          value={shiftStart}
                          onChange={(e) => setShiftStart(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-indigo-500 text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-wider mb-1">Shift End</label>
                        <input
                          type="text"
                          required
                          placeholder="14:00"
                          value={shiftEnd}
                          onChange={(e) => setShiftEnd(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-indigo-500 text-center"
                        />
                      </div>
                    </div>

                    {userRole === 'DOCTOR' && (
                      <div className="flex items-center gap-3 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                        <input
                          id="isOnCallCheck"
                          type="checkbox"
                          checked={isOnCall}
                          onChange={(e) => setIsOnCall(e.target.checked)}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded cursor-pointer"
                        />
                        <label htmlFor="isOnCallCheck" className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider cursor-pointer">
                          Designate as Primary On-Call
                        </label>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-650/15 transition cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? 'Scheduling...' : 'Save Shift Schedule'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-6">
                  <div className="flex gap-3 text-amber-600">
                    <ShieldAlert className="h-5.5 w-5.5 shrink-0" />
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs">Read-Only View Mode</h4>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal font-semibold">
                        Only ER Administrators can schedule new shifts, designate on-call doctors, and change roster parameters.
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-slate-200/80 pt-4 space-y-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider">
                    <span>On-Call Support Protocol:</span>
                    <p className="text-[11px] text-slate-700 lowercase leading-relaxed font-bold normal-case font-semibold">
                      For immediate triage duty roster exceptions or sick leaves, contact the chief nursing director or medical super-intendent office.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
