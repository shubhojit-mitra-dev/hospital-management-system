'use client';

import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

interface AuthCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <Card className="w-full max-w-md p-8 border border-slate-200/80 shadow-xl shadow-slate-200/30 bg-white">
        <CardHeader className="text-center mb-6 p-0 flex flex-col items-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-teal-50 text-teal-600 border border-teal-100/80 shadow-sm">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-1.5 text-slate-950 tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-slate-500">{description}</p>
        </CardHeader>
        <CardContent className="p-0">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
