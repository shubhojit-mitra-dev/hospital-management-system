'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Clock, AlertTriangle, ShieldCheck, CheckCircle2, ChevronRight, Activity, ClipboardList } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

export default function PharmacyDashboard() {
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('PENDING');

  const fetchPrescriptions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/v1/pharmacy/prescriptions', {
        params: { status: filterStatus },
      });
      setPrescriptions(res.data?.data?.prescriptions || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch pending prescription queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, [filterStatus]);

  const filtered = prescriptions.filter((rx) => {
    const patientName = `${rx.patient?.firstName} ${rx.patient?.lastName}`.toLowerCase();
    const rxNo = rx.prescriptionNo.toLowerCase();
    const searchLower = search.toLowerCase();
    return patientName.includes(searchLower) || rxNo.includes(searchLower);
  });

  return (
    <DashboardLayout allowedRoles={['PHARMACIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']}>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Pharmacy Dispensary Desk</h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Fulfill prescriptions, dispense medicines, and manage inventory.</p>
          </div>
          <button
            onClick={() => router.push('/pharmacy/inventory')}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-650 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
          >
            <Activity className="h-4 w-4" /> Manage Inventory
          </button>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-750 font-bold rounded-xl text-xs">{error}</div>}

        {/* Filters and Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm font-semibold text-xs text-slate-700">
          <div className="relative col-span-1 md:col-span-2">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search prescription ID or patient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs"
            />
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs"
            >
              <option value="PENDING">Pending (Unfulfilled)</option>
              <option value="PARTIAL">Partially Dispensed</option>
              <option value="DISPENSED">Fully Dispensed</option>
            </select>
          </div>
        </div>

        {/* Prescription Queue List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3">
            <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
            <span>Loading active prescription queue...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-16 bg-slate-50 rounded-2xl border border-slate-200 italic text-slate-400">
            No prescriptions found in queue.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden font-semibold text-xs text-slate-700">
            <div className="divide-y divide-slate-100">
              {filtered.map((rx) => {
                const totalItems = rx.items?.length || 0;
                const availableItems = rx.items?.filter((i: any) => i.isAvailable).length || 0;
                
                return (
                  <div
                    key={rx.id}
                    onClick={() => router.push(`/pharmacy/prescriptions/${rx.id}`)}
                    className="p-5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-650 flex-shrink-0">
                        <ClipboardList className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h2 className="font-bold text-slate-800 text-sm">{rx.patient?.firstName} {rx.patient?.lastName}</h2>
                          <span className="font-mono text-[10px] text-slate-400">({rx.prescriptionNo})</span>
                        </div>
                        <p className="text-slate-450 font-semibold text-xs">
                          {rx.items?.map((item: any) => `${item.medicineName} (${item.dosage})`).join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span
                          className={cn(
                            'text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider',
                            availableItems === totalItems
                              ? 'bg-emerald-100 text-emerald-700'
                              : availableItems > 0
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-red-100 text-red-750'
                          )}
                        >
                          {availableItems === totalItems ? 'In Stock' : availableItems > 0 ? 'Partial Stock' : 'Out of Stock'}
                        </span>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">
                          <Clock className="h-3 w-3 inline mr-1 -mt-0.5" />
                          {new Date(rx.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-350" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
