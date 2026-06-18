'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  FileText, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  FileSpreadsheet, 
  DollarSign, 
  Printer, 
  CreditCard,
  User,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Item form states
  const [itemType, setItemType] = useState('CONSULTATION');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);

  // Discount/Tax states
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [notes, setNotes] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Payment states
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const fetchInvoiceDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/v1/billing/invoices/${id}`);
      const inv = res.data?.data;
      setInvoice(inv);
      if (inv) {
        setDiscountPercent(Number(inv.discountPercent || 0));
        setDiscountAmount(Number(inv.discountAmount || 0));
        setTaxPercent(Number(inv.taxPercent || 0));
        setNotes(inv.notes || '');
        setPaymentAmount(Number(inv.balanceAmount || 0));
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to fetch invoice details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchInvoiceDetails();
    }
  }, [id]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || unitPrice <= 0) return;

    try {
      const payload = {
        itemType,
        description,
        quantity,
        unitPrice
      };
      await api.post(`/api/v1/billing/invoices/${id}/items`, payload);
      // Reset form
      setDescription('');
      setQuantity(1);
      setUnitPrice(0);
      // Refresh
      fetchInvoiceDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to add item');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this line item?')) return;
    try {
      await api.delete(`/api/v1/billing/invoices/${id}/items/${itemId}`);
      fetchInvoiceDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to remove item');
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const payload = {
        discountPercent,
        discountAmount,
        taxPercent,
        notes
      };
      await api.patch(`/api/v1/billing/invoices/${id}`, payload);
      fetchInvoiceDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to update invoice totals');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleFinalize = async () => {
    if (!confirm('Finalizing the invoice prevents any further edits to line items or totals. Proceed?')) return;
    try {
      await api.post(`/api/v1/billing/invoices/${id}/finalize`);
      fetchInvoiceDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to finalize invoice');
    }
  };

  const handleCancelInvoice = async () => {
    if (!confirm('Are you sure you want to cancel this invoice? This action is irreversible.')) return;
    try {
      await api.post(`/api/v1/billing/invoices/${id}/cancel`);
      fetchInvoiceDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to cancel invoice');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) return;

    setRecordingPayment(true);
    try {
      const payload = {
        invoiceId: id,
        amount: paymentAmount,
        notes: paymentNotes || undefined
      };
      const res = await api.post('/api/v1/billing/payments/cash', payload);
      if (res.data?.success) {
        setShowPaymentModal(false);
        setPaymentNotes('');
        fetchInvoiceDetails();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to record cash payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'BILLING_EXECUTIVE']}>
        <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
          <span className="text-xs font-semibold">Loading invoice details...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !invoice) {
    return (
      <DashboardLayout allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'BILLING_EXECUTIVE']}>
        <div className="space-y-6">
          <button onClick={() => router.push('/billing')} className="flex items-center gap-2 text-xs font-bold text-slate-555 hover:text-slate-800 transition">
            <ArrowLeft className="h-4 w-4" />
            Back to Billing
          </button>
          <div className="p-5 bg-red-50 text-red-750 font-bold rounded-2xl border border-red-100 flex items-center gap-3 text-xs">
            <AlertCircle className="h-5 w-5" />
            <span>{error || 'Invoice not found.'}</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isDraft = invoice.status === 'DRAFT';
  const isCancelled = invoice.status === 'CANCELLED';
  const isPaid = invoice.status === 'PAID';

  return (
    <DashboardLayout allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'BILLING_EXECUTIVE']}>
      <div className="space-y-8 print:p-0 print:m-0">
        
        {/* Navigation & Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm print:hidden">
          <button 
            onClick={() => router.push('/billing')} 
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
            Back to Billing
          </button>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Print Invoice
            </button>
            {isDraft && (
              <>
                <button 
                  onClick={handleCancelInvoice}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-100 text-red-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                  Cancel Invoice
                </button>
                <button 
                  onClick={handleFinalize}
                  className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-teal-650 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-650/15 transition cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  Finalize & Issue
                </button>
              </>
            )}
            {!isDraft && !isPaid && !isCancelled && (
              <button 
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/10 transition cursor-pointer"
              >
                <DollarSign className="h-4 w-4" />
                Record Cash Payment
              </button>
            )}
          </div>
        </div>

        {/* Invoice Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Invoice Card (2 Cols) */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden p-6 md:p-8 font-semibold text-xs text-slate-700 print:border-none print:shadow-none">
            
            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between border-b border-slate-100 pb-6 mb-6 gap-6">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-teal-650 tracking-wider">Hospital Tax Invoice</span>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">{invoice.invoiceNumber}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={cn(
                      'text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider',
                      invoice.status === 'PAID' && 'bg-emerald-100 text-emerald-800',
                      invoice.status === 'PENDING' && 'bg-amber-100 text-amber-800',
                      invoice.status === 'PARTIALLY_PAID' && 'bg-blue-100 text-blue-800',
                      invoice.status === 'DRAFT' && 'bg-slate-100 text-slate-800',
                      invoice.status === 'CANCELLED' && 'bg-red-100 text-red-800'
                    )}
                  >
                    {invoice.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div className="sm:text-right space-y-1">
                <p className="text-slate-400 font-bold">DATE OF ISSUE</p>
                <p className="text-slate-700 font-bold">{new Date(invoice.invoiceDate).toLocaleDateString()}</p>
                <p className="text-slate-400 font-bold mt-2">DUE DATE</p>
                <p className="text-slate-700 font-bold">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Due on Receipt'}</p>
              </div>
            </div>

            {/* Patient & Hospital Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-100 pb-6 mb-6">
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Billed To (Patient)</span>
                <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                  <User className="h-4 w-4 text-slate-400" />
                  {invoice.patient?.firstName} {invoice.patient?.lastName}
                </div>
                <p className="text-slate-555 font-semibold">Phone: {invoice.patient?.phone || 'N/A'}</p>
                <p className="text-slate-555 font-semibold">Email: {invoice.patient?.email || 'N/A'}</p>
              </div>
              <div className="space-y-1.5 md:text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Billing Context</span>
                {invoice.appointment && (
                  <p className="text-slate-700 font-bold text-xs">
                    Linked Appointment: {new Date(invoice.appointment.appointmentDate).toLocaleDateString()}
                  </p>
                )}
                {invoice.insuranceProvider && (
                  <div className="inline-block bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-left text-[11px] mt-1 space-y-0.5">
                    <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Insurance Details</p>
                    <p className="text-slate-700 font-bold">Provider: {invoice.insuranceProvider}</p>
                    <p className="text-slate-600">Policy: {invoice.insurancePolicyNo || 'N/A'}</p>
                    <p className="text-slate-600">Covered Amount: ₹{Number(invoice.insuranceCoveredAmount || 0).toLocaleString('en-IN')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Line Items</h3>
              
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm bg-slate-50/20">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-450 border-b border-slate-200/80 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Item Type</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4 text-center">Qty</th>
                      <th className="py-3 px-4 text-right">Unit Price</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      {isDraft && <th className="py-3 px-4 print:hidden"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] font-semibold text-slate-700">
                    {(!invoice.items || invoice.items.length === 0) ? (
                      <tr>
                        <td colSpan={isDraft ? 6 : 5} className="py-8 text-center text-slate-400 italic font-semibold">
                          No line items added yet.
                        </td>
                      </tr>
                    ) : (
                      invoice.items.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3 px-4 font-bold text-slate-600 uppercase text-[9px] tracking-wider">{item.itemType.replace('_', ' ')}</td>
                          <td className="py-3 px-4 text-slate-850 font-bold text-[12px]">{item.description}</td>
                          <td className="py-3 px-4 text-center font-bold">{item.quantity}</td>
                          <td className="py-3 px-4 text-right">₹{Number(item.unitPrice).toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-850">₹{Number(item.totalPrice).toFixed(2)}</td>
                          {isDraft && (
                            <td className="py-3 px-4 text-center print:hidden">
                              <button 
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-red-500 hover:text-red-750 p-1.5 hover:bg-red-50 rounded-lg transition"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add Item Form (Only if Draft) */}
              {isDraft && (
                <form onSubmit={handleAddItem} className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end print:hidden font-semibold text-xs text-slate-700">
                  <div className="sm:col-span-2.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Item Type</label>
                    <select
                      value={itemType}
                      onChange={(e) => setItemType(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-250 rounded-xl focus:outline-none focus:border-teal-500"
                    >
                      <option value="CONSULTATION">Consultation</option>
                      <option value="LAB_TEST">Lab Test</option>
                      <option value="MEDICINE">Medicine</option>
                      <option value="PROCEDURE">Procedure</option>
                      <option value="ROOM_CHARGE">Room Charge</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  
                  <div className="sm:col-span-4.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CBC blood test, Doctor consultation fee"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-250 rounded-xl focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="sm:col-span-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Qty</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full p-2.5 bg-white border border-slate-250 rounded-xl focus:outline-none focus:border-teal-500 text-center"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Unit Price *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={unitPrice || ''}
                      onChange={(e) => setUnitPrice(Number(e.target.value))}
                      className="w-full p-2.5 bg-white border border-slate-250 rounded-xl focus:outline-none focus:border-teal-500 text-right"
                    />
                  </div>

                  <div className="sm:col-span-1.5">
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
                    >
                      <Plus className="h-4.5 w-4.5" />
                      Add
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="mt-8 flex justify-end">
              <div className="w-full max-w-sm space-y-2 border-t border-slate-100 pt-5">
                <div className="flex justify-between">
                  <span className="text-slate-450 font-bold">Subtotal</span>
                  <span className="text-slate-700 font-bold">₹{Number(invoice.subtotal).toFixed(2)}</span>
                </div>
                {Number(invoice.discountAmount) > 0 || Number(invoice.discountPercent) > 0 ? (
                  <div className="flex justify-between text-blue-650">
                    <span>Discount {Number(invoice.discountPercent) > 0 ? `(${invoice.discountPercent}%)` : ''}</span>
                    <span className="font-bold">-₹{Number(invoice.discountAmount).toFixed(2)}</span>
                  </div>
                ) : null}
                {Number(invoice.taxPercent) > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-bold">GST / Tax ({invoice.taxPercent}%)</span>
                    <span className="text-slate-700 font-bold">₹{Number(invoice.taxAmount).toFixed(2)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-slate-150 pt-2.5 text-slate-800 text-sm font-extrabold">
                  <span>Grand Total</span>
                  <span>₹{Number(invoice.totalAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Amount Paid</span>
                  <span>₹{Number(invoice.amountPaid).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2.5 text-teal-700 text-sm font-extrabold bg-teal-50/30 p-2 rounded-xl">
                  <span>Balance Due</span>
                  <span>₹{Number(invoice.balanceAmount || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Invoice Notes Display */}
            {invoice.notes && (
              <div className="mt-8 p-4.5 bg-slate-50 border border-slate-150 rounded-2xl">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Invoice Notes</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">{invoice.notes}</p>
              </div>
            )}

          </div>

          {/* Right Panel Sidebar: Edit Invoice Settings OR Payment Logs */}
          <div className="space-y-6 print:hidden">
            
            {/* Edit Panel (Only if Draft) */}
            {isDraft && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4 font-semibold text-xs text-slate-700">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">Invoice Details</h3>
                
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Discount %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={discountPercent || ''}
                      onChange={(e) => {
                        setDiscountPercent(Number(e.target.value));
                        setDiscountAmount(0); // mutually exclusive logic
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Discount Amount (Flat ₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={discountAmount || ''}
                      onChange={(e) => {
                        setDiscountAmount(Number(e.target.value));
                        setDiscountPercent(0);
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tax % (GST/Service)</label>
                    <input
                      type="number"
                      min={0}
                      value={taxPercent || ''}
                      onChange={(e) => setTaxPercent(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Invoice Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Special billing instructions..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {savingSettings ? 'Recalculating...' : 'Apply Adjustments'}
                  </button>
                </div>
              </div>
            )}

            {/* Payment History Card (For Finalized/Completed Invoices) */}
            {!isDraft && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4 font-semibold text-xs text-slate-700">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">Payment Receipts</h3>
                
                {(!invoice.payments || invoice.payments.length === 0) ? (
                  <p className="text-slate-400 italic text-[11px]">No payment records registered for this invoice.</p>
                ) : (
                  <div className="space-y-3">
                    {invoice.payments.map((p: any) => (
                      <div key={p.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="font-extrabold text-slate-800 text-xs">{p.paymentNumber}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Method: {p.paymentMethod} | Status: {p.status}</p>
                          <p className="text-[9px] text-slate-350 mt-0.5">Paid: {new Date(p.paidAt || p.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-extrabold text-slate-850 text-xs">₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Refund listing */}
                {invoice.refunds && invoice.refunds.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Refunds Issued</h4>
                    {invoice.refunds.map((r: any) => (
                      <div key={r.id} className="p-3 bg-red-50/50 border border-red-100 rounded-xl flex items-center justify-between text-red-800">
                        <div>
                          <p className="font-extrabold text-xs">Refund: {r.id}</p>
                          <p className="text-[10px] text-red-650 mt-0.5">Reason: {r.reason}</p>
                          <p className="text-[9px] text-red-500 mt-0.5">Date: {new Date(r.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-extrabold text-xs">-₹{Number(r.refundAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Record Payment Cash Drawer Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 overflow-hidden">
            <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              Collect Cash Payment
            </h2>
            <p className="text-xs text-slate-500 font-semibold mb-6">Enter cash drawer collection details.</p>
            
            <form onSubmit={handleRecordPayment} className="space-y-4 font-semibold text-xs text-slate-700">
              
              <div>
                <label className="block text-xs font-bold text-slate-650 mb-1.5">Amount to Record (₹) *</label>
                <input
                  type="number"
                  required
                  min={0.01}
                  step="0.01"
                  max={Number(invoice.balanceAmount || 0)}
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500 text-lg text-slate-800 text-right"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Maximum balance amount is ₹{Number(invoice.balanceAmount || 0).toFixed(2)}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-650 mb-1.5">Drawer Notes (Optional)</label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Cashier drawer transaction notes, reference codes..."
                  rows={2}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment}
                  className="px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/10 cursor-pointer disabled:opacity-50"
                >
                  {recordingPayment ? 'Processing...' : 'Confirm Cash Collected'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
