'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, Search, PlusCircle, Globe, Phone, Mail, ToggleLeft, ToggleRight, Trash2, MapPin } from 'lucide-react';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

interface Hospital {
  id: string;
  name: string;
  registrationNo: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  website?: string;
  isActive: boolean;
}

export default function HospitalsListPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchHospitals = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/v1/hospitals');
      // The API might return { success: true, data: [...] } or { success: true, data: { hospitals: [...] } }
      const data = response.data;
      // API returns a plain array of hospitals
      const list = Array.isArray(data) ? data : (data?.data ? (Array.isArray(data.data) ? data.data : data.data?.hospitals || []) : []);
      setHospitals(list);
    } catch (err: any) {
      console.error('Error fetching hospitals:', err);
      setError('Failed to fetch hospitals list. Make sure the backend server is running and database is seeded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/api/v1/hospitals/${id}/activate`, { isActive: !currentStatus });
      setHospitals((prev) =>
        prev.map((h) => (h.id === id ? { ...h, isActive: !currentStatus } : h))
      );
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update hospital status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hospital? All associated records will be lost.')) return;
    try {
      await api.delete(`/api/v1/hospitals/${id}`);
      setHospitals((prev) => prev.filter((h) => h.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete hospital');
    }
  };

  const filteredHospitals = hospitals.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.city.toLowerCase().includes(search.toLowerCase()) ||
    h.registrationNo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Hospitals Directory</h2>
          <p className="text-sm text-slate-500">Manage all registered hospital tenant domains in the system.</p>
        </div>
        <Link
          href="/super-admin/hospitals/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-teal-500/10 transition"
        >
          <PlusCircle className="h-4.5 w-4.5" />
          Register New Hospital
        </Link>
      </div>

      {/* Toolbar */}
      <div className="relative max-w-md w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, city, or registration no..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 pl-10 pr-4 w-full rounded-xl border border-slate-200/80 bg-white shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
        />
      </div>

      {error && (
        <div className="text-center p-6 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Hospitals Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-60 rounded-2xl bg-white border border-slate-200/80 shadow-md animate-pulse" />
          ))}
        </div>
      ) : filteredHospitals.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">No Hospitals Found</h3>
          <p className="text-sm text-slate-500 mt-1">
            {search ? 'Try adjusting your search criteria.' : 'Get started by registering your first hospital tenant.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHospitals.map((hospital) => (
            <div
              key={hospital.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <Building2 className="h-6 w-6 text-teal-600" />
                  </div>
                  <span
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider',
                      hospital.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-slate-50 text-slate-400 border border-slate-200'
                    )}
                  >
                    {hospital.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <h3 className="font-bold text-slate-800 text-lg mb-1 leading-snug line-clamp-1" title={hospital.name}>
                  {hospital.name}
                </h3>
                <p className="text-[11px] font-mono text-slate-400 mb-1 uppercase tracking-wider">Reg: {hospital.registrationNo}</p>
                <p className="text-[11px] font-mono text-teal-600 mb-4 select-all">ID: {hospital.id}</p>

                {/* Details */}
                <div className="space-y-2.5 text-slate-600 text-xs">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                    <span className="truncate">{hospital.address}, {hospital.city}, {hospital.state}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>{hospital.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="truncate">{hospital.email}</span>
                  </div>
                  {hospital.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 shrink-0 text-slate-400" />
                      <a
                        href={hospital.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-600 font-semibold hover:underline truncate"
                      >
                        {hospital.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-4">
                <button
                  onClick={() => handleToggleActive(hospital.id, hospital.isActive)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-teal-700 transition"
                >
                  {hospital.isActive ? (
                    <>
                      <ToggleRight className="h-5 w-5 text-teal-600" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-5 w-5 text-slate-400" />
                      Activate
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleDelete(hospital.id)}
                  className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-700 transition"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
