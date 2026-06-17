import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResetPasswordPage from './page';
import api from '../../lib/axios';

// Mock next/navigation
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it('prefills email from query parameters', () => {
    mockSearchParams.set('email', 'prefilled@example.com');
    render(<ResetPasswordPage />);

    const emailInput = screen.getByLabelText(/Email Address/i) as HTMLInputElement;
    expect(emailInput.value).toBe('prefilled@example.com');
  });

  it('shows validation error messages when fields are empty', async () => {
    render(<ResetPasswordPage />);
    
    fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }));

    expect(await screen.findByText(/Invalid email address/i)).toBeDefined();
    expect(await screen.findByText(/Reset code is required/i)).toBeDefined();
    expect(await screen.findByText(/Password must be at least 8 characters long/i)).toBeDefined();
  });

  it('submits form, calls reset-password API, and redirects to /login on success', async () => {
    const apiSpy = vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        success: true,
        data: {
          message: 'Password reset successful'
        }
      }
    });

    mockSearchParams.set('email', 'test@example.com');
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText(/Reset Code/i), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText(/New Password/i), { target: { value: 'StrongPass123!' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }));

    await waitFor(() => {
      expect(apiSpy).toHaveBeenCalledWith('/api/v1/auth/reset-password', {
        email: 'test@example.com',
        code: '123456',
        newPassword: 'StrongPass123!'
      });
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });
});
