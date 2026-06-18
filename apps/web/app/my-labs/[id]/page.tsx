'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, FileText, Download, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

export default function MyLabReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrderDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/v1/lab/orders/${orderId}`);
      setOrder(res.data?.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch report details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [orderId]);

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['PATIENT']}>
        <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
          <span>Loading report details...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout allowedRoles={['PATIENT']}>
        <div className="p-8 text-center bg-red-50 border border-red-200 text-red-750 font-bold rounded-2xl">
          Report not found.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['PATIENT']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">Report #{order.orderNumber}</h1>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Diagnostic Report Sheet</p>
            </div>
          </div>
          {(order.status === 'COMPLETED' || order.status === 'REVIEWED') && (
            <button
              onClick={() => alert('PDF generation is simulated. Downloading mock PDF...')}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-250 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
            >
              <Download className="h-4 w-4" /> Download PDF
            </button>
          )}
        </div>

        {error && <div className="p-4 bg-red-50 text-red-750 font-bold rounded-xl text-xs">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Metadata info */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 font-semibold text-xs text-slate-700">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Diagnoses Details</h3>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase">Consulting Doctor</span>
              <p className="text-sm font-bold text-slate-800">Dr. {order.doctor?.user?.firstName} {order.doctor?.user?.lastName}</p>
              <p className="text-slate-400 font-semibold mt-0.5">{order.doctor?.specialization}</p>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <span className="block text-[10px] text-slate-400 uppercase">Order Date</span>
              <p className="text-slate-600 mt-0.5">{new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <span className="block text-[10px] text-slate-400 uppercase">Status</span>
              <span
                className={cn(
                  'inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
                  order.status === 'COMPLETED' || order.status === 'REVIEWED'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-700'
                )}
              >
                {order.status}
              </span>
            </div>
          </div>

          {/* Results Sheet */}
          <div className="lg:col-span-2 space-y-4">
            {order.items?.map((item: any) => (
              <div key={item.id} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-800">{item.testName} ({item.testCode})</h3>
                  {item.status === 'COMPLETED' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-650">
                      <CheckCircle className="h-4 w-4" /> Ready
                    </span>
                  )}
                </div>

                {item.results && item.results.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-bold">
                          <th className="pb-2">Parameter</th>
                          <th className="pb-2">Result Value</th>
                          <th className="pb-2">Reference Range</th>
                          <th className="pb-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {item.results.map((res: any) => (
                          <tr key={res.id} className="hover:bg-slate-50/20">
                            <td className="py-3 font-bold text-slate-800">{res.parameterName}</td>
                            <td className={cn(
                              "py-3 font-bold",
                              res.isCritical ? "text-red-600" : res.isAbnormal ? "text-orange-500" : "text-slate-700"
                            )}>
                              {res.resultValue} {res.unit}
                            </td>
                            <td className="py-3 text-slate-450">
                              {res.referenceMin || '0'} - {res.referenceMax || 'N/A'} {res.unit}
                            </td>
                            <td className="py-3">
                              {res.isCritical ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-red-600">
                                  <ShieldAlert className="h-3.5 w-3.5" /> Critical
                                </span>
                              ) : res.isAbnormal ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-orange-500">
                                  <AlertTriangle className="h-3.5 w-3.5" /> Abnormal
                                </span>
                              ) : (
                                <span className="text-slate-400">Normal</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Diagnostic reports are currently being analyzed by the laboratory technicians.
                  </p>
                )}

                {item.technicianNotes && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/50 mt-4 text-xs font-semibold text-slate-600">
                    <span className="block text-[9px] text-slate-400 uppercase font-bold mb-1">Technician Remarks</span>
                    {item.technicianNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
