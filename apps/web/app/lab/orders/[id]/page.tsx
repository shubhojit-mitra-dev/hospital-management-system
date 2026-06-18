'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Activity, FileText, CheckCircle2, FlaskConical, PlayCircle, AlertTriangle } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

export default function LabOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Results state structure matching the backend body schema
  const [resultEntries, setResultEntries] = useState<any[]>([]);

  const fetchOrderDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/v1/lab/orders/${orderId}`);
      const o = res.data?.data;
      setOrder(o);

      // Initialize result entries state based on order items
      if (o && o.items) {
        const entries = o.items.map((item: any) => ({
          labOrderItemId: item.id,
          testCode: item.testCode,
          testName: item.testName,
          resultValues: {},
          resultInterpretation: 'NORMAL',
          technicianNotes: '',
          // Add default parameter details for inputs
          parameters: getParametersForTest(item.testCode),
        }));
        setResultEntries(entries);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch lab order details.');
    } finally {
      setLoading(false);
    }
  };

  const getParametersForTest = (code: string) => {
    switch (code) {
      case 'CBC':
        return [
          { name: 'WBC', unit: 'x10³/μL', min: '4.0', max: '11.0' },
          { name: 'RBC', unit: 'x10⁶/μL', min: '4.5', max: '5.9' },
          { name: 'Hemoglobin', unit: 'g/dL', min: '13.5', max: '17.5' },
          { name: 'Platelets', unit: 'x10³/μL', min: '150', max: '450' },
        ];
      case 'LFT':
        return [
          { name: 'Bilirubin Total', unit: 'mg/dL', min: '0.1', max: '1.2' },
          { name: 'SGOT (AST)', unit: 'U/L', min: '8', max: '48' },
          { name: 'SGPT (ALT)', unit: 'U/L', min: '7', max: '55' },
          { name: 'Alkaline Phosphatase', unit: 'U/L', min: '40', max: '129' },
        ];
      case 'KFT':
        return [
          { name: 'Urea', unit: 'mg/dL', min: '15', max: '45' },
          { name: 'Creatinine', unit: 'mg/dL', min: '0.6', max: '1.2' },
          { name: 'Uric Acid', unit: 'mg/dL', min: '3.5', max: '7.2' },
        ];
      default:
        // Generic parameter if not predefined
        return [{ name: 'Result Value', unit: '', min: '', max: '' }];
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [orderId]);

  const handleCollectSample = async () => {
    setError('');
    setSuccess('');
    try {
      await api.patch(`/api/v1/lab/orders/${orderId}/collect-sample`);
      setSuccess('Sample marked as collected.');
      fetchOrderDetail();
    } catch (err) {
      setError('Failed to register sample collection.');
    }
  };

  const handleStartProcessing = async () => {
    setError('');
    setSuccess('');
    try {
      await api.patch(`/api/v1/lab/orders/${orderId}/start-processing`);
      setSuccess('Analysis process started.');
      fetchOrderDetail();
    } catch (err) {
      setError('Failed to update process status.');
    }
  };

  const updateParameterValue = (itemIdx: number, paramName: string, val: string) => {
    setResultEntries((prev) => {
      const updated = [...prev];
      updated[itemIdx].resultValues[paramName] = val;
      return updated;
    });
  };

  const updateNotesAndInterpretation = (itemIdx: number, field: string, val: string) => {
    setResultEntries((prev) => {
      const updated = [...prev];
      updated[itemIdx] = { ...updated[itemIdx], [field]: val };
      return updated;
    });
  };

  const handleUploadResults = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      // Structure the data to match backend POST contract
      const payloadItems = resultEntries.map((entry) => {
        const results = entry.parameters.map((param: any) => {
          const value = entry.resultValues[param.name] || '';
          
          // Basic auto range warning checker
          let isAbnormal = false;
          let isCritical = false;
          if (param.min && param.max && value) {
            const num = parseFloat(value);
            const minNum = parseFloat(param.min);
            const maxNum = parseFloat(param.max);
            if (num < minNum || num > maxNum) {
              isAbnormal = true;
              // If deviation is high, flag critical
              if (num < minNum * 0.7 || num > maxNum * 1.3) {
                isCritical = true;
              }
            }
          }

          return {
            parameterName: param.name,
            resultValue: value,
            unit: param.unit,
            referenceMin: param.min,
            referenceMax: param.max,
            isAbnormal,
            isCritical,
          };
        });

        // Set overall interpretation to ABNORMAL or CRITICAL if any parameters are flagged
        const hasCrit = results.some((r: any) => r.isCritical);
        const hasAbn = results.some((r: any) => r.isAbnormal);
        const interpretation = hasCrit ? 'CRITICAL' : hasAbn ? 'ABNORMAL' : entry.resultInterpretation;

        return {
          labOrderItemId: entry.labOrderItemId,
          resultValues: entry.resultValues,
          resultInterpretation: interpretation,
          technicianNotes: entry.technicianNotes,
          results,
        };
      });

      const res = await api.post(`/api/v1/lab/orders/${orderId}/results`, {
        items: payloadItems,
        reportFileKey: `hospitals/${order.hospitalId}/patients/${order.patientId}/lab/${order.orderNumber}.pdf`,
      });

      if (res.data?.criticalAlert) {
        setSuccess('Results uploaded successfully! WARNING: Critical values detected.');
      } else {
        setSuccess('Test results submitted and report generated successfully.');
      }

      setTimeout(() => {
        router.push('/lab/orders');
      }, 2000);
    } catch (err) {
      console.error(err);
      setError('Failed to upload test results.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['LAB_TECHNICIAN', 'HOSPITAL_ADMIN']}>
        <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
          <span>Loading order details...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout allowedRoles={['LAB_TECHNICIAN', 'HOSPITAL_ADMIN']}>
        <div className="p-8 text-center bg-red-50 border border-red-200 text-red-750 font-bold rounded-2xl">
          Order not found.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['LAB_TECHNICIAN', 'HOSPITAL_ADMIN']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Order #{order.orderNumber}</h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Patient Details & Diagnostic Workspace</p>
          </div>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-750 font-bold rounded-xl text-xs">{error}</div>}
        {success && <div className="p-4 bg-emerald-50 text-emerald-850 font-bold rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" /> {success}
        </div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Patient Info Card */}
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 font-semibold text-xs text-slate-700">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Patient Details</h3>
              <div>
                <p className="text-sm font-bold text-slate-800">{order.patient?.firstName} {order.patient?.lastName}</p>
                <p className="text-slate-500 font-semibold mt-0.5">{order.patient?.gender} • {order.patient?.phone}</p>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Clinical Notes</span>
                <p className="text-slate-600 font-medium italic mt-0.5">{order.clinicalNotes || 'No notes provided.'}</p>
              </div>
            </div>

            {/* Actions Timeline */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 font-semibold text-xs text-slate-700">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Order Action Lifecycle</h3>
              
              {order.status === 'PENDING' && (
                <button
                  onClick={handleCollectSample}
                  className="w-full flex justify-center items-center gap-1.5 bg-teal-650 hover:bg-teal-700 text-white rounded-xl py-3 font-bold cursor-pointer text-xs"
                >
                  <FlaskConical className="h-4.5 w-4.5" /> Register Sample Collection
                </button>
              )}

              {order.status === 'SAMPLE_COLLECTED' && (
                <button
                  onClick={handleStartProcessing}
                  className="w-full flex justify-center items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 font-bold cursor-pointer text-xs"
                >
                  <PlayCircle className="h-4.5 w-4.5" /> Start Processing Sample
                </button>
              )}

              {order.status !== 'PENDING' && order.status !== 'SAMPLE_COLLECTED' && (
                <div className="space-y-2 border-l-2 border-slate-200 pl-4 py-1">
                  <div className="relative">
                    <span className="absolute -left-[22px] top-0.5 h-3.5 w-3.5 rounded-full bg-teal-500 border-2 border-white"></span>
                    <p className="font-bold text-slate-800">Sample Registered</p>
                    <p className="text-[10px] text-slate-400">{order.sampleCollectedAt ? new Date(order.sampleCollectedAt).toLocaleString() : ''}</p>
                  </div>
                  {order.status === 'PROCESSING' && (
                    <div className="relative pt-2">
                      <span className="absolute -left-[22px] top-2.5 h-3.5 w-3.5 rounded-full bg-indigo-500 border-2 border-white animate-pulse"></span>
                      <p className="font-bold text-slate-800">Processing / Analysis</p>
                    </div>
                  )}
                  {order.status === 'COMPLETED' && (
                    <div className="relative pt-2">
                      <span className="absolute -left-[22px] top-2.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white"></span>
                      <p className="font-bold text-slate-800">Analysis Completed</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Results Entry Form */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
              <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3">Test Result Entry Sheet</h2>
              
              {order.status !== 'PROCESSING' ? (
                <p className="text-sm text-slate-400 italic">
                  Results can only be submitted once the sample has been collected and set to the &quot;Processing&quot; state.
                </p>
              ) : (
                <form onSubmit={handleUploadResults} className="space-y-6 font-semibold text-xs text-slate-750">
                  {resultEntries.map((entry, itemIdx) => (
                    <div key={entry.labOrderItemId} className="border border-slate-150 rounded-xl p-4.5 space-y-4 bg-slate-50/20">
                      <h3 className="font-bold text-slate-800 text-sm">{entry.testName} ({entry.testCode})</h3>
                      
                      {/* Parameter Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {entry.parameters.map((p: any) => (
                          <div key={p.name} className="space-y-1 bg-white p-3 rounded-lg border border-slate-100">
                            <div className="flex justify-between items-center text-[10px] text-slate-450 uppercase font-bold">
                              <span>{p.name}</span>
                              <span>{p.min ? `(${p.min}-${p.max}) ${p.unit}` : ''}</span>
                            </div>
                            <input
                              type="text"
                              value={entry.resultValues[p.name] || ''}
                              onChange={(e) => updateParameterValue(itemIdx, p.name, e.target.value)}
                              placeholder={`Enter ${p.name}`}
                              className="w-full py-1 bg-transparent border-b border-slate-250 focus:border-teal-500 focus:outline-none font-bold text-slate-800 text-xs"
                              required
                            />
                          </div>
                        ))}
                      </div>

                      {/* Technician Notes */}
                      <div className="pt-2">
                        <label className="block text-[10px] text-slate-450 uppercase font-bold mb-1">Technician Remarks</label>
                        <input
                          type="text"
                          value={entry.technicianNotes}
                          onChange={(e) => updateNotesAndInterpretation(itemIdx, 'technicianNotes', e.target.value)}
                          placeholder="Special remarks for this test..."
                          className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg"
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex justify-center items-center gap-1.5 bg-teal-650 hover:bg-teal-700 text-white rounded-xl py-3.5 font-bold cursor-pointer text-xs shadow-md shadow-teal-600/10"
                  >
                    Submit Diagnoses & Generate Reports
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
