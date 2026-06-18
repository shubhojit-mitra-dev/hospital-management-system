'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserPlus, Search, Phone, Mail, ToggleLeft, ToggleRight, Trash2, Shield, Calendar } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';

interface StaffMember {
  id: string;
  employeeId: string;
  designation: string | null;
  joinDate: string | null;
  isActive: boolean;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: string;
  };
  department: {
    name: string;
  } | null;
}

export default function AdminStaffListPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchStaff = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/v1/staff');
      setStaff(response.data || []);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load staff list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/api/v1/staff/${id}`, { isActive: !currentStatus });
      setStaff((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive: !currentStatus } : s))
      );
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
    }
  };

  const deleteStaff = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff profile?')) return;
    try {
      await api.delete(`/api/v1/staff/${id}`);
      setStaff((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete staff member.');
    }
  };

  const filteredStaff = staff.filter((s) => {
    const fullName = `${s.user.firstName} ${s.user.lastName}`.toLowerCase();
    const email = s.user.email.toLowerCase();
    const id = s.employeeId.toLowerCase();
    const query = search.toLowerCase();
    return fullName.includes(query) || email.includes(query) || id.includes(query);
  });

  return (
    <DashboardLayout allowedRoles={['HOSPITAL_ADMIN']}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Staff Directory</h1>
            <p className="text-sm text-slate-500 font-semibold mt-1">Manage personnel, designations, and permissions.</p>
          </div>
          <Link
            href="/admin/staff/new"
            className="flex items-center justify-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-teal-600/10 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            Add Staff Member
          </Link>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-100 flex items-center gap-3">
          <Search className="h-5 w-5 text-slate-400 pl-1" />
          <input
            type="text"
            placeholder="Search by name, email, or employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 text-sm font-medium text-slate-700"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-100 overflow-hidden">
          {error && <div className="p-4 text-center text-red-600 bg-red-50 font-bold">{error}</div>}

          {loading ? (
            <div className="p-12 text-center text-slate-500 font-bold flex flex-col items-center justify-center gap-2">
              <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
              <span>Fetching staff profiles...</span>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="p-16 text-center text-slate-400 font-bold">
              <Shield className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <span>No staff members found.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-4 px-6">Employee ID</th>
                    <th className="p-4 px-6">Name</th>
                    <th className="p-4 px-6">Role</th>
                    <th className="p-4 px-6">Department</th>
                    <th className="p-4 px-6">Designation</th>
                    <th className="p-4 px-6">Contact</th>
                    <th className="p-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700 text-sm">
                  {filteredStaff.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="p-4 px-6">
                        <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                          {s.employeeId}
                        </span>
                      </td>
                      <td className="p-4 px-6">
                        <span className="font-bold text-slate-800">{s.user.firstName} {s.user.lastName}</span>
                      </td>
                      <td className="p-4 px-6 text-xs">
                        <span className="px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                          {s.user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 px-6 text-slate-600">{s.department?.name || '—'}</td>
                      <td className="p-4 px-6 text-slate-600">{s.designation || '—'}</td>
                      <td className="p-4 px-6 text-xs text-slate-500 space-y-0.5">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {s.user.phone || '—'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {s.user.email}
                        </div>
                      </td>
                      <td className="p-4 px-6 text-right flex justify-end gap-3 items-center">
                        <button
                          onClick={() => toggleStatus(s.id, s.isActive)}
                          className="text-slate-500 hover:text-teal-600 transition cursor-pointer"
                          title="Toggle Status"
                        >
                          {s.isActive ? (
                            <ToggleRight className="h-6 w-6 text-teal-600" />
                          ) : (
                            <ToggleLeft className="h-6 w-6 text-slate-400" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteStaff(s.id)}
                          className="text-red-500 hover:text-red-700 transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
