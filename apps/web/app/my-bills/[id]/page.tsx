'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  FileText, 
  ArrowLeft, 
  Printer, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  CreditCard,
  Lock,
  Sparkles,
  Info
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

export default function PatientInvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Payment mock states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'IDLE' | 'INITIATING' | 'PROCESSING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [paymentError, setPaymentError] = useState('');
  const [mockGatewayDetails, setMockGatewayDetails] = useState<any>(null);

  const fetchInvoiceDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/v1/billing/invoices/${id}`);
      setInvoice(res.data?.data);
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

  const handleStartCheckout = async () => {
    if (!invoice) return;
    setPaymentStatus('INITIATING');
    setPaymentError('');
    setIsCheckoutOpen(true);
    
    try {
      // Initiate endpoint triggers order generation on backend
      const res = await api.post('/api/v1/billing/payments/initiate', {
        invoiceId: invoice.id,
        amount: Number(invoice.balanceAmount),
        paymentMethod: 'UPI'
      });
      
      if (res.data?.success) {
        setMockGatewayDetails(res.data.data);
        setPaymentStatus('IDLE');
      }
    } catch (err: any) {
      console.error(err);
      setPaymentStatus('FAILED');
      setPaymentError(err.response?.data?.error || 'Failed to initialize payment gateway.');
    }
  };

  const handleSimulatePayment = async (shouldSucceed: boolean) => {
    if (!invoice || !mockGatewayDetails) return;
    
    setPaymentStatus('PROCESSING');
    setPaymentError('');

    // Wait 1.5 seconds to simulate transaction delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (!shouldSucceed) {
      setPaymentStatus('FAILED');
      setPaymentError('The mock bank rejected the transaction. Please check your credit balance.');
      return;
    }

    try {
      // Verification payload matching backend expectations
      const payload = {
        invoiceId: invoice.id,
        amount: Number(invoice.balanceAmount),
        gatewayOrderId: mockGatewayDetails.gatewayOrderId,
        gatewayPaymentId: `pay_mock_${Math.random().toString(36).substring(2, 11)}`,
        gatewaySignature: `sig_mock_${Math.random().toString(36).substring(2, 11)}`
      };

      const res = await api.post('/api/v1/billing/payments/verify', payload);
      if (res.data?.success) {
        setPaymentStatus('SUCCESS');
        // Refresh details after a brief delay
        setTimeout(() => {
          setIsCheckoutOpen(false);
          setPaymentStatus('IDLE');
          fetchInvoiceDetails();
        }, 2000);
      }
    } catch (err: any) {
      console.error(err);
      setPaymentStatus('FAILED');
      setPaymentError(err.response?.data?.error || 'Failed to verify transaction signature.');
    }
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['PATIENT']}>
        <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
          <span className="text-xs font-semibold">Loading bill details...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !invoice) {
    return (
      <DashboardLayout allowedRoles={['PATIENT']}>
        <div className="space-y-6">
          <button onClick={() => router.push('/my-bills')} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition">
            <ArrowLeft className="h-4 w-4" />
            Back to Invoices
          </button>
          <div className="p-5 bg-red-50 text-red-750 font-bold rounded-2xl border border-red-100 flex items-center gap-3 text-xs">
            <AlertTriangle className="h-5 w-5" />
            <span>{error || 'Bill not found.'}</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isPaid = invoice.status === 'PAID';
  const balanceDue = Number(invoice.balanceAmount || 0);

  return (
    <DashboardLayout allowedRoles={['PATIENT']}>
      <div className="space-y-8">
        
        {/* Header Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm print:hidden">
          <button 
            onClick={() => router.push('/my-bills')} 
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
            Back to Invoices
          </button>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Print Receipt
            </button>
            {!isPaid && balanceDue > 0 && (
              <button 
                onClick={handleStartCheckout}
                className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-teal-650 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-650/15 transition cursor-pointer"
              >
                <CreditCard className="h-4.5 w-4.5" />
                Pay Outstanding Bill Online
              </button>
            )}
          </div>
        </div>

        {/* Invoice Page Layout */}
        <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden p-6 md:p-8 font-semibold text-xs text-slate-700 print:border-none print:shadow-none">
          
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row justify-between border-b border-slate-100 pb-6 mb-6 gap-6">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-teal-650 tracking-wider">Patient Copy Invoice</span>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">{invoice.invoiceNumber}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={cn(
                    'text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider',
                    invoice.status === 'PAID' && 'bg-emerald-100 text-emerald-800',
                    invoice.status === 'PENDING' && 'bg-amber-100 text-amber-800',
                    invoice.status === 'PARTIALLY_PAID' && 'bg-blue-100 text-blue-800',
                    invoice.status === 'CANCELLED' && 'bg-red-100 text-red-800'
                  )}
                >
                  {invoice.status}
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

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-100 pb-6 mb-6">
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Billed To</span>
              <div className="font-bold text-slate-800 text-sm">
                {invoice.patient?.firstName} {invoice.patient?.lastName}
              </div>
              <p className="text-slate-555">Phone: {invoice.patient?.phone || 'N/A'}</p>
              <p className="text-slate-555">Email: {invoice.patient?.email || 'N/A'}</p>
            </div>
            <div className="space-y-1.5 md:text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Insurance Claims</span>
              {invoice.insuranceProvider ? (
                <div>
                  <p className="text-slate-700 font-bold">{invoice.insuranceProvider}</p>
                  <p className="text-slate-500">Status: {invoice.insuranceStatus || 'PENDING'}</p>
                  <p className="text-slate-500">Claim Amount: ₹{Number(invoice.insuranceCoveredAmount || 0).toFixed(2)}</p>
                </div>
              ) : (
                <p className="text-slate-400 italic">Self-Pay (No insurance linked)</p>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Bill Breakdown</h3>
            <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-450 border-b border-slate-200/80 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Price</th>
                    <th className="py-3 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] font-semibold text-slate-700">
                  {invoice.items?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-bold text-slate-500 uppercase text-[9px] tracking-wider">{item.itemType.replace('_', ' ')}</td>
                      <td className="py-3 px-4 text-slate-850 font-bold text-[12px]">{item.description}</td>
                      <td className="py-3 px-4 text-center">{item.quantity}</td>
                      <td className="py-3 px-4 text-right">₹{Number(item.unitPrice).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-850">₹{Number(item.totalPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Balance breakdown */}
          <div className="mt-8 flex justify-end">
            <div className="w-full max-w-sm space-y-2 border-t border-slate-100 pt-5">
              <div className="flex justify-between">
                <span className="text-slate-450 font-bold">Subtotal</span>
                <span>₹{Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              {Number(invoice.discountAmount) > 0 && (
                <div className="flex justify-between text-blue-650">
                  <span>Applied Discount</span>
                  <span className="font-bold">-₹{Number(invoice.discountAmount).toFixed(2)}</span>
                </div>
              )}
              {Number(invoice.taxPercent) > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-450 font-bold">GST ({invoice.taxPercent}%)</span>
                  <span>₹{Number(invoice.taxAmount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-150 pt-2 text-slate-850 font-extrabold text-sm">
                <span>Grand Total</span>
                <span>₹{Number(invoice.totalAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-450">
                <span>Amount Paid</span>
                <span>₹{Number(invoice.amountPaid).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-teal-700 font-extrabold text-sm bg-teal-50/30 p-2.5 rounded-xl">
                <span>Outstanding Balance</span>
                <span>₹{balanceDue.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Receipt Transaction list */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="mt-10 border-t border-slate-100 pt-6 space-y-3">
              <h3 className="text-sm font-bold text-slate-800">Transaction History</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {invoice.payments.map((p: any) => (
                  <div key={p.id} className="p-3.5 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-850 text-xs">{p.paymentNumber}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Method: {p.paymentMethod} | Status: {p.status}</p>
                      <p className="text-[9px] text-slate-350 mt-0.5">Paid: {new Date(p.paidAt || p.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-slate-800 text-xs">₹{Number(p.amount).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Mock Razorpay Gateway Checkout Simulator Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden font-semibold text-xs text-slate-700">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-teal-400 animate-pulse" />
                <h3 className="text-md font-extrabold tracking-tight">Razorpay Checkout Sandbox</h3>
              </div>
              <button 
                onClick={() => setIsCheckoutOpen(false)} 
                disabled={paymentStatus === 'PROCESSING'}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              
              {paymentStatus === 'INITIATING' ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="h-7 w-7 rounded-full border-4 border-slate-800 border-t-transparent animate-spin"></div>
                  <p className="text-slate-500 font-bold">Contacting Payment Gateway...</p>
                </div>
              ) : paymentStatus === 'PROCESSING' ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <div className="h-7 w-7 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
                  <p className="text-slate-800 font-bold">Simulating Bank Authentication...</p>
                  <p className="text-[10px] text-slate-400 font-medium max-w-xs mt-1">Please do not refresh this page or close the gateway container.</p>
                </div>
              ) : paymentStatus === 'SUCCESS' ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                  <p className="text-emerald-800 font-bold text-sm">Payment Successful!</p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">Mock transaction authorized. Finalizing your invoice...</p>
                </div>
              ) : (
                <div className="space-y-5">
                  
                  {/* Bill Details Box */}
                  <div className="bg-slate-50 border border-slate-150 p-4.5 rounded-2xl">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/50 mb-2.5">
                      <span className="text-slate-400 font-bold">ORDER ID</span>
                      <span className="font-extrabold text-slate-800">{mockGatewayDetails?.gatewayOrderId}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold">PAYABLE AMOUNT</span>
                      <span className="font-extrabold text-slate-900 text-sm">₹{balanceDue.toFixed(2)}</span>
                    </div>
                  </div>

                  {paymentStatus === 'FAILED' && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-red-800 text-[11px] leading-relaxed">
                      <AlertTriangle className="h-4.5 w-4.5 text-red-650 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Transaction Declined</p>
                        <p className="font-semibold text-red-650">{paymentError}</p>
                      </div>
                    </div>
                  )}

                  {/* Actions to simulate outcome */}
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-center">Choose Simulated Gateway Outcome</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleSimulatePayment(false)}
                        className="py-3 px-4.5 border border-red-200 hover:bg-red-50 text-red-700 font-extrabold rounded-xl transition cursor-pointer"
                      >
                        Fail Payment
                      </button>
                      <button
                        onClick={() => handleSimulatePayment(true)}
                        className="py-3 px-4.5 bg-teal-650 hover:bg-teal-700 text-white font-extrabold rounded-xl shadow-md shadow-teal-600/10 transition cursor-pointer"
                      >
                        Authorize Success
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-center text-[10px] text-slate-400 font-semibold pt-2">
                    <Lock className="h-3.5 w-3.5 text-slate-350" />
                    <span>Mock payments are secure and do not charge real banking cards.</span>
                  </div>

                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
