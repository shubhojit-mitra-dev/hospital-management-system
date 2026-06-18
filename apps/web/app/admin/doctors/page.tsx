'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Calendar, Stethoscope, Award, DollarSign, Clock, ClipboardList } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';

interface Doctor {
  id: string;
  registrationNo: string;
  specialization: string;
  qualification: string;
  experienceYears: number;
  consultationFee: string;
  slotDurationMins: number;
  isAvailable: boolean;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  department: {
    name: string;
  };
}

export default function AdminDoctorListPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchDoctors = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/v1/doctors');
      setDoctors(response.data || []);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch doctor directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const filteredDoctors = doctors.filter((doc) => {
    const name = `Dr. ${doc.user.firstName} ${doc.user.lastName}`.toLowerCase();
    const specialty = doc.specialization.toLowerCase();
    const dept = doc.department.name.toLowerCase();
    const query = search.toLowerCase();
    return name.includes(query) || specialty.includes(query) || dept.includes(query);
  });

  return (
    <DashboardLayout allowedRoles={['HOSPITAL_ADMIN']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Doctor Directory</h1>
            <p className="text-sm text-slate-500 font-semibold mt-1">Configure clinical availability schedules, slot times, and leaves.</p>
          </div>
          <Link
            href="/admin/staff/new"
            className="flex items-center justify-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-teal-600/10 cursor-pointer"
          >
            Onboard Doctor
          </Link>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-100 flex items-center gap-3">
          <Search className="h-5 w-5 text-slate-400 pl-1" />
          <input
            type="text"
            placeholder="Search by doctor name, specialization, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 text-sm font-medium text-slate-700"
          />
        </div>

        {/* Doctor Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-bold flex flex-col items-center justify-center gap-2">
            <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
            <span>Loading doctor profiles...</span>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="bg-white p-16 rounded-2xl border border-slate-200/80 text-center text-slate-400 font-bold">
            <Stethoscope className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <span>No doctor profiles found.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doc) => (
              <div key={doc.id} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 text-md">Dr. {doc.user.firstName} {doc.user.lastName}</h3>
                      <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">{doc.department.name}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md font-mono bg-slate-100 text-slate-600">
                      Reg: {doc.registrationNo}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 font-semibold space-y-1.5 pt-1 border-t border-slate-100">
                    <p className="flex items-center gap-1.5">
                      <Award className="h-3.5 w-3.5 text-slate-400" /> {doc.specialization} ({doc.qualification})
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" /> Slot Duration: {doc.slotDurationMins} Mins
                    </p>
                    <p className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-slate-400" /> Fee: ₹{parseFloat(doc.consultationFee).toFixed(0)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <Link
                    href={`/admin/doctors/${doc.id}`}
                    className="flex-1 text-center py-2 bg-slate-50 hover:bg-teal-50 border border-slate-200/80 hover:border-teal-100 text-slate-600 hover:text-teal-700 rounded-xl text-xs font-bold transition"
                  >
                    View details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
