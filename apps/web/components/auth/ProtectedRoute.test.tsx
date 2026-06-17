import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuthStore } from '../../store/authStore';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().logout();
  });

  it('redirects to /login if not authenticated', () => {
    render(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Secret Content')).toBeNull();
    expect(screen.getByText('Redirecting to login...')).toBeDefined();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('renders children if authenticated and no roles are required', () => {
    useAuthStore.getState().login(
      { id: '1', email: 'doc@hosp.com', role: 'DOCTOR' },
      'token'
    );

    render(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Secret Content')).toBeDefined();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('renders access denied and redirects to /unauthorized if role is not allowed', () => {
    useAuthStore.getState().login(
      { id: '1', email: 'pat@hosp.com', role: 'PATIENT' },
      'token'
    );

    render(
      <ProtectedRoute allowedRoles={['DOCTOR', 'NURSE']}>
        <div>Doctor Secret Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Doctor Secret Content')).toBeNull();
    expect(screen.getByText('Access Denied: Unauthorized role')).toBeDefined();
    expect(mockPush).toHaveBeenCalledWith('/unauthorized');
  });

  it('renders children if role is allowed', () => {
    useAuthStore.getState().login(
      { id: '1', email: 'doc@hosp.com', role: 'DOCTOR' },
      'token'
    );

    render(
      <ProtectedRoute allowedRoles={['DOCTOR', 'NURSE']}>
        <div>Doctor Secret Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Doctor Secret Content')).toBeDefined();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
