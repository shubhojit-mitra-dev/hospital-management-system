'use client';

import React, { useEffect, useState } from 'react';
import { Search, Plus, Calendar, AlertTriangle, ShieldCheck, FileText, CheckCircle2, ChevronRight, Bookmark } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'stock' | 'catalog' | 'alerts'>('stock');
  const [inventory, setInventory] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [expiringAlerts, setExpiringAlerts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals / Form States
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [showReceiveBatch, setShowReceiveBatch] = useState(false);

  // New Medicine Form State
  const [medForm, setMedForm] = useState({
    brandName: '',
    genericName: '',
    composition: '',
    category: 'TABLET',
    manufacturer: '',
    drugSchedule: 'OTC',
    isPrescriptionRequired: false,
    unitOfMeasure: 'Tablet',
    sellingPrice: '',
  });

  // New Batch Form State
  const [batchForm, setBatchForm] = useState({
    medicineId: '',
    batchNumber: '',
    quantity: '',
    reorderLevel: '50',
    expiryDate: '',
    purchasePrice: '',
    supplierId: '',
    location: '',
  });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [invRes, catRes, lowRes, expRes, supRes] = await Promise.all([
        api.get('/api/v1/pharmacy/inventory'),
        api.get('/api/v1/pharmacy/medicines'),
        api.get('/api/v1/pharmacy/inventory-alerts/low-stock'),
        api.get('/api/v1/pharmacy/inventory-alerts/expiring'),
        api.get('/api/v1/pharmacy/suppliers'),
      ]);

      setInventory(invRes.data?.data || []);
      setCatalog(catRes.data?.data || []);
      setLowStockAlerts(lowRes.data?.data?.alerts || []);
      setExpiringAlerts(expRes.data?.data?.alerts || []);
      setSuppliers(supRes.data?.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch inventory dataset.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddMedicineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/api/v1/pharmacy/medicines', {
        ...medForm,
        sellingPrice: parseFloat(medForm.sellingPrice) || 0,
      });
      setSuccess('Medicine catalog record created.');
      setShowAddMedicine(false);
      setMedForm({
        brandName: '',
        genericName: '',
        composition: '',
        category: 'TABLET',
        manufacturer: '',
        drugSchedule: 'OTC',
        isPrescriptionRequired: false,
        unitOfMeasure: 'Tablet',
        sellingPrice: '',
      });
      fetchData();
    } catch (err) {
      setError('Failed to add medicine to catalog.');
    }
  };

  const handleReceiveBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/api/v1/pharmacy/inventory', {
        ...batchForm,
        quantity: parseInt(batchForm.quantity) || 0,
        reorderLevel: parseInt(batchForm.reorderLevel) || 50,
        purchasePrice: parseFloat(batchForm.purchasePrice) || 0,
      });
      setSuccess('Batch inventory received successfully.');
      setShowReceiveBatch(false);
      setBatchForm({
        medicineId: '',
        batchNumber: '',
        quantity: '',
        reorderLevel: '50',
        expiryDate: '',
        purchasePrice: '',
        supplierId: '',
        location: '',
      });
      fetchData();
    } catch (err) {
      setError('Failed to receive inventory batch.');
    }
  };

  return (
    <DashboardLayout allowedRoles={['PHARMACIST', 'HOSPITAL_ADMIN']}>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Pharmacy Stock & Inventory Desk</h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Control pharmacy catalog, record inbound batches, and monitor stock health.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAddMedicine(true)}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-250 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Medicine Catalog
            </button>
            <button
              onClick={() => setShowReceiveBatch(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-650 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Receive Inbound Batch
            </button>
          </div>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-750 font-bold rounded-xl text-xs">{error}</div>}
        {success && <div className="p-4 bg-emerald-50 text-emerald-850 font-bold rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" /> {success}
        </div>}

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex border-b border-slate-200 bg-slate-50/50 px-4">
              {(['stock', 'catalog', 'alerts'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'py-3.5 px-3 border-b-2 font-bold text-xs transition-all uppercase tracking-wider cursor-pointer',
                    activeTab === tab
                      ? 'border-teal-600 text-teal-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  )}
                >
                  {tab === 'stock' ? 'Inventory Batches' : tab === 'catalog' ? 'Medicine Registry' : 'Stock Alerts'}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* TAB 1: Inventory Batches */}
              {activeTab === 'stock' && (
                <div className="overflow-x-auto font-semibold text-xs text-slate-700">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-bold">
                        <th className="pb-2">Brand / Generic</th>
                        <th className="pb-2">Batch ID</th>
                        <th className="pb-2">Quantity</th>
                        <th className="pb-2">Expiry Date</th>
                        <th className="pb-2">Location</th>
                        <th className="pb-2">Supplier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {inventory.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/10">
                          <td className="py-3">
                            <span className="font-bold text-slate-800 text-sm block">{item.medicine?.brandName}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{item.medicine?.genericName}</span>
                          </td>
                          <td className="py-3 font-mono font-bold text-slate-600">{item.batchNumber}</td>
                          <td className="py-3">
                            <span className={cn(
                              "font-bold",
                              item.quantity <= item.reorderLevel ? "text-orange-500" : "text-slate-700"
                            )}>
                              {item.quantity} {item.medicine?.unitOfMeasure}s
                            </span>
                          </td>
                          <td className="py-3 text-slate-450">{new Date(item.expiryDate).toLocaleDateString()}</td>
                          <td className="py-3 text-slate-450">{item.location || '—'}</td>
                          <td className="py-3 text-slate-450">{item.supplier?.name || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 2: Medicine Registry */}
              {activeTab === 'catalog' && (
                <div className="overflow-x-auto font-semibold text-xs text-slate-700">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-bold">
                        <th className="pb-2">Brand Name</th>
                        <th className="pb-2">Generic Composition</th>
                        <th className="pb-2">Category</th>
                        <th className="pb-2">Schedule</th>
                        <th className="pb-2">Selling Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {catalog.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/10">
                          <td className="py-3 font-bold text-slate-800 text-sm">{m.brandName}</td>
                          <td className="py-3 font-medium text-slate-650">{m.genericName}</td>
                          <td className="py-3 text-slate-500">{m.category}</td>
                          <td className="py-3 text-slate-500">{m.drugSchedule || 'OTC'}</td>
                          <td className="py-3 font-bold text-slate-850">₹{m.sellingPrice}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 3: Stock Alerts */}
              {activeTab === 'alerts' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-semibold text-xs text-slate-750">
                  {/* Low Stock alerts */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">Low Stock Alerts</h3>
                    {lowStockAlerts.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No low stock items detected.</p>
                    ) : (
                      lowStockAlerts.map((alert, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-orange-50 border border-orange-100/50 p-3 rounded-xl">
                          <div>
                            <span className="font-bold text-slate-800 text-sm block">{alert.medicine?.brandName}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{alert.medicine?.genericName}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-orange-700">Stock: {alert.currentStock}</span>
                            <span className="block text-[9px] text-slate-400">Reorder limit: {alert.reorderLevel}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Expiry alerts */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">Expiring Soon (90 Days)</h3>
                    {expiringAlerts.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No expiring batches detected.</p>
                    ) : (
                      expiringAlerts.map((alert, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-red-50 border border-red-100/50 p-3 rounded-xl">
                          <div>
                            <span className="font-bold text-slate-800 text-sm block">{alert.medicine?.brandName}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">Batch: {alert.batchNumber}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-red-700">Expires: {alert.expiryDate}</span>
                            <span className="block text-[9px] text-slate-400">{alert.daysUntilExpiry} days left</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MODAL 1: Add Medicine Catalog */}
        {showAddMedicine && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 max-w-md w-full shadow-2xl font-semibold text-xs text-slate-750 space-y-4">
              <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3">Register New Medicine Catalog</h2>
              <form onSubmit={handleAddMedicineSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Brand Name</label>
                    <input
                      type="text"
                      value={medForm.brandName}
                      onChange={(e) => setMedForm({ ...medForm, brandName: e.target.value })}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg bg-white"
                      placeholder="e.g. Crocin"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Generic Name</label>
                    <input
                      type="text"
                      value={medForm.genericName}
                      onChange={(e) => setMedForm({ ...medForm, genericName: e.target.value })}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg bg-white"
                      placeholder="e.g. Paracetamol"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Category</label>
                    <select
                      value={medForm.category}
                      onChange={(e) => setMedForm({ ...medForm, category: e.target.value })}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="TABLET">Tablet</option>
                      <option value="SYRUP">Syrup</option>
                      <option value="INJECTION">Injection</option>
                      <option value="CAPSULE">Capsule</option>
                      <option value="CREAM">Cream</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Selling Price</label>
                    <input
                      type="number"
                      value={medForm.sellingPrice}
                      onChange={(e) => setMedForm({ ...medForm, sellingPrice: e.target.value })}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg bg-white"
                      placeholder="₹"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddMedicine(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-650 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4.5 py-2 bg-teal-650 hover:bg-teal-700 text-white rounded-lg font-bold shadow-sm cursor-pointer"
                  >
                    Register
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: Receive Inbound Batch */}
        {showReceiveBatch && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 max-w-md w-full shadow-2xl font-semibold text-xs text-slate-755 space-y-4">
              <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3">Receive Inbound Batch</h2>
              <form onSubmit={handleReceiveBatchSubmit} className="space-y-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Select Medicine</label>
                  <select
                    value={batchForm.medicineId}
                    onChange={(e) => setBatchForm({ ...batchForm, medicineId: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg bg-white"
                    required
                  >
                    <option value="">-- Choose Medicine --</option>
                    {catalog.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.brandName} ({m.genericName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Batch Number</label>
                    <input
                      type="text"
                      value={batchForm.batchNumber}
                      onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg bg-white"
                      placeholder="e.g. B2024-001"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Quantity Received</label>
                    <input
                      type="number"
                      value={batchForm.quantity}
                      onChange={(e) => setBatchForm({ ...batchForm, quantity: e.target.value })}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={batchForm.expiryDate}
                      onChange={(e) => setBatchForm({ ...batchForm, expiryDate: e.target.value })}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Purchase Price (Unit)</label>
                    <input
                      type="number"
                      value={batchForm.purchasePrice}
                      onChange={(e) => setBatchForm({ ...batchForm, purchasePrice: e.target.value })}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg bg-white"
                      placeholder="₹"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Select Supplier</label>
                  <select
                    value={batchForm.supplierId}
                    onChange={(e) => setBatchForm({ ...batchForm, supplierId: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowReceiveBatch(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-650 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4.5 py-2 bg-teal-650 hover:bg-teal-700 text-white rounded-lg font-bold shadow-sm cursor-pointer"
                  >
                    Receive Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
