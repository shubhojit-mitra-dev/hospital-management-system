import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      if (env.NODE_ENV === 'development') {
        this.transporter = nodemailer.createTransport({
          host: 'localhost',
          port: 1025,
          ignoreTLS: true,
        });
      } else {
        // Standard production fallback or logs
        this.transporter = null;
      }
    }
    return this.transporter!;
  }

  static async sendEmail(options: { to: string; subject: string; text: string; html?: string }): Promise<void> {
    if (env.NODE_ENV === 'development') {
      const tx = this.getTransporter();
      await tx.sendMail({
        from: 'no-reply@hms.com',
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
