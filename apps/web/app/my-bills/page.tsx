'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet, Clock, CheckCircle, AlertTriangle, ChevronRight, FileText, DollarSign } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

export default function MyBillsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMyBills = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      // Find patient ID
      let patientId = user.patientId;
      if (!patientId) {
        const profileRes = await api.get('/api/v1/patients');
        const profiles = profileRes.data?.patients || profileRes.data?.data || [];
        const myProfile = profiles.find((p: any) => p.userId === user.id);
        if (myProfile) {
          patientId = myProfile.id;
        }
      }

      if (!patientId) {
        setError('No patient profile is associated with this account.');
        setLoading(false);
        return;
      }

      const res = await api.get(`/api/v1/billing/invoices/patient/${patientId}`);
      setInvoices(res.data?.data || []);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch your bills.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBills();
  }, [user]);

  // Calculations
  const outstandingInvoices = invoices.filter(i => i.status === 'PENDING' || i.status === 'PARTIALLY_PAID');
  const paidInvoices = invoices.filter(i => i.status === 'PAID');
  const outstandingAmount = outstandingInvoices.reduce((acc, i) => acc + Number(i.balanceAmount || 0), 0);

  return (
    <DashboardLayout allowedRoles={['PATIENT']}>
      <div className="space-y-8">
        
        {/* Page title */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-teal-600" />
            My Invoices & Bills
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">View and pay your medical consultation, lab, and pharmacy invoices.</p>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-750 font-bold rounded-xl text-xs">{error}</div>}

        {loading ? (
          <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3">
            <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
            <span>Loading billing dashboard...</span>
          </div>
        ) : (
          <>
            {/* Outstanding Summary card */}
            {outstandingAmount > 0 && (
              <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-6 rounded-2xl border border-teal-650 shadow-md text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-teal-100 tracking-wider">Total Outstanding Balance</span>
                  <h2 className="text-3xl font-extrabold mt-1">₹{outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
                  <p className="text-xs text-teal-100 mt-1.5 font-medium">Please finalize pending payments to avoid service interruptions.</p>
                </div>
                {outstandingInvoices.length > 0 && (
                  <button
                    onClick={() => router.push(`/my-bills/${outstandingInvoices[0].id}`)}
                    className="px-5 py-3 bg-white hover:bg-slate-50 text-teal-700 font-extrabold text-xs rounded-xl shadow-lg transition cursor-pointer"
                  >
                    Pay Oldest Bill ({outstandingInvoices[0].invoiceNumber})
                  </button>
                )}
              </div>
            )}

            {/* List outstanding invoices */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-amber-500" />
                Unpaid / Pending Bills
              </h3>

              {outstandingInvoices.length === 0 ? (
                <div className="bg-emerald-50/20 text-emerald-800 p-6 rounded-2xl border border-emerald-100/50 italic text-center text-xs font-semibold">
                  All your bills are paid! Thank you.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden font-semibold text-xs text-slate-700">
                  <div className="divide-y divide-slate-100">
                    {outstandingInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        onClick={() => router.push(`/my-bills/${inv.id}`)}
                        className="p-5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-650">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm leading-none">{inv.invoiceNumber}</h4>
                            <p className="text-slate-400 mt-1 font-semibold">
                              Due: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'Upon receipt'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <h4 className="font-bold text-slate-800 text-sm">₹{Number(inv.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h4>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-amber-150 text-amber-800 bg-amber-100 mt-1.5 inline-block">
                              {inv.status}
                            </span>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* List paid invoices */}
            <div className="space-y-4 pt-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                Receipts & Paid Invoices
              </h3>

              {paidInvoices.length === 0 ? (
                <div className="text-center p-12 bg-slate-50/50 rounded-2xl border border-slate-200/50 italic text-slate-400">
                  No payment history found.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden font-semibold text-xs text-slate-700">
                  <div className="divide-y divide-slate-100">
                    {paidInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        onClick={() => router.push(`/my-bills/${inv.id}`)}
                        className="p-5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-650">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm leading-none">{inv.invoiceNumber}</h4>
                            <p className="text-slate-400 mt-1 font-semibold">
                              Paid: {new Date(inv.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <h4 className="font-bold text-emerald-700 text-sm">₹{Number(inv.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h4>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-800 mt-1.5 inline-block">
                              PAID
                            </span>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </>
        )}

      </div>
    </DashboardLayout>
  );
}
