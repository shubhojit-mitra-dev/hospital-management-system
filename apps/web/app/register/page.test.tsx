import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterPage from './page';
import api from '../../lib/axios';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Step 1 form fields by default', () => {
    render(<RegisterPage />);

    expect(screen.getByLabelText(/First Name/i)).toBeDefined();
    expect(screen.getByLabelText(/Last Name/i)).toBeDefined();
    expect(screen.getByLabelText(/Email/i)).toBeDefined();
    expect(screen.getByLabelText(/Phone/i)).toBeDefined();
    expect(screen.queryByLabelText(/Password/i)).toBeNull();
    expect(screen.getByRole('button', { name: /Next/i })).toBeDefined();
  });

  it('shows validation errors on Step 1 if values are invalid', async () => {
    render(<RegisterPage />);

    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    expect(await screen.findByText(/First name is required/i)).toBeDefined();
    expect(await screen.findByText(/Last name is required/i)).toBeDefined();
    expect(await screen.findByText(/Invalid email address/i)).toBeDefined();
    expect(await screen.findByText(/Phone number is required/i)).toBeDefined();
  });

  it('transitions to Step 2 when Step 1 is valid', async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText(/Phone/i), { target: { value: '1234567890' } });

    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    expect(await screen.findByLabelText(/Password/i)).toBeDefined();
    expect(screen.getByLabelText(/Hospital ID/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Back/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Register/i })).toBeDefined();
  });

  it('submits form, calls register API, and redirects to /verify-email on success', async () => {
    const apiSpy = vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        success: true,
        data: {
          message: 'Registration successful',
          userId: 'user-123'
        }
      }
    });

    render(<RegisterPage />);

    // Fill Step 1
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText(/Phone/i), { target: { value: '1234567890' } });
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    // Fill Step 2
    fireEvent.change(await screen.findByLabelText(/Password/i), { target: { value: 'StrongPass123!' } });
    fireEvent.change(screen.getByLabelText(/Hospital ID/i), { target: { value: 'hosp-1' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Register/i }));

    await waitFor(() => {
      expect(apiSpy).toHaveBeenCalledWith('/api/v1/auth/register', {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        phone: '1234567890',
        password: 'StrongPass123!',
        hospitalId: 'hosp-1',
      });
      expect(mockPush).toHaveBeenCalledWith('/verify-email?email=jane%40example.com');
    });
  });
});
