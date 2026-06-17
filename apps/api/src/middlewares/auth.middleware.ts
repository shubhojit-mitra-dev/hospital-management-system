import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../services/jwt.service.js';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const decoded = JwtService.verifyAccessToken(token) as { id: string; role: string; hospitalId: string };
    req.user = {
      id: decoded.id,
      role: decoded.role,
      hospitalId: decoded.hospitalId,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    return next();
  };
};

export const requireHospital = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const targetHospitalId = req.params.hospitalId || req.body.hospitalId || req.query.hospitalId;
  if (targetHospitalId && req.user.hospitalId !== targetHospitalId && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Access restricted to your hospital' });
  }

  return next();
};

export const requireSelf = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const targetUserId = req.params.userId || req.body.userId;
  if (targetUserId && req.user.id !== targetUserId && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'HOSPITAL_ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Action restricted to self' });
  }

  return next();
};
