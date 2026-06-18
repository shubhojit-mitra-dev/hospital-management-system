'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, Clock, AlertCircle, CheckCircle, Play, Eye } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

export default function LabOrderQueuePage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [search, setSearch] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/v1/lab/orders', {
        params: {
          status: filterStatus || undefined,
          priority: filterPriority || undefined,
        },
      });
      setOrders(res.data?.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load lab orders queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filterStatus, filterPriority]);

  const filteredOrders = orders.filter((o) => {
    const patientName = `${o.patient?.firstName} ${o.patient?.lastName}`.toLowerCase();
    const orderNo = o.orderNumber.toLowerCase();
    const searchLower = search.toLowerCase();
    return patientName.includes(searchLower) || orderNo.includes(searchLower);
  });

  return (
    <DashboardLayout allowedRoles={['LAB_TECHNICIAN', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Laboratory Diagnostics Desk</h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Manage patient samples and upload medical results.</p>
          </div>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-750 font-bold rounded-xl text-xs">{error}</div>}

        {/* Filters Panel */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm font-semibold text-xs text-slate-700">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search patient or Order ID..."
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
              <option value="">All Statuses</option>
              <option value="PENDING">Pending (Ordered)</option>
              <option value="SAMPLE_COLLECTED">Sample Collected</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs"
            >
              <option value="">All Priorities</option>
              <option value="ROUTINE">Routine</option>
              <option value="URGENT">Urgent</option>
              <option value="STAT">STAT (Emergency)</option>
            </select>
          </div>
          <button
            onClick={fetchOrders}
            className="w-full bg-slate-100 border border-slate-200 text-slate-700 rounded-lg py-2 hover:bg-slate-200 transition cursor-pointer text-xs font-bold"
          >
            Refresh Queue
          </button>
        </div>

        {/* Order Cards */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3">
            <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
            <span>Loading active lab orders...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center p-16 bg-slate-50 rounded-2xl border border-slate-200 italic text-slate-400">
            No lab orders found matching current filter context.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((o) => (
              <div
                key={o.id}
                className={cn(
                  'bg-white p-5 rounded-2xl border transition-all duration-200 hover:shadow-md flex flex-col justify-between gap-4',
                  o.priority === 'STAT'
                    ? 'border-red-200 shadow-sm shadow-red-50'
                    : o.priority === 'URGENT'
                    ? 'border-orange-200 shadow-sm shadow-orange-50'
                    : 'border-slate-200'
                )}
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-xs font-bold text-slate-500">{o.orderNumber}</span>
                    <span
                      className={cn(
                        'text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
                        o.priority === 'STAT'
                          ? 'bg-red-100 text-red-700'
                          : o.priority === 'URGENT'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-slate-100 text-slate-700'
                      )}
                    >
                      {o.priority}
                    </span>
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-800 text-base">
                      {o.patient?.firstName} {o.patient?.lastName}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">Ordered by Dr. {o.doctor?.user?.firstName} {o.doctor?.user?.lastName}</p>
                  </div>

                  {/* Tests ordered */}
                  <div className="space-y-1 pt-1.5 border-t border-slate-100">
                    <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Diagnostic Tests</span>
                    <div className="flex flex-wrap gap-1.5">
                      {o.items?.map((item: any) => (
                        <span key={item.id} className="text-[10px] font-bold bg-slate-50 border border-slate-150 text-slate-700 px-2 py-0.5 rounded-lg">
                          {item.testCode}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{new Date(o.createdAt).toLocaleDateString()}</span>
                  </div>
                  <button
                    onClick={() => router.push(`/lab/orders/${o.id}`)}
                    className="flex items-center gap-1 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-xl cursor-pointer shadow-sm shadow-teal-600/10"
                  >
                    <Eye className="h-4 w-4" /> Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
