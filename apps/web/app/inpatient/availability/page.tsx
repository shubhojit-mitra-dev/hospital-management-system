'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bed, Map, Sparkles, AlertCircle, Wrench, Settings } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

export default function BedAvailabilityPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWardId, setSelectedWardId] = useState('ALL');

  const fetchAvailability = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/v1/inpatient/availability');
      setData(res.data?.data || null);
      if (res.data?.data?.wards?.length > 0) {
        // default select all
        setSelectedWardId('ALL');
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch bed availability details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, []);

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE']}>
        <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
          <span className="text-xs font-semibold">Loading visual bed map...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE']}>
        <div className="space-y-6">
          <button onClick={() => router.push('/inpatient')} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          <div className="p-5 bg-red-50 text-red-750 font-bold rounded-2xl border border-red-100 flex items-center gap-3 text-xs">
            <AlertCircle className="h-5 w-5" />
            <span>{error || 'Failed to load bed availability.'}</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { summary, wards } = data;

  const filteredWards = selectedWardId === 'ALL' 
    ? wards 
    : wards.filter((w: any) => w.id === selectedWardId);

  return (
    <DashboardLayout allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE']}>
      <div className="space-y-8">
        
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <button 
            onClick={() => router.push('/inpatient')} 
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
            Back to Dashboard
          </button>
          <button 
            onClick={() => router.push('/wards')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Settings className="h-4 w-4" />
            Configure Wards
          </button>
        </div>

        {/* Legend / Stats Cards */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 font-semibold text-xs text-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Map className="h-5.5 w-5.5 text-teal-650" />
              Visual Bed Allocation Map
            </h2>
            <p className="text-slate-400 font-semibold mt-0.5">Click any AVAILABLE bed to allocate and admit a patient.</p>
          </div>

          {/* Color coding legend */}
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-md bg-emerald-500 border border-emerald-600 block shadow-sm shadow-emerald-500/20" />
              <span className="text-slate-600 font-bold">Available ({summary.availableBeds})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-md bg-red-500 border border-red-600 block shadow-sm shadow-red-500/20" />
              <span className="text-slate-600 font-bold">Occupied ({summary.occupiedBeds})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-md bg-amber-500 border border-amber-600 block shadow-sm shadow-amber-500/20" />
              <span className="text-slate-600 font-bold">Maintenance ({summary.maintenanceBeds})</span>
            </div>
          </div>
        </div>

        {/* Ward filter selector tab */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedWardId('ALL')}
            className={cn(
              'px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition cursor-pointer',
              selectedWardId === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/10'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            )}
          >
            All Wards ({summary.totalBeds} Beds)
          </button>
          {wards.map((w: any) => (
            <button
              key={w.id}
              onClick={() => setSelectedWardId(w.id)}
              className={cn(
                'px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition cursor-pointer',
                selectedWardId === w.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/10'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              {w.name} ({w.totalBeds} Beds)
            </button>
          ))}
        </div>

        {/* Wards grid map */}
        <div className="space-y-8">
          {filteredWards.map((w: any) => (
            <div key={w.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
              
              {/* Ward details banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    {w.name}
                    <span className="text-[9px] font-bold bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {w.wardType}
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Rate: ₹{Number(w.chargePerDay).toLocaleString('en-IN')}/day</p>
                </div>
                <div className="font-semibold text-xs text-slate-500">
                  Occupancy: <span className="font-bold text-slate-800">{w.occupiedBeds}</span> / {w.totalBeds} Beds
                </div>
              </div>

              {/* Beds Grid layout */}
              {!w.beds || w.beds.length === 0 ? (
                <p className="text-slate-400 italic text-[11px]">No beds setup inside this ward yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 font-semibold text-xs text-slate-700">
                  {w.beds.map((bed: any) => {
                    const isAvailable = bed.status === 'AVAILABLE';
                    const isOccupied = bed.status === 'OCCUPIED';
                    const isMaintenance = bed.status === 'MAINTENANCE';

                    return (
                      <div
                        key={bed.id}
                        onClick={() => {
                          if (isAvailable) {
                            router.push(`/inpatient/admit?wardId=${w.id}&bedId=${bed.id}`);
                          }
                        }}
                        className={cn(
                          'p-4.5 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition duration-200 relative overflow-hidden group shadow-sm',
                          isAvailable && 'bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200 text-emerald-800 cursor-pointer hover:-translate-y-1',
                          isOccupied && 'bg-red-50/40 border-red-200 text-red-800',
                          isMaintenance && 'bg-amber-50/40 border-amber-200 text-amber-800'
                        )}
                      >
                        {/* Bed Icon wrapper */}
                        <div className={cn(
                          'p-2.5 rounded-xl border',
                          isAvailable && 'bg-emerald-100/55 border-emerald-200 text-emerald-700',
                          isOccupied && 'bg-red-100/55 border-red-200 text-red-700',
                          isMaintenance && 'bg-amber-100/55 border-amber-200 text-amber-700'
                        )}>
                          {isMaintenance ? (
                            <Wrench className="h-5 w-5" />
                          ) : (
                            <Bed className="h-5 w-5" />
                          )}
                        </div>

                        {/* Bed name */}
                        <span className="font-bold text-slate-800 text-[11px]">{bed.bedNumber}</span>
                        
                        {/* Bed status sub-text */}
                        <span className="text-[9px] uppercase font-bold tracking-wider opacity-80 leading-none">
                          {bed.status}
                        </span>

                        {/* Hover hint */}
                        {isAvailable && (
                          <div className="absolute inset-0 bg-emerald-600 hover:bg-emerald-700 opacity-0 group-hover:opacity-100 transition duration-150 flex items-center justify-center text-white font-extrabold text-[10px] uppercase tracking-wider">
                            Allocate Bed
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          ))}
        </div>

      </div>
    </DashboardLayout>
  );
}
