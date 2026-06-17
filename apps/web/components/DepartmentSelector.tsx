'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

interface Department {
  id: string;
  name: string;
  code: string;
  isActive?: boolean;
}

interface DepartmentSelectorProps {
  value?: string; // department id or code
  onChange: (value: string, department?: Department) => void;
  hospitalId?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function DepartmentSelector({
  value,
  onChange,
  hospitalId,
  className,
  placeholder = 'Select department...',
  disabled = false,
}: DepartmentSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const activeHospitalId = hospitalId || user?.hospitalId;

  useEffect(() => {
    const fetchDepartments = async () => {
      if (!activeHospitalId) return;
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/api/v1/hospitals/${activeHospitalId}/departments`);
        // The API returns { success: true, data: { departments: [...], total: X } } or similar
        const list = response.data.data?.departments || response.data.data || [];
        setDepartments(list.filter((d: Department) => d.isActive !== false));
      } catch (err: any) {
        console.error('Failed to load departments', err);
        setError('Failed to load departments');
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, [activeHospitalId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedDepartment = departments.find(
    (d) => d.id === value || d.code === value
  );

  const filteredDepartments = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50',
          className
        )}
      >
        {loading ? (
          <span className="flex items-center text-slate-500 gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
            Loading departments...
          </span>
        ) : selectedDepartment ? (
          <span className="truncate font-medium text-slate-800">
            {selectedDepartment.name} <span className="text-xs text-slate-400 font-mono">({selectedDepartment.code})</span>
          </span>
        ) : (
          <span className="text-slate-500 truncate">{placeholder}</span>
        )}
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2 text-slate-500" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center border-b border-slate-100 px-3 py-2 dark:border-slate-800">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-slate-500" />
            <input
              type="text"
              placeholder="Search departments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-7 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {error && (
            <div className="px-3 py-2 text-xs text-red-500 text-center">{error}</div>
          )}

          {filteredDepartments.length === 0 ? (
            <div className="px-3 py-2.5 text-sm text-slate-500 text-center">
              No departments found.
            </div>
          ) : (
            <div className="py-1">
              {filteredDepartments.map((dept) => {
                const isSelected = dept.id === value || dept.code === value;
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => {
                      onChange(dept.id, dept);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={cn(
                      'relative flex w-full cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors hover:bg-teal-50 hover:text-teal-900 text-left text-slate-700 dark:text-slate-300',
                      isSelected && 'bg-teal-50 text-teal-900 font-semibold'
                    )}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 shrink-0',
                        isSelected ? 'opacity-100 text-teal-600' : 'opacity-0'
                      )}
                    />
                    <span className="flex-1 truncate">{dept.name}</span>
                    <span className="text-xs text-slate-400 font-mono">{dept.code}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
