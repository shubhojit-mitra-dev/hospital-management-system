import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VerifyEmailPage from './page';
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

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it('prefills email from query parameters', () => {
    mockSearchParams.set('email', 'verify@example.com');
    render(<VerifyEmailPage />);

    const emailInput = screen.getByLabelText(/Email Address/i) as HTMLInputElement;
    expect(emailInput.value).toBe('verify@example.com');
  });

  it('shows validation error messages when fields are empty', async () => {
    render(<VerifyEmailPage />);
    
    fireEvent.click(screen.getByRole('button', { name: /Verify Email/i }));

    expect(await screen.findByText(/Invalid email address/i)).toBeDefined();
    expect(await screen.findByText(/Verification code is required/i)).toBeDefined();
  });

  it('submits form, calls verify-email API, and redirects to /login on success', async () => {
    const apiSpy = vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        success: true,
        data: {
          message: 'Email verified successfully'
        }
      }
    });

    mockSearchParams.set('email', 'verify@example.com');
    render(<VerifyEmailPage />);

    fireEvent.change(screen.getByLabelText(/Verification Code/i), { target: { value: '654321' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Verify Email/i }));

    await waitFor(() => {
      expect(apiSpy).toHaveBeenCalledWith('/api/v1/auth/verify-email', {
        email: 'verify@example.com',
        code: '654321'
      });
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });
});
