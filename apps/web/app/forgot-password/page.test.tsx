import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ForgotPasswordPage from './page';
import api from '../../lib/axios';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders forgot password elements', () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByLabelText(/Email Address/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Send Reset OTP/i })).toBeDefined();
  });

  it('shows validation error messages when fields are empty', async () => {
    render(<ForgotPasswordPage />);
    
    fireEvent.click(screen.getByRole('button', { name: /Send Reset OTP/i }));

    expect(await screen.findByText(/Invalid email address/i)).toBeDefined();
  });

  it('submits form, calls forgot-password API, and redirects to /reset-password on success', async () => {
    const apiSpy = vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        success: true,
        data: {
          message: 'OTP sent successfully'
        }
      }
    });

    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'test@example.com' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Send Reset OTP/i }));

    await waitFor(() => {
      expect(apiSpy).toHaveBeenCalledWith('/api/v1/auth/forgot-password', {
        email: 'test@example.com'
      });
      expect(mockPush).toHaveBeenCalledWith('/reset-password?email=test%40example.com');
    });
  });
});
