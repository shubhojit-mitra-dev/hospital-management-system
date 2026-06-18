'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Activity, AlertTriangle, ShieldCheck, CheckCircle2, ShoppingBag } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

export default function PrescriptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rxId = params.id as string;

  const [prescription, setPrescription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Dispense Form State: map of prescriptionItem ID -> quantity to dispense
  const [dispenseQuantities, setDispenseQuantities] = useState<Record<string, number>>({});

  const fetchPrescriptionDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/v1/pharmacy/prescriptions/${rxId}`);
      const rx = res.data?.data;
      setPrescription(rx);

      // Initialize quantities to dispense
      if (rx && rx.items) {
        const quantities: Record<string, number> = {};
        rx.items.forEach((item: any) => {
          // Default to full required quantity or available stock, whichever is smaller
          const requiredQty = item.quantity || 0;
          const availableStock = item.availableStock || 0;
          quantities[item.id] = Math.min(requiredQty, availableStock);
        });
        setDispenseQuantities(quantities);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch prescription details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptionDetail();
  }, [rxId]);

  const handleQuantityChange = (itemId: string, maxVal: number, val: string) => {
    const num = parseInt(val) || 0;
    const clamped = Math.max(0, Math.min(num, maxVal));
    setDispenseQuantities((prev) => ({
      ...prev,
      [itemId]: clamped,
    }));
  };

  const handleDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      // Structure request items matching backend contract
      const itemsPayload = prescription.items.map((item: any) => {
        const qty = dispenseQuantities[item.id] || 0;
        
        // Find earliest expiring batch with stock if stock is available
        const selectedBatch = item.batches?.find((b: any) => b.quantity > 0);

        return {
          prescriptionItemId: item.id,
          quantityDispensed: qty,
          inventoryId: selectedBatch?.id || undefined,
          batchNumber: selectedBatch?.batchNumber || undefined,
          reason: qty === 0 ? 'OUT_OF_STOCK' : undefined,
        };
      });

      await api.post(`/api/v1/pharmacy/prescriptions/${rxId}/dispense`, {
        items: itemsPayload,
        notes: 'Dispensed from Pharmacy desk.',
      });

      setSuccess('Prescription fulfilled successfully.');
      setTimeout(() => {
        router.push('/pharmacy');
      }, 1500);
    } catch (err) {
      console.error(err);
      setError('Failed to dispense prescription.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['PHARMACIST', 'HOSPITAL_ADMIN']}>
        <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
          <span>Loading prescription details...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!prescription) {
    return (
      <DashboardLayout allowedRoles={['PHARMACIST', 'HOSPITAL_ADMIN']}>
        <div className="p-8 text-center bg-red-50 border border-red-200 text-red-750 font-bold rounded-2xl">
          Prescription not found.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['PHARMACIST', 'HOSPITAL_ADMIN']}>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex items-center gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Prescription #{prescription.prescriptionNo}</h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Dispense Fulfillment sheet</p>
          </div>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-750 font-bold rounded-xl text-xs">{error}</div>}
        {success && <div className="p-4 bg-emerald-50 text-emerald-850 font-bold rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" /> {success}
        </div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Patient Details Panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 font-semibold text-xs text-slate-700">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Patient Details</h3>
            <div>
              <p className="text-sm font-bold text-slate-800">{prescription.patient?.firstName} {prescription.patient?.lastName}</p>
              <p className="text-slate-500 mt-0.5">{prescription.patient?.gender} • {prescription.patient?.phone}</p>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <span className="block text-[10px] text-slate-400 uppercase">Consulting Clinician</span>
              <p className="text-slate-800 font-bold">Dr. {prescription.doctor?.user?.firstName} {prescription.doctor?.user?.lastName}</p>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <span className="block text-[10px] text-slate-400 uppercase">Status</span>
              <span
                className={cn(
                  'inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
                  prescription.status === 'DISPENSED'
                    ? 'bg-emerald-100 text-emerald-700'
                    : prescription.status === 'PARTIAL'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-slate-100 text-slate-700'
                )}
              >
                {prescription.status}
              </span>
            </div>
          </div>

          {/* Fulfillment Dispense Form */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
              <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3">Medications Dispensing Checklist</h2>
              
              {prescription.status === 'DISPENSED' ? (
                <p className="text-sm text-slate-400 italic">
                  This prescription has already been fully dispensed and fulfilled.
                </p>
              ) : (
                <form onSubmit={handleDispense} className="space-y-6 font-semibold text-xs text-slate-750">
                  <div className="divide-y divide-slate-100">
                    {prescription.items?.map((item: any) => {
                      const required = item.quantity || 0;
                      const available = item.availableStock || 0;
                      const currentDispense = dispenseQuantities[item.id] || 0;

                      return (
                        <div key={item.id} className="py-4.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-850 text-sm">{item.medicineName} ({item.dosage})</h4>
                            <p className="text-slate-400 text-xs font-semibold">
                              Required: {required} {item.form}s • Stock: {available} available
                            </p>
                            {available === 0 && (
                              <span className="inline-flex items-center gap-1 text-[9px] text-red-650 bg-red-50 px-2 py-0.5 rounded border border-red-100/50">
                                <AlertTriangle className="h-3 w-3" /> Out of stock
                              </span>
                            )}
                          </div>

                          <div className="w-full sm:w-auto flex items-center gap-2">
                            <label className="text-[10px] text-slate-400 uppercase font-bold">Dispense</label>
                            <input
                              type="number"
                              value={currentDispense}
                              onChange={(e) => handleQuantityChange(item.id, Math.min(required, available), e.target.value)}
                              className="w-20 px-2.5 py-1.5 border border-slate-250 bg-white rounded-lg text-center font-bold text-slate-800"
                              min={0}
                              max={Math.min(required, available)}
                              disabled={available === 0}
                            />
                            <span className="text-slate-400">/ {required}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex justify-center items-center gap-1.5 bg-teal-650 hover:bg-teal-700 text-white rounded-xl py-3.5 font-bold cursor-pointer text-xs shadow-md shadow-teal-600/10"
                  >
                    <ShoppingBag className="h-4.5 w-4.5" /> Confirm Dispensation & Deduct Inventory
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
