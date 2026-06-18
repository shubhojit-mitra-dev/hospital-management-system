'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Activity, 
  Plus, 
  Calendar, 
  Clock, 
  User, 
  Search, 
  AlertTriangle,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

export default function EmergencyBoardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [now, setNow] = useState(new Date());

  const fetchEmergencies = async () => {
    setError('');
    try {
      const res = await api.get('/api/v1/emergency');
      setData(res.data?.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch emergency board cases. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergencies();
    // Refresh board data every 15 seconds
    const interval = setInterval(fetchEmergencies, 15000);
    
    // Live waiting timer clock ticks every second
    const clock = setInterval(() => setNow(new Date()), 1000);

    return () => {
      clearInterval(interval);
      clearInterval(clock);
    };
  }, []);

  const stats = data?.stats || {
    totalActive: 0,
    immediate: 0,
    emergent: 0,
    urgent: 0,
    lessUrgent: 0,
    nonUrgent: 0
  };

  const cases = data?.cases || [];

  const filteredCases = cases.filter((c: any) => {
    const matchesLevel = filterLevel === 'ALL' || c.triageLevel === filterLevel;
    const matchesSearch = 
      c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.patientName && c.patientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.patient?.firstName && c.patient.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.chiefComplaint.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const getTriageColors = (level: string) => {
    switch (level) {
      case 'IMMEDIATE':
        return { bg: 'bg-red-100 border-red-200 text-red-800', label: 'Level 1 - Immediate', dot: 'bg-red-500 animate-ping' };
      case 'EMERGENT':
        return { bg: 'bg-orange-100 border-orange-200 text-orange-800', label: 'Level 2 - Emergent', dot: 'bg-orange-500' };
      case 'URGENT':
        return { bg: 'bg-amber-100 border-amber-200 text-amber-800', label: 'Level 3 - Urgent', dot: 'bg-amber-500' };
      case 'LESS_URGENT':
        return { bg: 'bg-emerald-100 border-emerald-200 text-emerald-800', label: 'Level 4 - Less Urgent', dot: 'bg-emerald-500' };
      case 'NON_URGENT':
        return { bg: 'bg-blue-100 border-blue-200 text-blue-800', label: 'Level 5 - Non-Urgent', dot: 'bg-blue-500' };
      default:
        return { bg: 'bg-slate-100 border-slate-200 text-slate-800', label: level, dot: 'bg-slate-500' };
    }
  };

  // Check if any Immediate Level 1 case is active to render header alert
  const hasActiveImmediate = cases.some((c: any) => c.triageLevel === 'IMMEDIATE' && c.status === 'ACTIVE');

  return (
    <DashboardLayout allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'NURSE', 'DOCTOR']}>
      <div className="space-y-8 font-semibold text-xs text-slate-700">
        
        {/* Urgent top alert banner */}
        {hasActiveImmediate && (
          <div className="bg-red-600 border border-red-700 text-white px-5 py-3 rounded-2xl flex items-center gap-3 animate-pulse shadow-md shadow-red-600/10">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span className="font-extrabold text-[11px] uppercase tracking-wider">⚠️ CRITICAL ALERT: Level 1 (IMMEDIATE) Case is currently active. Report to Emergency Bay.</span>
          </div>
        )}

        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
              <Activity className="h-7 w-7 text-red-600" />
              Emergency Triage Board
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Real-time Emergency Department admissions monitor, priority queuing, and treatment tracker.</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => router.push('/emergency/roster')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Calendar className="h-4 w-4" />
              On-Duty Roster
            </button>
            <button 
              onClick={() => router.push('/emergency/new')}
              className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/15 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Rapid Case Entry
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active Cases</span>
              <h3 className="text-xl font-bold text-slate-800">{stats.totalActive}</h3>
            </div>
          </div>
          <div className="bg-red-50/50 p-5 rounded-2xl border border-red-100 flex items-center justify-between text-red-800">
            <div className="space-y-0.5">
              <span className="text-[10px] text-red-650 font-bold uppercase tracking-wider block">Level 1 - Immediate</span>
              <h3 className="text-xl font-bold">{stats.immediate}</h3>
            </div>
          </div>
          <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-100 flex items-center justify-between text-orange-850">
            <div className="space-y-0.5">
              <span className="text-[10px] text-orange-650 font-bold uppercase tracking-wider block">Level 2 - Emergent</span>
              <h3 className="text-xl font-bold">{stats.emergent}</h3>
            </div>
          </div>
          <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 flex items-center justify-between text-amber-850">
            <div className="space-y-0.5">
              <span className="text-[10px] text-amber-650 font-bold uppercase tracking-wider block">Level 3 - Urgent</span>
              <h3 className="text-xl font-bold">{stats.urgent}</h3>
            </div>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex items-center justify-between text-slate-700">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Other Cases</span>
              <h3 className="text-xl font-bold">{stats.lessUrgent + stats.nonUrgent}</h3>
            </div>
          </div>
        </div>

        {/* Live Board grid */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          
          {/* Header filters */}
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search active case #, symptoms, complaints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-red-500 focus:bg-white transition"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {['ALL', 'IMMEDIATE', 'EMERGENT', 'URGENT', 'LESS_URGENT', 'NON_URGENT'].map((level) => (
                <button
                  key={level}
                  onClick={() => setFilterLevel(level)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition cursor-pointer',
                    filterLevel === level
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {level === 'ALL' ? 'All Active' : level.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* List display */}
          {error && <div className="p-6 bg-red-50 text-red-750 font-bold border-b border-slate-100 text-xs">{error}</div>}

          {loading ? (
            <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3">
              <div className="h-8 w-8 rounded-full border-4 border-red-500 border-t-transparent animate-spin"></div>
              <span>Loading emergency queue...</span>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="text-center p-20 text-slate-400 italic font-semibold text-xs bg-slate-50/50">
              No active emergency cases found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredCases.map((c: any) => {
                const colors = getTriageColors(c.triageLevel);
                
                // Calculate elapsed minutes
                const arrival = new Date(c.arrivalTime);
                const elapsedMins = Math.floor(Math.abs(now.getTime() - arrival.getTime()) / (1000 * 60));

                return (
                  <div
                    key={c.id}
                    onClick={() => router.push(`/emergency/${c.id}`)}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 cursor-pointer transition border-l-4 border-l-transparent"
                    style={{ borderLeftColor: c.triageLevel === 'IMMEDIATE' ? '#ef4444' : c.triageLevel === 'EMERGENT' ? '#f97316' : c.triageLevel === 'URGENT' ? '#f59e0b' : 'transparent' }}
                  >
                    
                    <div className="flex items-center gap-4">
                      
                      {/* Priority dot indicator */}
                      <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', colors.dot)} />

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-slate-800 text-sm leading-none">
                            {c.patientName || `${c.patient?.firstName} ${c.patient?.lastName}`}
                          </h3>
                          <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider', colors.bg)}>
                            {colors.label}
                          </span>
                        </div>
                        <p className="text-slate-500 mt-1.5 font-bold">
                          {c.caseNumber} | Complaint: <span className="text-slate-700">{c.chiefComplaint}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Brought by: {c.broughtBy || 'Self'} | Arrival: {new Date(c.arrivalTime).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-8 text-right font-semibold">
                      
                      {/* Live waiting timer */}
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-slate-700">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span>{elapsedMins} Mins Wait</span>
                      </div>

                      {/* Doctor Assignment warning if null */}
                      <div className="min-w-36 text-right">
                        {c.doctor ? (
                          <p className="text-slate-800 font-extrabold text-xs">Dr. {c.doctor.firstName} {c.doctor.lastName}</p>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-100 animate-pulse text-[10px] font-bold">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            UNASSIGNED
                          </span>
                        )}
                        <p className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider font-bold">Attending ER MD</p>
                      </div>

                      <ChevronRight className="h-5 w-5 text-slate-450 hidden sm:block" />
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>
    </DashboardLayout>
  );
}
