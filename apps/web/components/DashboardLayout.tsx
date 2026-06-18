'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Users, 
  Calendar, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  ClipboardList, 
  Activity, 
  Clock, 
  FileText, 
  Menu, 
  X,
  Layers,
  FileSpreadsheet,
  ShieldAlert
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';

interface DashboardLayoutProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function DashboardLayout({ children, allowedRoles }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasImmediateEmergency, setHasImmediateEmergency] = useState(false);

  useEffect(() => {
    const role = user?.role;
    if (!role || !['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'].includes(role)) {
      return;
    }

    const checkEmergencies = async () => {
      try {
        const res = await api.get('/api/v1/emergency');
        const cases = res.data?.data?.cases || [];
        const hasImmediate = cases.some((c: any) => c.triageLevel === 'IMMEDIATE' && c.status === 'ACTIVE');
        setHasImmediateEmergency(hasImmediate);
      } catch (err) {
        console.error('Failed to check for immediate emergencies', err);
      }
    };

    checkEmergencies();
    const interval = setInterval(checkEmergencies, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Define nav links based on role
  const getNavItems = () => {
    const role = user?.role;
    const items = [];

    // All staff roles (except patients for now, who have a different dashboard) see Patients & Appointments
    if (['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'].includes(role || '')) {
      items.push({
        name: 'Patients',
        href: '/patients',
        icon: Users,
      });
      items.push({
        name: 'Appointments',
        href: '/appointments',
        icon: Calendar,
      });
    }

    if (role === 'DOCTOR') {
      items.push({
        name: 'My Schedule',
        href: '/doctor/schedule',
        icon: Clock,
      });
      items.push({
        name: 'My Leaves',
        href: '/doctor/leaves',
        icon: ClipboardList,
      });
    }

    if (role === 'HOSPITAL_ADMIN') {
      items.push({
        name: 'Departments',
        href: '/admin/departments',
        icon: Layers,
      });
      items.push({
        name: 'Staff Directory',
        href: '/admin/staff',
        icon: ShieldCheck,
      });
      items.push({
        name: 'Doctors',
        href: '/admin/doctors',
        icon: Activity,
      });
      items.push({
        name: 'Settings & Holidays',
        href: '/admin/settings',
        icon: Settings,
      });
    }

    // Module 7: Lab Technician
    if (role === 'LAB_TECHNICIAN') {
      items.push({
        name: 'Lab Orders',
        href: '/lab/orders',
        icon: ClipboardList,
      });
    }

    // Module 8: Pharmacist
    if (role === 'PHARMACIST') {
      items.push({
        name: 'Prescriptions',
        href: '/pharmacy',
        icon: ClipboardList,
      });
      items.push({
        name: 'Inventory',
        href: '/pharmacy/inventory',
        icon: Layers,
      });
    }

    // Module 9: Billing Executive & Hospital Admin
    if (['HOSPITAL_ADMIN', 'BILLING_EXECUTIVE'].includes(role || '')) {
      items.push({
        name: 'Billing & Invoices',
        href: '/billing',
        icon: FileSpreadsheet,
      });
    }

    // Module 10: Inpatient Admission Management
    if (['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE'].includes(role || '')) {
      items.push({
        name: 'Inpatient Care',
        href: '/inpatient',
        icon: Activity,
      });
    }
    if (role === 'HOSPITAL_ADMIN') {
      items.push({
        name: 'Ward Setup',
        href: '/wards',
        icon: Layers,
      });
    }

    // Module 11: Emergency & Triage Management
    if (['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'].includes(role || '')) {
      items.push({
        name: 'Emergency Board',
        href: '/emergency',
        icon: ShieldAlert,
      });
      items.push({
        name: 'Duty Roster',
        href: '/emergency/roster',
        icon: Clock,
      });
    }

    // Patient access
    if (role === 'PATIENT') {
      items.push({
        name: 'My Lab Reports',
        href: '/my-labs',
        icon: ClipboardList,
      });
      items.push({
        name: 'My Invoices',
        href: '/my-bills',
        icon: FileSpreadsheet,
      });
    }

    return items;
  };

  const navItems = getNavItems();
  const roleDisplay = user?.role ? user.role.replace('_', ' ') : '';

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div className="min-h-screen bg-slate-50 flex">
        {/* Desktop Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between hidden md:flex sticky top-0 h-screen">
          <div className="p-6 overflow-y-auto flex-1">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-teal-600 p-2 rounded-xl text-white shadow-md shadow-teal-600/20">
                <Activity className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <h1 className="font-bold text-slate-800 text-md tracking-tight leading-none mb-1">HMS Portal</h1>
                <span className="text-[10px] uppercase font-bold text-teal-600 tracking-wider">{roleDisplay}</span>
              </div>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200',
                      isActive
                        ? 'bg-teal-50 text-teal-700 shadow-sm shadow-teal-500/5'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    <item.icon className={cn('h-5 w-5', isActive ? 'text-teal-700' : 'text-slate-400')} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="p-6 border-t border-slate-100 bg-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
                {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{user?.firstName || 'User'} {user?.lastName || ''}</p>
                <p className="text-[10px] text-slate-400 font-semibold truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-red-50 hover:text-red-700 border border-slate-200/80 hover:border-red-100 rounded-xl text-xs font-bold text-slate-600 transition duration-150 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <aside className="relative w-64 bg-white flex flex-col justify-between p-6 h-full shadow-xl animate-in slide-in-from-left duration-200">
              <div>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="bg-teal-600 p-2 rounded-xl text-white">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <h1 className="font-bold text-slate-800 text-sm leading-none mb-1">HMS</h1>
                      <span className="text-[9px] uppercase font-bold text-teal-600 tracking-wider">{roleDisplay}</span>
                    </div>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200',
                          isActive
                            ? 'bg-teal-50 text-teal-700'
                            : 'text-slate-600 hover:bg-slate-50'
                        )}
                      >
                        <item.icon className={cn('h-5 w-5', isActive ? 'text-teal-700' : 'text-slate-400')} />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-9 w-9 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
                    {user?.firstName?.[0] || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{user?.firstName} {user?.lastName}</p>
                    <p className="text-[10px] text-slate-400 font-semibold truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-red-50 hover:text-red-700 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-600"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {hasImmediateEmergency && (
            <div className="bg-red-600 text-white px-4 py-2.5 text-center text-xs font-extrabold uppercase tracking-wider animate-pulse flex items-center justify-center gap-2 z-50 border-b border-red-700 shadow-lg shadow-red-650/10">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>CRITICAL ALERT: Active Level 1 (IMMEDIATE) Emergency Case in Bay! MD assistance required immediately.</span>
            </div>
          )}
          {/* Top Header */}
          <header className="bg-white border-b border-slate-200/80 h-16 flex items-center justify-between px-6 md:px-8 sticky top-0 z-40">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden text-slate-600 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="hidden md:block">
                <span className="text-sm font-semibold text-slate-500">
                  Logged in under hospital workspace.
                </span>
              </div>
              <div className="md:hidden flex items-center gap-2">
                <Activity className="h-5 w-5 text-teal-600" />
                <span className="font-bold text-slate-800 text-sm">HMS</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800">{user?.firstName} {user?.lastName}</span>
                <span className="text-[9px] font-bold text-teal-600 uppercase tracking-wider">{roleDisplay}</span>
              </div>
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs">
                {user?.firstName?.[0] || 'U'}
              </div>
            </div>
          </header>

          {/* Page body */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl w-full mx-auto animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default DashboardLayout;
