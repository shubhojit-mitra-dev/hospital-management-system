import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db');
vi.stubEnv('REDIS_URL', 'redis://localhost:6379');
vi.stubEnv('JWT_ACCESS_SECRET', 'access_secret_123');
vi.stubEnv('JWT_REFRESH_SECRET', 'refresh_secret_123');

// Mock ioredis
vi.mock('ioredis', () => {
  return {
    Redis: vi.fn().mockImplementation(() => {
      return {
        on: vi.fn(),
        call: vi.fn(),
      };
    }),
  };
});

describe('Auth Middlewares', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    nextFunction = vi.fn();
  });

  it('should return 401 if authenticate has no header', async () => {
    const { authenticate } = await import('../auth.middleware.js');
    mockRequest.headers = {};
    authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(401);
  });

  it('should return 403 if authorize roles mismatch', async () => {
    const { authorize } = await import('../auth.middleware.js');
    mockRequest.user = { id: 'u1', role: 'PATIENT', hospitalId: 'h1' };
    const middleware = authorize('DOCTOR', 'SUPER_ADMIN');
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(403);
  });

  it('should allow next if user has correct permissions in requirePermission', async () => {
    const { requirePermission } = await import('../auth.middleware.js');
    mockRequest.user = { id: 'u1', role: 'HOSPITAL_ADMIN', hospitalId: 'h1' };
    const middleware = requirePermission('hospital:read', 'staff:write');
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should return 403 if user lacks required permissions in requirePermission', async () => {
    const { requirePermission } = await import('../auth.middleware.js');
    mockRequest.user = { id: 'u1', role: 'PATIENT', hospitalId: 'h1' };
    const middleware = requirePermission('staff:write');
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(403);
  });

  it('should bypass requireHospital check for SUPER_ADMIN with null hospitalId', async () => {
    const { requireHospital } = await import('../auth.middleware.js');
    mockRequest.user = { id: 'u1', role: 'SUPER_ADMIN', hospitalId: null };
    mockRequest.params = { hospitalId: 'h1' };
    requireHospital(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should allow requireHospital for matching hospitalId for non-SUPER_ADMIN', async () => {
    const { requireHospital } = await import('../auth.middleware.js');
    mockRequest.user = { id: 'u1', role: 'HOSPITAL_ADMIN', hospitalId: 'h1' };
    mockRequest.params = { hospitalId: 'h1' };
    requireHospital(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should block requireHospital for mismatching hospitalId for non-SUPER_ADMIN', async () => {
    const { requireHospital } = await import('../auth.middleware.js');
    mockRequest.user = { id: 'u1', role: 'HOSPITAL_ADMIN', hospitalId: 'h1' };
    mockRequest.params = { hospitalId: 'h2' };
    requireHospital(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(403);
  });
});
