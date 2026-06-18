import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './page';
import api from '../../lib/axios';
import { useAuthStore } from '../../store/authStore';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().logout();
  });

  it('renders login form elements', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/Email Address/i)).toBeDefined();
    expect(screen.getByLabelText(/Password/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeDefined();
  });

  it('shows validation error messages when fields are empty', async () => {
    render(<LoginPage />);
    
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    expect(await screen.findByText(/Invalid email address/i)).toBeDefined();
    expect(await screen.findByText(/Password is required/i)).toBeDefined();
  });

  it('submits form and calls API and updates auth store on success', async () => {
    const apiSpy = vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        success: true,
        data: {
          accessToken: 'test-token',
          user: { id: '1', email: 'test@example.com', role: 'DOCTOR' }
        }
      }
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(apiSpy).toHaveBeenCalledWith('/api/v1/auth/login', {
        email: 'test@example.com',
        password: 'password123'
      });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().accessToken).toBe('test-token');
      expect(mockPush).toHaveBeenCalledWith('/patients');
    });
  });

  it('shows API error message on login failure', async () => {
    vi.spyOn(api, 'post').mockRejectedValue({
      response: {
        data: {
          message: 'Invalid credentials'
        }
      }
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrongpass' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    expect(await screen.findByText(/Invalid credentials/i)).toBeDefined();
  });
});
