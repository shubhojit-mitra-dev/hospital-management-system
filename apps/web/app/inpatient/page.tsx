'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Map, 
  Plus, 
  Search, 
  Bed, 
  Activity, 
  LogOut, 
  Clock, 
  User, 
  ArrowRight,
  Filter
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

export default function InpatientDashboard() {
  const router = useRouter();
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ADMITTED'); // ADMITTED, DISCHARGED, ALL

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [admRes, availRes] = await Promise.all([
        api.get('/api/v1/inpatient/admissions'),
        api.get('/api/v1/inpatient/availability')
      ]);
      setAdmissions(admRes.data?.data || []);
      setAvailability(availRes.data?.data || null);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch inpatient details. Verify permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredAdmissions = admissions.filter((adm) => {
    const matchesStatus = statusFilter === 'ALL' || adm.status === statusFilter;
    const matchesSearch = 
      adm.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${adm.patient?.firstName} ${adm.patient?.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adm.ward?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adm.bed?.bedNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = availability?.summary || {
    totalBeds: 0,
    availableBeds: 0,
    occupiedBeds: 0,
    maintenanceBeds: 0,
    occupancyRate: '0%'
  };

  return (
    <DashboardLayout allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE']}>
      <div className="space-y-8">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
              <Activity className="h-7 w-7 text-teal-650" />
              Inpatient Care
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Manage patient admissions, room allocations, rounds, and discharges.</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => router.push('/inpatient/availability')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Map className="h-4 w-4" />
              Visual Bed Map
            </button>
            <button 
              onClick={() => router.push('/inpatient/admit')}
              className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-teal-650 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-650/15 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Admit Patient
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Bed Capacity</span>
              <h3 className="text-2xl font-bold text-slate-800">{stats.totalBeds}</h3>
            </div>
            <div className="bg-slate-50 text-slate-600 p-3.5 rounded-2xl border border-slate-100">
              <Bed className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Occupied Beds</span>
              <h3 className="text-2xl font-bold text-teal-750">{stats.occupiedBeds}</h3>
            </div>
            <div className="bg-teal-50 text-teal-700 p-3.5 rounded-2xl border border-teal-100">
              <Users className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Available Beds</span>
              <h3 className="text-2xl font-bold text-emerald-650">{stats.availableBeds}</h3>
            </div>
            <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-2xl border border-emerald-100">
              <Bed className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Occupancy Rate</span>
              <h3 className="text-2xl font-bold text-slate-800">{stats.occupancyRate}</h3>
            </div>
            <div className="bg-blue-50 text-blue-600 p-3.5 rounded-2xl border border-blue-100">
              <Activity className="h-6 w-6" />
            </div>
          </div>

        </div>

        {/* Admissions List */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          
          {/* Filters Bar */}
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient, bed number, ward..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500 focus:bg-white transition"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400 mr-1 hidden sm:block" />
              {['ADMITTED', 'DISCHARGED', 'ALL'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition cursor-pointer',
                    statusFilter === status
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {status === 'ALL' ? 'All Admissions' : status}
                </button>
              ))}
            </div>

          </div>

          {/* Table / List */}
          {error && <div className="p-6 bg-red-50 text-red-750 font-bold border-b border-slate-100 text-xs">{error}</div>}

          {loading ? (
            <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3">
              <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
              <span className="text-xs font-semibold">Loading admissions queue...</span>
            </div>
          ) : filteredAdmissions.length === 0 ? (
            <div className="text-center p-20 text-slate-400 italic font-semibold text-xs bg-slate-50/50">
              No admissions found matching your filters.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 font-semibold text-xs text-slate-700">
              {filteredAdmissions.map((adm) => {
                // Calculate stay duration
                const date1 = new Date(adm.admissionDate);
                const date2 = adm.dischargeDate ? new Date(adm.dischargeDate) : new Date();
                const diffTime = Math.abs(date2.getTime() - date1.getTime());
                let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays === 0) diffDays = 1;

                return (
                  <div
                    key={adm.id}
                    onClick={() => router.push(`/inpatient/${adm.id}`)}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-800 text-sm leading-none">
                            {adm.patient?.firstName} {adm.patient?.lastName}
                          </h3>
                          <span
                            className={cn(
                              'text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider',
                              adm.status === 'ADMITTED' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                            )}
                          >
                            {adm.status}
                          </span>
                        </div>
                        <p className="text-slate-500 mt-1 font-bold">
                          {adm.admissionNumber} | Type: <span className="text-slate-650">{adm.admissionType}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Admitted: {new Date(adm.admissionDate).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-8 font-semibold text-right">
                      <div>
                        <p className="text-slate-800 font-bold">{adm.ward?.name}</p>
                        <p className="text-slate-450 text-[11px] mt-0.5">Bed: <span className="font-bold text-slate-700">{adm.bed?.bedNumber}</span></p>
                      </div>
                      
                      <div className="text-center bg-slate-50 border border-slate-150 px-3.5 py-1.5 rounded-xl">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block leading-none mb-0.5">Stay</span>
                        <span className="font-extrabold text-slate-800 text-xs leading-none">{diffDays} Days</span>
                      </div>

                      <ArrowRight className="h-5 w-5 text-slate-350 hidden sm:block" />
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
