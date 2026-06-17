import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { ulid } from 'ulid';
import crypto from 'crypto';
import { prisma } from '../config/db.js';
import { JwtService } from '../services/jwt.service.js';
import { EmailService } from '../services/email.service.js';
import { AuditService } from '../services/audit.service.js';
import { env } from '../config/env.js';
import {
  registerRequestSchema,
  loginRequestSchema,
  verifyEmailRequestSchema,
  forgotPasswordRequestSchema,
  resetPasswordRequestSchema,
  changePasswordRequestSchema,
} from '@repo/types';

export class AuthController {
  static async register(req: Request, res: Response) {
    const parsed = registerRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input data', details: parsed.error.format() });
    }

    const { email, password, firstName, lastName, phone, hospitalId } = parsed.data;

    try {
      const hospitalExists = await prisma.hospital.findUnique({ where: { id: hospitalId } });
      if (!hospitalExists) {
        return res.status(404).json({ error: 'Hospital not found' });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userId = `usr_${ulid().toLowerCase()}`;

      const user = await prisma.user.create({
        data: {
          id: userId,
          hospitalId,
          email,
          passwordHash,
          role: 'PATIENT',
          firstName,
          lastName,
          phone,
          isVerified: false,
          isActive: true,
        },
      });

      // Create Verification OTP code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = crypto.createHash('sha256').update(otpCode).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      await prisma.otpCode.create({
        data: {
          id: `otp_${ulid().toLowerCase()}`,
          userId: user.id,
          codeHash,
          purpose: 'EMAIL_VERIFY',
          expiresAt,
        },
      });

      await EmailService.sendEmail({
        to: email,
        subject: 'Verify your HMS Email',
        text: `Your email verification OTP code is: ${otpCode}. It expires in 15 minutes.`,
      });

      await AuditService.recordLog({
        userId: user.id,
        action: 'PATIENT_REGISTER',
        details: `Registered account for email ${email}`,
        ipAddress: req.ip,
      });

      return res.status(201).json({ message: 'Registration successful. Verification OTP sent to email.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async verifyEmail(req: Request, res: Response) {
    const parsed = verifyEmailRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input data', details: parsed.error.format() });
    }

    const { email, code } = parsed.data;

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const codeHash = crypto.createHash('sha256').update(code).digest('hex');
      const otp = await prisma.otpCode.findFirst({
        where: {
          userId: user.id,
          codeHash,
          purpose: 'EMAIL_VERIFY',
          expiresAt: { gt: new Date() },
          usedAt: null,
        },
      });

      if (!otp) {
        return res.status(400).json({ error: 'Invalid or expired verification code' });
      }

      await prisma.otpCode.update({
        where: { id: otp.id },
        data: { usedAt: new Date() },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });

      await AuditService.recordLog({
        userId: user.id,
        action: 'EMAIL_VERIFICATION_SUCCESS',
        details: `Verified email address: ${email}`,
        ipAddress: req.ip,
      });

      return res.status(200).json({ message: 'Email verified successfully. You can now log in.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async login(req: Request, res: Response) {
    const parsed = loginRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input data', details: parsed.error.format() });
    }

    const { email, password } = parsed.data;

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate Tokens
      const accessToken = JwtService.signAccessToken({ id: user.id, role: user.role, hospitalId: user.hospitalId });
      const refreshToken = JwtService.signRefreshToken({ id: user.id });

      const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await prisma.refreshToken.create({
        data: {
          id: `tok_${ulid().toLowerCase()}`,
          userId: user.id,
          tokenHash: refreshTokenHash,
          expiresAt,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          hospitalId: user.hospitalId,
          isVerified: user.isVerified,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async refresh(req: Request, res: Response) {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    try {
      const payload = JwtService.verifyRefreshToken(token) as { id: string };
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const tokenRecord = await prisma.refreshToken.findFirst({
        where: { tokenHash },
      });

      if (!tokenRecord) {
        return res.status(401).json({ error: 'Token not recognized' });
      }

      // Breach Detection
      if (tokenRecord.revokedAt) {
        // Revoke all tokens for this user
        await prisma.refreshToken.updateMany({
          where: { userId: payload.id },
          data: { revokedAt: new Date() },
        });
        return res.status(401).json({ error: 'Breach detected. Please log in again.' });
      }

      if (tokenRecord.expiresAt < new Date()) {
        return res.status(401).json({ error: 'Refresh token expired' });
      }

      const user = await prisma.user.findUnique({ where: { id: payload.id } });
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'User unavailable' });
      }

      // Rotate Refresh Token
      const newAccessToken = JwtService.signAccessToken({ id: user.id, role: user.role, hospitalId: user.hospitalId });
      const newRefreshToken = JwtService.signRefreshToken({ id: user.id });

      const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Revoke old token
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() },
      });

      // Save new token
      await prisma.refreshToken.create({
        data: {
          id: `tok_${ulid().toLowerCase()}`,
          userId: user.id,
          tokenHash: newHash,
          expiresAt,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        accessToken: newAccessToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          hospitalId: user.hospitalId,
          isVerified: user.isVerified,
        },
      });
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
  }

  static async logout(req: Request, res: Response) {
    const token = req.cookies?.refreshToken;
    try {
      if (token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        await prisma.refreshToken.updateMany({
          where: { tokenHash },
          data: { revokedAt: new Date() },
        });
      }

      res.clearCookie('refreshToken');
      return res.status(200).json({ message: 'Logged out successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async forgotPassword(req: Request, res: Response) {
    const parsed = forgotPasswordRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input data', details: parsed.error.format() });
    }

    const { email } = parsed.data;

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        // Return 200 to prevent user enumeration
        return res.status(200).json({ message: 'If the email exists, a password reset link has been sent.' });
      }

      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = crypto.createHash('sha256').update(resetCode).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.otpCode.create({
        data: {
          id: `otp_${ulid().toLowerCase()}`,
          userId: user.id,
          codeHash,
          purpose: 'PASSWORD_RESET',
          expiresAt,
        },
      });

      await EmailService.sendEmail({
        to: email,
        subject: 'Reset your HMS Password',
        text: `Your password reset code is: ${resetCode}. It expires in 15 minutes.`,
      });

      return res.status(200).json({ message: 'If the email exists, a password reset link has been sent.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    const parsed = resetPasswordRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input data', details: parsed.error.format() });
    }

    const { email, code, newPassword } = parsed.data;

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const codeHash = crypto.createHash('sha256').update(code).digest('hex');
      const otp = await prisma.otpCode.findFirst({
        where: {
          userId: user.id,
          codeHash,
          purpose: 'PASSWORD_RESET',
          expiresAt: { gt: new Date() },
          usedAt: null,
        },
      });

      if (!otp) {
        return res.status(400).json({ error: 'Invalid or expired reset code' });
      }

      await prisma.otpCode.update({
        where: { id: otp.id },
        data: { usedAt: new Date() },
      });

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      // Revoke all active sessions
      await prisma.refreshToken.updateMany({
        where: { userId: user.id },
        data: { revokedAt: new Date() },
      });

      return res.status(200).json({ message: 'Password reset successful. All active sessions have been logged out.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async me(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          hospitalId: user.hospitalId,
          isVerified: user.isVerified,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async changePassword(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsed = changePasswordRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input data', details: parsed.error.format() });
    }

    const { oldPassword, newPassword } = parsed.data;

    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const validPassword = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!validPassword) {
        return res.status(400).json({ error: 'Old password is incorrect' });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      return res.status(200).json({ message: 'Password changed successfully.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
