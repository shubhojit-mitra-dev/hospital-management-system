import { describe, it, expect, vi, beforeEach } from 'vitest';
import api, { refreshInstance } from './axios';
import { useAuthStore } from '../store/authStore';

// Mock window location
const mockLocation = { href: '' };
vi.stubGlobal('location', mockLocation);

describe('Axios Client Interceptors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().logout();
    mockLocation.href = '';
  });

  it('should inject bearer token in request header when authenticated', async () => {
    // 1. Arrange
    useAuthStore.getState().login(
      { id: '1', email: 'test@example.com', role: 'DOCTOR' },
      'my-secret-token'
    );
    
    // Get the request interceptor handler
    const handler = (api.interceptors.request as any).handlers[0].fulfilled;
    const config = { headers: {} as any };
    
    // 2. Act
    const result = await handler(config);
    
    // 3. Assert
    expect(result.headers.Authorization).toBe('Bearer my-secret-token');
  });

  it('should not inject bearer token in request header when unauthenticated', async () => {
    const handler = (api.interceptors.request as any).handlers[0].fulfilled;
    const config = { headers: {} as any };
    
    const result = await handler(config);
    
    expect(result.headers.Authorization).toBeUndefined();
  });

  it('should retry original request with new token on 401 when refresh is successful', async () => {
    // 1. Arrange
    useAuthStore.getState().login(
      { id: '1', email: 'test@example.com', role: 'DOCTOR' },
      'old-token'
    );

    // Mock refreshInstance response
    vi.spyOn(refreshInstance, 'post').mockResolvedValue({
      data: {
        success: true,
        data: { accessToken: 'new-token' },
      },
    });

    // Mock api request call for retry
    const apiSpy = vi.spyOn(api, 'request').mockResolvedValue({ data: 'retry-success' } as any);

    const errorHandler = (api.interceptors.response as any).handlers[0].rejected;
    const originalConfig = { headers: {} as any, _retry: false };
    const error = {
      response: { status: 401 },
      config: originalConfig,
    };

    // 2. Act
    const result = await errorHandler(error);

    // 3. Assert
    expect(refreshInstance.post).toHaveBeenCalledWith('/api/v1/auth/refresh');
    expect(useAuthStore.getState().accessToken).toBe('new-token');
    expect(originalConfig.headers.Authorization).toBe('Bearer new-token');
    expect(apiSpy).toHaveBeenCalledWith(originalConfig);
    expect(result).toEqual({ data: 'retry-success' });
  });

  it('should logout and redirect to /login when refresh fails', async () => {
    // 1. Arrange
    useAuthStore.getState().login(
      { id: '1', email: 'test@example.com', role: 'DOCTOR' },
      'old-token'
    );

    // Mock refreshInstance failure
    vi.spyOn(refreshInstance, 'post').mockRejectedValue(new Error('Refresh failed'));

    const errorHandler = (api.interceptors.response as any).handlers[0].rejected;
    const originalConfig = { headers: {} as any, _retry: false };
    const error = {
      response: { status: 401 },
      config: originalConfig,
    };

    // 2. Act & Assert
    await expect(errorHandler(error)).rejects.toThrow();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(mockLocation.href).toBe('/login');
  });
});
