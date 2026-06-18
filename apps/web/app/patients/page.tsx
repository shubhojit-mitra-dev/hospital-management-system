'use client';

import React, { useEffect, useState, startTransition } from 'react';
import Link from 'next/link';
import { Search, UserPlus, FileText, ChevronLeft, ChevronRight, User, Phone, Mail, Award, CheckCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

interface Patient {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  gender: string;
  bloodGroup: string | null;
  phone: string;
  email: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function PatientListPage() {
  const { user } = useAuthStore();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPatients = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/v1/patients', {
        params: {
          search,
          gender,
          bloodGroup,
          page,
          limit: 10,
        },
      });
      const data = response.data;
      setPatients(data.patients || []);
      setTotalPages(Math.ceil((data.meta?.total || 0) / 10) || 1);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch patients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [gender, bloodGroup, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPatients();
  };

  const isReceptionistOrAdmin = user && ['HOSPITAL_ADMIN', 'RECEPTIONIST'].includes(user.role);

  return (
    <DashboardLayout allowedRoles={['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Patient Directory</h1>
            <p className="text-sm text-slate-500 font-semibold mt-1">Manage, search, and register patient records.</p>
          </div>
          {isReceptionistOrAdmin && (
            <Link
              href="/patients/new"
              className="flex items-center justify-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-md shadow-teal-600/10 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              Register Patient
            </Link>
          )}
        </div>

        {/* Search & Filters */}
        <form onSubmit={handleSearchSubmit} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-100 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, phone, email or patient ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-medium transition-all"
            />
          </div>
          
          <div className="flex flex-wrap md:flex-nowrap gap-4">
            <select
              value={gender}
              onChange={(e) => {
                setGender(e.target.value);
                setPage(1);
              }}
              className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 min-w-[130px]"
            >
              <option value="">All Genders</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>

            <select
              value={bloodGroup}
              onChange={(e) => {
                setBloodGroup(e.target.value);
                setPage(1);
              }}
              className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 min-w-[150px]"
            >
              <option value="">All Blood Groups</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
            </select>

            <button
              type="submit"
              className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              Search
            </button>
          </div>
        </form>

        {/* Table / Listing */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-100 overflow-hidden">
          {error && (
            <div className="p-6 text-center text-red-600 bg-red-50 font-medium border-b border-red-100">
              {error}
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center text-slate-500 font-semibold flex flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
              <span>Fetching patient records...</span>
            </div>
          ) : patients.length === 0 ? (
            <div className="p-16 text-center text-slate-400 font-medium">
              <User className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-600 font-semibold mb-1">No Patients Found</p>
              <p className="text-sm">Try adjusting your search criteria or add a new patient record.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Patient ID</th>
                    <th className="py-4 px-6">Full Name</th>
                    <th className="py-4 px-6">Contact details</th>
                    <th className="py-4 px-6">Gender</th>
                    <th className="py-4 px-6">Blood Group</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors text-sm font-medium text-slate-700">
                      <td className="py-4.5 px-6">
                        <span className="font-bold text-teal-700 font-mono text-xs px-2.5 py-1 bg-teal-50 rounded-lg border border-teal-100">
                          {patient.patientNumber}
                        </span>
                      </td>
                      <td className="py-4.5 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{patient.firstName} {patient.lastName}</span>
                          {patient.isActive && <CheckCircle className="h-4.5 w-4.5 text-emerald-500 fill-emerald-50" />}
                        </div>
                      </td>
                      <td className="py-4.5 px-6 text-xs text-slate-500 space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span>{patient.phone}</span>
                        </div>
                        {patient.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            <span className="truncate max-w-[180px]">{patient.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4.5 px-6 text-xs">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full font-bold uppercase tracking-wider',
                          patient.gender === 'MALE' ? 'bg-blue-50 text-blue-700' :
                          patient.gender === 'FEMALE' ? 'bg-pink-50 text-pink-700' : 'bg-slate-100 text-slate-700'
                        )}>
                          {patient.gender.toLowerCase()}
                        </span>
                      </td>
                      <td className="py-4.5 px-6">
                        {patient.bloodGroup ? (
                          <span className="font-bold text-red-600 bg-red-50 border border-red-100/50 text-xs px-2 py-0.5 rounded-lg">
                            {patient.bloodGroup}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-semibold">—</span>
                        )}
                      </td>
                      <td className="py-4.5 px-6 text-right">
                        <Link
                          href={`/patients/${patient.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-teal-50 border border-slate-200/80 hover:border-teal-100 hover:text-teal-700 rounded-lg text-xs font-bold text-slate-600 transition"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          View File
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-40 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-40 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
