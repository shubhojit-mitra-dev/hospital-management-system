'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileSpreadsheet, 
  Plus, 
  Search, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  ChevronRight,
  Filter,
  FileText
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

export default function BillingDashboard() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Invoice Modal/Form State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/v1/billing/invoices');
      setInvoices(res.data?.data || []);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch invoices. Please check your credentials and permission level.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientsAndAppointments = async () => {
    try {
      const [patRes, appRes] = await Promise.all([
        api.get('/api/v1/patients'),
        api.get('/api/v1/appointments')
      ]);
      setPatients(patRes.data?.patients || patRes.data?.data || []);
      setAppointments(appRes.data?.data || appRes.data?.appointments || []);
    } catch (err) {
      console.error('Failed to load patients/appointments', err);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    if (isCreateModalOpen) {
      fetchPatientsAndAppointments();
    }
  }, [isCreateModalOpen]);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    setSubmitting(true);
    try {
      const payload = {
        patientId: selectedPatientId,
        appointmentId: selectedAppointmentId || undefined,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        items: [] // start empty, add items on details page
      };

      const res = await api.post('/api/v1/billing/invoices', payload);
      if (res.data?.success) {
        setIsCreateModalOpen(false);
        // Reset state
        setSelectedPatientId('');
        setSelectedAppointmentId('');
        setDueDate('');
        setNotes('');
        
        // Redirect to invoice details editor
        router.push(`/billing/invoices/${res.data.data.id}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to create invoice draft');
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics calculations
  const totalInvoiced = invoices.reduce((acc, inv) => acc + Number(inv.totalAmount || 0), 0);
  const totalCollected = invoices.reduce((acc, inv) => acc + Number(inv.amountPaid || 0), 0);
  const totalPending = invoices.reduce((acc, inv) => acc + Number(inv.balanceAmount || 0), 0);

  const filteredInvoices = invoices.filter(inv => {
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${inv.patient?.firstName} ${inv.patient?.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.patient?.phone && inv.patient.phone.includes(searchQuery));
    return matchesStatus && matchesSearch;
  });

  return (
    <DashboardLayout allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'BILLING_EXECUTIVE']}>
      <div className="space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
              <FileSpreadsheet className="h-7 w-7 text-teal-650" />
              Billing & Invoices
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Manage billing records, process payments, and issue invoices.</p>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/10 transition duration-150 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create Invoice Draft
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Billed</span>
              <h3 className="text-2xl font-bold text-slate-800">₹{totalInvoiced.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="bg-blue-50 text-blue-600 p-3.5 rounded-2xl border border-blue-100">
              <FileText className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Collected</span>
              <h3 className="text-2xl font-bold text-emerald-650">₹{totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-2xl border border-emerald-100">
              <CheckCircle className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Outstanding</span>
              <h3 className="text-2xl font-bold text-amber-650">₹{totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="bg-amber-50 text-amber-600 p-3.5 rounded-2xl border border-amber-100">
              <Clock className="h-6 w-6" />
            </div>
          </div>

        </div>

        {/* Filters and List */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          
          {/* Filter Bar */}
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Invoice #, Patient Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500 focus:bg-white transition"
              />
            </div>

            {/* Status Filter buttons */}
            <div className="flex flex-wrap gap-2">
              {['ALL', 'DRAFT', 'PENDING', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'].map((status) => (
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
                  {status === 'ALL' ? 'All Invoices' : status.replace('_', ' ')}
                </button>
              ))}
            </div>

          </div>

          {/* Invoices List */}
          {error && <div className="p-6 bg-red-50 text-red-750 font-bold border-b border-slate-100 text-xs">{error}</div>}

          {loading ? (
            <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3">
              <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
              <span className="text-xs font-semibold">Loading invoices...</span>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center p-20 text-slate-400 italic font-semibold text-xs bg-slate-50/50">
              No invoices found matching your filters.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 font-semibold text-xs text-slate-700">
              {filteredInvoices.map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => router.push(`/billing/invoices/${inv.id}`)}
                  className="p-5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200/50">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800 text-sm leading-none">{inv.invoiceNumber}</h3>
                        <span
                          className={cn(
                            'text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider',
                            inv.status === 'PAID' && 'bg-emerald-105 text-emerald-800 bg-emerald-100',
                            inv.status === 'PENDING' && 'bg-amber-105 text-amber-800 bg-amber-100',
                            inv.status === 'PARTIALLY_PAID' && 'bg-blue-105 text-blue-800 bg-blue-100',
                            inv.status === 'DRAFT' && 'bg-slate-105 text-slate-800 bg-slate-100',
                            inv.status === 'CANCELLED' && 'bg-red-105 text-red-800 bg-red-100'
                          )}
                        >
                          {inv.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-1 font-semibold">
                        Patient: <span className="text-slate-750 font-bold">{inv.patient?.firstName} {inv.patient?.lastName}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">
                        Date: {new Date(inv.invoiceDate).toLocaleDateString()} | Due: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <h4 className="font-bold text-slate-800 text-sm">₹{Number(inv.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h4>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Outstanding: <span className="font-bold text-slate-600">₹{Number(inv.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>

      {/* Create Invoice Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 overflow-hidden">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Create Invoice Draft</h2>
            <p className="text-xs text-slate-500 font-semibold mb-6">Initialize a billing record for manual charge inputs.</p>
            
            <form onSubmit={handleCreateInvoice} className="space-y-4 font-semibold text-xs text-slate-700">
              
              {/* Select Patient */}
              <div>
                <label className="block text-xs font-bold text-slate-650 mb-1.5">Select Patient *</label>
                <select
                  required
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.phone || 'No phone'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Appointment (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-650 mb-1.5">Link Appointment (Optional)</label>
                <select
                  value={selectedAppointmentId}
                  onChange={(e) => setSelectedAppointmentId(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                >
                  <option value="">-- No Appointment Link --</option>
                  {appointments
                    .filter(a => !selectedPatientId || a.patientId === selectedPatientId)
                    .map(a => (
                      <option key={a.id} value={a.id}>
                        {new Date(a.appointmentDate).toLocaleDateString()} at {a.startTime} ({a.doctor?.user?.firstName ? `Dr. ${a.doctor.user.firstName}` : a.department?.name})
                      </option>
                    ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-bold text-slate-650 mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-650 mb-1.5">Invoice Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Payment instructions, insurance notes..."
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/10 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create & Edit Items'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
