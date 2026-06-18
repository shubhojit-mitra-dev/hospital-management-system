import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter(): nodemailer.Transporter | null {
    if (!this.transporter) {
      if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
        // Real SMTP configuration
        this.transporter = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT || 587,
          secure: env.SMTP_PORT === 465,
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          },
        });
      } else if (env.NODE_ENV === 'development') {
        // Local Maildev fallback in development
        this.transporter = nodemailer.createTransport({
          host: 'localhost',
          port: 1025,
          ignoreTLS: true,
        });
      } else {
        this.transporter = null;
      }
    }
    return this.transporter;
  }

  static async sendEmail(options: { to: string; subject: string; text: string; html?: string }): Promise<void> {
    const tx = this.getTransporter();
    if (tx) {
      await tx.sendMail({
        from: env.SMTP_FROM || 'no-reply@hms.com',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
    } else {
      console.log(`[Email Mock Log] To: ${options.to} | Subject: ${options.subject}`);
      console.log(`Text: ${options.text}`);
    }
  }
}
