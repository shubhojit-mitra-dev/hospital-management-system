'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xl text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center border border-red-100 shadow-sm shadow-red-500/5">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-800">Access Restricted</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Your user account role does not have permission to view this section of the hospital management portal.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold shadow-md transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
