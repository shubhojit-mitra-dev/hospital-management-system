import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleGate } from './RoleGate';
import { useAuthStore } from '../../store/authStore';

describe('RoleGate', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('renders nothing if not authenticated', () => {
    render(
      <RoleGate allowedRoles={['DOCTOR']}>
        <div>Doctor Panel</div>
      </RoleGate>
    );

    expect(screen.queryByText('Doctor Panel')).toBeNull();
  });

  it('renders fallback if not authenticated and fallback is provided', () => {
    render(
      <RoleGate allowedRoles={['DOCTOR']} fallback={<div>Access Denied</div>}>
        <div>Doctor Panel</div>
      </RoleGate>
    );

    expect(screen.queryByText('Doctor Panel')).toBeNull();
    expect(screen.getByText('Access Denied')).toBeDefined();
  });

  it('renders children if authenticated and has allowed role', () => {
    useAuthStore.getState().login(
      { id: '1', email: 'doc@hosp.com', role: 'DOCTOR' },
      'token'
    );

    render(
      <RoleGate allowedRoles={['DOCTOR']}>
        <div>Doctor Panel</div>
      </RoleGate>
    );

    expect(screen.getByText('Doctor Panel')).toBeDefined();
  });

  it('does not render children if authenticated but role does not match', () => {
    useAuthStore.getState().login(
      { id: '1', email: 'pat@hosp.com', role: 'PATIENT' },
      'token'
    );

    render(
      <RoleGate allowedRoles={['DOCTOR']} fallback={<div>Access Denied</div>}>
        <div>Doctor Panel</div>
      </RoleGate>
    );

    expect(screen.queryByText('Doctor Panel')).toBeNull();
    expect(screen.getByText('Access Denied')).toBeDefined();
  });
});
