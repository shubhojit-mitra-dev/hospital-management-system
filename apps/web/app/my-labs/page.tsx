'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Clock, AlertTriangle, CheckCircle, ChevronRight, Search } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

export default function MyLabReportsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMyLabs = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      // Fetch own patient profile first to get patient ID if not directly on user object
      let patientId = user.patientId;
      if (!patientId) {
        // Fallback: search for patient profile linked to this user ID
        const profileRes = await api.get('/api/v1/patients');
        const profiles = profileRes.data?.patients || [];
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

      const res = await api.get(`/api/v1/lab/orders/patient/${patientId}`);
      setOrders(res.data?.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch your lab reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLabs();
  }, [user]);

  return (
    <DashboardLayout allowedRoles={['PATIENT']}>
      <div className="space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">My Diagnostic Lab Reports</h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">Access and download your laboratory test results.</p>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-750 font-bold rounded-xl text-xs">{error}</div>}

        {loading ? (
          <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3">
            <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
            <span>Loading lab reports...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center p-16 bg-slate-50 rounded-2xl border border-slate-200 italic text-slate-400">
            No lab reports found for your account.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden font-semibold text-xs text-slate-700">
            <div className="divide-y divide-slate-100">
              {orders.map((o) => (
                <div
                  key={o.id}
                  onClick={() => router.push(`/my-labs/${o.id}`)}
                  className="p-5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-650">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-800 text-sm">{o.orderNumber}</h2>
                      <p className="text-slate-400 font-semibold mt-0.5">
                        {o.items?.map((item: any) => item.testCode).join(', ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span
                        className={cn(
                          'text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider',
                          o.status === 'COMPLETED' || o.status === 'REVIEWED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : o.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-700'
                        )}
                      >
                        {o.status}
                      </span>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">
                        <Clock className="h-3 w-3 inline mr-1 -mt-0.5" />
                        {new Date(o.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-350" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
