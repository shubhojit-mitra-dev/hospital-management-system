'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, PlusCircle, LogOut, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { cn } from '@/lib/utils';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navItems = [
    {
      name: 'Hospitals',
      href: '/super-admin/hospitals',
      icon: Building2,
    },
    {
      name: 'Register Hospital',
      href: '/super-admin/hospitals/new',
      icon: PlusCircle,
    },
  ];

  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
      <div className="min-h-screen bg-slate-50 flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between hidden md:flex">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-teal-600 p-2 rounded-xl text-white shadow-md shadow-teal-600/20">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-bold text-slate-800 text-md tracking-tight leading-none mb-1">HMS Portal</h1>
                <span className="text-[10px] uppercase font-bold text-teal-600 tracking-wider">Super Admin</span>
              </div>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
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

          <div className="p-6 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm">
                SA
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{user?.email}</p>
                <p className="text-[10px] text-slate-400 font-semibold truncate">System Overseer</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-red-50 hover:text-red-700 border border-slate-200/80 hover:border-red-100 rounded-xl text-xs font-bold text-slate-600 transition duration-150"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Navbar */}
          <header className="bg-white border-b border-slate-200/80 h-16 flex items-center justify-between px-6 md:px-8">
            <div className="flex items-center gap-3 md:hidden">
              <ShieldAlert className="h-5 w-5 text-teal-600" />
              <span className="font-bold text-slate-800 text-sm">HMS Super Admin</span>
            </div>
            
            <div className="hidden md:block">
              <span className="text-sm font-semibold text-slate-500">
                Welcome back, system administrator.
              </span>
            </div>

            <div className="flex items-center gap-4 md:hidden">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="text-slate-600 hover:text-teal-600 p-1">
                  <item.icon className="h-5 w-5" />
                </Link>
              ))}
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-600 p-1">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </header>

          {/* Page body */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
