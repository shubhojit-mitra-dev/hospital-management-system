import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export class JwtService {
  static signAccessToken(payload: object): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
  }

  static signRefreshToken(payload: object): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
  }

  static verifyAccessToken(token: string): object {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as object;
  }

  static verifyRefreshToken(token: string): object {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as object;
  }
}
