'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user?.forcePasswordChange) {
      router.push('/reset-password');
    } else if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      router.push('/unauthorized');
    }
  }, [isAuthenticated, user, allowedRoles, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Redirecting to login...</div>
      </div>
    );
  }

  if (user?.forcePasswordChange) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-amber-600 font-semibold animate-pulse">
          Password change required. Redirecting...
        </div>
      </div>
    );
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500 font-semibold">Access Denied: Unauthorized role</div>
      </div>
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;
