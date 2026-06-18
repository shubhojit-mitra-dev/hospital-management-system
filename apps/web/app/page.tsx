'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!isAuthenticated || !user) {
      router.push('/login');
    } else if (user.forcePasswordChange) {
      router.push('/reset-password');
    } else if (user.role === 'SUPER_ADMIN') {
      router.push('/super-admin/hospitals');
    } else if (user.role === 'HOSPITAL_ADMIN') {
      router.push('/admin/departments');
    } else if (['RECEPTIONIST', 'DOCTOR', 'NURSE'].includes(user.role)) {
      router.push('/patients');
    } else {
      router.push('/unauthorized');
    }
  }, [hydrated, isAuthenticated, user, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-teal-600 font-semibold animate-pulse text-lg">
        Redirecting to dashboard...
      </div>
    </div>
  );
}
