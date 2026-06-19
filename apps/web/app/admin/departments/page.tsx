'use client';

import React, { useState, useEffect } from 'react';
import { Layers, Search, PlusCircle, Pencil, Trash2, X, Loader2, Info } from 'lucide-react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { DashboardLayout } from '@/components/DashboardLayout';

interface Department {
  id: string;
  name: string;
  description?: string;
}

export default function DepartmentsDashboard() {
  const { user } = useAuthStore();
  const hospitalId = user?.hospitalId;

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Form modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDepartments = async () => {
    if (!hospitalId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/v1/hospitals/${hospitalId}/departments`);
      // Response data is either direct array or has a departments key
      const list = response.data?.data?.departments || response.data?.data || response.data || [];
      setDepartments(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.error('Failed to load departments:', err);
      setError('Could not retrieve departments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [hospitalId]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setName('');
    setDescription('');
    setSelectedDept(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setModalMode('edit');
    setName(dept.name);
    setDescription(dept.description || '');
    setSelectedDept(dept);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      if (modalMode === 'create') {
        const response = await api.post(`/api/v1/hospitals/${hospitalId}/departments`, {
          name: name.trim(),
          description: description.trim(),
        });
        setDepartments((prev) => [...prev, response.data]);
      } else if (modalMode === 'edit' && selectedDept) {
        const response = await api.put(`/api/v1/hospitals/${hospitalId}/departments/${selectedDept.id}`, {
          name: name.trim(),
          description: description.trim(),
        });
        setDepartments((prev) =>
          prev.map((d) => (d.id === selectedDept.id ? response.data : d))
        );
      }
      setIsModalOpen(false);
      setName('');
      setDescription('');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      await api.delete(`/api/v1/hospitals/${hospitalId}/departments/${id}`);
      setDepartments((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete department');
    }
  };

  const filteredDepts = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.description && d.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardLayout allowedRoles={['HOSPITAL_ADMIN']}>
      <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Hospital Departments</h2>
          <p className="text-sm text-slate-500">Configure clinic divisions and clinical specializations.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-teal-500/10 transition"
        >
          <PlusCircle className="h-4.5 w-4.5" />
          Add Department
        </button>
      </div>

      {/* Toolbar */}
      <div className="relative max-w-md w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search departments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 pl-10 pr-4 w-full rounded-xl border border-slate-200/80 bg-white shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2.5 p-4 bg-red-50 border border-red-100 text-red-800 text-xs font-semibold rounded-xl">
          <Info className="h-4 w-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Departments Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 rounded-2xl bg-white border border-slate-200/80 shadow-md animate-pulse" />
          ))}
        </div>
      ) : filteredDepts.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <Layers className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">No Departments Found</h3>
          <p className="text-sm text-slate-500 mt-1">
            {search ? 'Try adjusting your search criteria.' : 'Get started by creating your first department.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepts.map((dept) => (
            <div
              key={dept.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="bg-teal-50 p-2 rounded-lg text-teal-600 border border-teal-100/30">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(dept)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition"
                      title="Edit Department"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(dept.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50/50 rounded-lg transition"
                      title="Delete Department"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <h3 className="font-bold text-slate-800 text-md line-clamp-1">{dept.name}</h3>
                <p className="text-slate-500 text-xs mt-1.5 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                  {dept.description || 'No description provided.'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg">
                {modalMode === 'create' ? 'Create Department' : 'Edit Department'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Department Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Cardiology"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Description</label>
                <textarea
                  placeholder="Provide details about the department..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="p-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex gap-3 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-teal-500/10 transition"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {modalMode === 'create' ? 'Create' : 'Save Changes'}
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
