'use client';

import React, { useEffect, useState } from 'react';
import { Save, Calendar, Plus, CheckCircle2 } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

interface Leave {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  leaveType: string;
  status: string;
}

export default function DoctorLeavesPage() {
  const { user } = useAuthStore();
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddLeave, setShowAddLeave] = useState(false);

  // Form State
  const [leaveForm, setLeaveForm] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    leaveType: 'PERSONAL',
  });

  const fetchDoctorAndLeaves = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError('');
    try {
      // Resolve Doctor ID
      const docRes = await api.get('/api/v1/doctors', {
        params: { userId: user.id }
      });
      const doctorProfile = docRes.data?.[0];
      if (!doctorProfile) {
        setError('Doctor profile not found.');
        setLoading(false);
        return;
      }
      setDoctorId(doctorProfile.id);

      // Fetch leaves
      const leavesRes = await api.get(`/api/v1/doctors/${doctorProfile.id}/leaves`);
      setLeaves(leavesRes.data || []);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch leave logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorAndLeaves();
  }, [user]);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId) return;
    setError('');
    setSuccess('');
    try {
      await api.post(`/api/v1/doctors/${doctorId}/leaves`, leaveForm);
      setSuccess('Leave request submitted and auto-approved.');
      setShowAddLeave(false);
      setLeaveForm({ startDate: '', endDate: '', reason: '', leaveType: 'PERSONAL' });

      // Refresh leaves
      const leavesRes = await api.get(`/api/v1/doctors/${doctorId}/leaves`);
      setLeaves(leavesRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to submit leave request.');
    }
  };

  const cancelLeave = async (leaveId: string) => {
    if (!doctorId) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/api/v1/doctors/${doctorId}/leaves/${leaveId}`);
      setSuccess('Leave request cancelled successfully.');

      // Refresh leaves
      const leavesRes = await api.get(`/api/v1/doctors/${doctorId}/leaves`);
      setLeaves(leavesRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to cancel leave.');
    }
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['DOCTOR']}>
        <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
          <span className="font-semibold">Loading leave registry...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['DOCTOR']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Leave Planner</h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">Submit leave requests and view previous time-off approvals.</p>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-700 font-bold rounded-xl text-sm">{error}</div>}
        {success && <div className="p-4 bg-emerald-50 text-emerald-800 font-bold rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" /> {success}
        </div>}

        {/* Add Leave Form */}
        {showAddLeave ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-2">
              <Calendar className="h-4.5 w-4.5 text-teal-600" />
              Apply for Leave
            </h2>
            <form onSubmit={handleApplyLeave} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Start Date</label>
                <input
                  type="date"
                  value={leaveForm.startDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">End Date</label>
                <input
                  type="date"
                  value={leaveForm.endDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Leave Type</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold bg-white"
                >
                  <option value="PERSONAL">Personal</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="CONFERENCE">Conference</option>
                  <option value="VACATION">Vacation</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Reason / Notes</label>
                <input
                  type="text"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold"
                  placeholder="e.g. Family commitments"
                />
              </div>
              <div className="flex gap-2 col-span-1 md:col-span-4 justify-end mt-2">
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
                >
                  Submit Request
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddLeave(false)}
                  className="px-5 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddLeave(true)}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md"
            >
              <Plus className="h-4.5 w-4.5" /> Request Leave
            </button>
          </div>
        )}

        {/* Leaves Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800">My Leave History</h3>
          </div>
          {leaves.length === 0 ? (
            <p className="p-8 text-center text-slate-400 font-semibold italic">You haven't requested any leaves yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase">
                    <th className="p-4 px-6">Leave Duration</th>
                    <th className="p-4 px-6">Type</th>
                    <th className="p-4 px-6">Reason / Details</th>
                    <th className="p-4 px-6">Approval Status</th>
                    <th className="p-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {leaves.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/50">
                      <td className="p-4 px-6 text-xs text-slate-500">
                        {new Date(l.startDate).toLocaleDateString()} to {new Date(l.endDate).toLocaleDateString()}
                      </td>
                      <td className="p-4 px-6">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-md">
                          {l.leaveType}
                        </span>
                      </td>
                      <td className="p-4 px-6 text-slate-600">{l.reason || '—'}</td>
                      <td className="p-4 px-6">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase',
                          l.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                          l.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                        )}>
                          {l.status.toLowerCase()}
                        </span>
                      </td>
                      <td className="p-4 px-6 text-right">
                        {l.status === 'APPROVED' && (
                          <button
                            onClick={() => cancelLeave(l.id)}
                            className="text-red-500 hover:text-red-700 text-xs font-bold transition cursor-pointer"
                          >
                            Cancel Request
                          </button>
                        )}
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
