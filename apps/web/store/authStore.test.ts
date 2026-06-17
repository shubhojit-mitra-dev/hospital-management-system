import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('should start with default unauthenticated state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should login a user', () => {
    const user = { id: '1', email: 'test@example.com', role: 'DOCTOR', firstName: 'John', lastName: 'Doe', hospitalId: 'hosp-1' };
    const token = 'test-token';
    useAuthStore.getState().login(user, token);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.accessToken).toBe(token);
    expect(state.isAuthenticated).toBe(true);
  });

  it('should refresh the access token', () => {
    const user = { id: '1', email: 'test@example.com', role: 'DOCTOR' };
    useAuthStore.getState().login(user, 'old-token');
    useAuthStore.getState().refresh('new-token');

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('new-token');
    expect(state.isAuthenticated).toBe(true);
  });

  it('should logout a user', () => {
    const user = { id: '1', email: 'test@example.com', role: 'DOCTOR' };
    useAuthStore.getState().login(user, 'test-token');
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
