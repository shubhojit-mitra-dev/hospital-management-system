'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Settings, Plus, Layers, Bed, Activity, Check, X, AlertTriangle } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

export default function WardManagementPage() {
  const router = useRouter();
  const [wards, setWards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Create Ward Modal State
  const [isWardModalOpen, setIsWardModalOpen] = useState(false);
  const [wardName, setWardName] = useState('');
  const [wardType, setWardType] = useState('GENERAL');
  const [floor, setFloor] = useState('');
  const [totalBeds, setTotalBeds] = useState(5);
  const [chargePerDay, setChargePerDay] = useState(1000);
  const [creatingWard, setCreatingWard] = useState(false);

  // Add Beds Modal State
  const [isBedModalOpen, setIsBedModalOpen] = useState(false);
  const [targetWard, setTargetWard] = useState<any>(null);
  const [newBedPrefix, setNewBedPrefix] = useState('');
  const [bedsCount, setBedsCount] = useState(1);
  const [addingBeds, setAddingBeds] = useState(false);

  const fetchWards = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/v1/inpatient/wards');
      setWards(res.data?.data || []);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load wards catalog. Verify administrative privileges.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWards();
  }, []);

  const handleCreateWard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wardName || totalBeds <= 0 || chargePerDay < 0) return;

    setCreatingWard(true);
    try {
      const payload = {
        name: wardName,
        wardType,
        floor: floor || undefined,
        totalBeds: Number(totalBeds),
        chargePerDay: Number(chargePerDay)
      };

      const res = await api.post('/api/v1/inpatient/wards', payload);
      if (res.data?.success) {
        setIsWardModalOpen(false);
        setWardName('');
        setFloor('');
        setTotalBeds(5);
        setChargePerDay(1000);
        fetchWards();
        alert('Ward and beds pre-populated successfully!');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to create ward');
    } finally {
      setCreatingWard(false);
    }
  };

  const handleAddBeds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetWard || bedsCount <= 0) return;

    setAddingBeds(true);
    try {
      // Create list of beds to insert
      const bedsList = [];
      const prefix = newBedPrefix || targetWard.name.substring(0, 3).toUpperCase();
      const currentCount = targetWard.beds?.length || 0;

      for (let i = 1; i <= bedsCount; i++) {
        bedsList.push({
          bedNumber: `${prefix}-${String(currentCount + i).padStart(3, '0')}`,
          bedType: targetWard.wardType === 'ICU' ? 'ICU' : 'STANDARD'
        });
      }

      const res = await api.post(`/api/v1/inpatient/wards/${targetWard.id}/beds`, { beds: bedsList });
      if (res.data?.success) {
        setIsBedModalOpen(false);
        setNewBedPrefix('');
        setBedsCount(1);
        setTargetWard(null);
        fetchWards();
        alert('Beds added successfully!');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to add beds');
    } finally {
      setAddingBeds(false);
    }
  };

  return (
    <DashboardLayout allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN']}>
      <div className="space-y-8">
        
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <button 
            onClick={() => router.push('/inpatient')} 
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
            Back to Inpatient Care
          </button>
          <button 
            onClick={() => setIsWardModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-teal-650 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-650/15 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create New Ward
          </button>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-750 font-bold border rounded-xl text-xs">{error}</div>}

        {/* Wards list catalog */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden font-semibold text-xs text-slate-700">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
              <Layers className="h-5 w-5 text-teal-650" />
              Ward & Bed Inventory Catalog
            </h2>
            <p className="text-slate-400 font-semibold mt-0.5">Overview of hospital rooms, classifications, rates, and occupancy states.</p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3">
              <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
              <span>Loading wards inventory...</span>
            </div>
          ) : wards.length === 0 ? (
            <div className="text-center p-20 text-slate-400 italic font-semibold text-xs">
              No wards configured on this hospital workspace.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {wards.map((w) => (
                <div key={w.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50/50 transition">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200/50 mt-0.5">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                        {w.name}
                        <span className="text-[9px] font-bold bg-slate-100 border border-slate-200 text-slate-650 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {w.wardType}
                        </span>
                      </h3>
                      <p className="text-slate-555 font-bold mt-1">Floor: {w.floor || 'Ground'} | Total Beds: {w.totalBeds}</p>
                      <p className="text-teal-700 font-bold mt-0.5">Rate: ₹{Number(w.chargePerDay).toLocaleString('en-IN')}/day</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-slate-500 font-bold">Occupancy: <span className="font-bold text-slate-850">{w.stats?.occupiedBeds}</span> / {w.stats?.totalBeds} Beds</p>
                      <p className="text-[10px] text-slate-400 mt-1">Available: <span className="font-bold text-emerald-600">{w.stats?.availableBeds} vacant</span></p>
                    </div>
                    <button
                      onClick={() => {
                        setTargetWard(w);
                        setIsBedModalOpen(true);
                      }}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
                    >
                      Add Beds
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Create Ward Modal */}
      {isWardModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 overflow-hidden">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Create New Ward Room</h2>
            <p className="text-xs text-slate-500 font-semibold mb-6">Initialize a hospital room block with automated bed generation.</p>
            
            <form onSubmit={handleCreateWard} className="space-y-4 font-semibold text-xs text-slate-700">
              
              <div>
                <label className="block text-xs font-bold text-slate-650 mb-1.5">Ward / Room Block Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ICU Wing A, Private Suite Block"
                  value={wardName}
                  onChange={(e) => setWardName(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-650 mb-1.5">Ward Type *</label>
                  <select
                    value={wardType}
                    onChange={(e) => setWardType(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                  >
                    <option value="GENERAL">General Ward</option>
                    <option value="SEMI_PRIVATE">Semi-Private</option>
                    <option value="PRIVATE">Private Room</option>
                    <option value="ICU">ICU</option>
                    <option value="HDU">HDU</option>
                    <option value="NICU">NICU</option>
                    <option value="PEDIATRIC">Pediatric</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-650 mb-1.5">Floor Level</label>
                  <input
                    type="text"
                    placeholder="e.g. 2nd Floor"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-650 mb-1.5">Number of Beds *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={50}
                    value={totalBeds}
                    onChange={(e) => setTotalBeds(Number(e.target.value))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-650 mb-1.5">Daily Charge Rate (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={chargePerDay}
                    onChange={(e) => setChargePerDay(Number(e.target.value))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500 text-right font-extrabold text-slate-850"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsWardModalOpen(false)}
                  className="px-4.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={creatingWard}
                  className="px-4.5 py-2.5 bg-teal-650 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-650/15 cursor-pointer disabled:opacity-50"
                >
                  {creatingWard ? 'Initializing...' : 'Confirm Create Ward'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Add Beds Modal */}
      {isBedModalOpen && targetWard && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 overflow-hidden">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Add Beds to {targetWard.name}</h2>
            <p className="text-xs text-slate-500 font-semibold mb-6">Append new beds to the visual inventory grid.</p>
            
            <form onSubmit={handleAddBeds} className="space-y-4 font-semibold text-xs text-slate-700">
              
              <div>
                <label className="block text-xs font-bold text-slate-650 mb-1.5">Bed Number Prefix (Optional)</label>
                <input
                  type="text"
                  placeholder={`Default: ${targetWard.name.substring(0, 3).toUpperCase()}`}
                  value={newBedPrefix}
                  onChange={(e) => setNewBedPrefix(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-650 mb-1.5">Number of beds to add *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={20}
                  value={bedsCount}
                  onChange={(e) => setBedsCount(Number(e.target.value))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBedModalOpen(false)}
                  className="px-4.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingBeds}
                  className="px-4.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {addingBeds ? 'Appending...' : 'Confirm Add Beds'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
