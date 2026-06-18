import nodemailer from 'nodemailer';
import { ulid } from 'ulid';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';

// Setup Nodemailer Transporter
let transporter: nodemailer.Transporter;

if (env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT || 587,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
} else {
  // Fallback to local console mock if no SMTP configured
  transporter = {
    sendMail: async (options: any) => {
      console.log(`[SMTP MOCK - EMAIL DISPATCH] To: ${options.to} | Subject: ${options.subject}\nBody: ${options.text || options.html}`);
      return { messageId: `mock_${ulid()}` };
    }
  } as any;
}

export interface NotificationPayload {
  hospitalId: string;
  eventType: string; // e.g. APPOINTMENT_BOOKED
  recipients: string[]; // User IDs
  title: string;
  body: string;
  entityType?: string; // e.g. appointment, invoice, lab_order
  entityId?: string;
  actionUrl?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  templateData?: Record<string, string>;
}

export class NotificationService {
  
  // HTML templates catalog mapping
  static getHtmlTemplate(eventType: string, title: string, body: string, data: Record<string, string> = {}): string {
    const mainBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="background-color: #0d9488; color: white; padding: 15px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">HMS Portal</h2>
        </div>
        <div style="padding: 20px; color: #334155; line-height: 1.6;">
          <h3 style="color: #0f172a; margin-top: 0;">${title}</h3>
          <p>${body}</p>
          
          ${Object.keys(data).length > 0 ? `
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                ${Object.entries(data).map(([key, val]) => `
                  <tr>
                    <td style="padding: 6px 0; font-weight: bold; color: #64748b; text-transform: capitalize; width: 40%; font-size: 13px;">${key.replace(/([A-Z])/g, ' $1')}:</td>
                    <td style="padding: 6px 0; color: #1e293b; font-weight: 600; font-size: 13px;">${val}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          ` : ''}

          <div style="margin-top: 25px; text-align: center;">
            <a href="http://localhost:3000" style="background-color: #0d9488; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Access Portal</a>
          </div>
        </div>
        <div style="text-align: center; color: #94a3b8; font-size: 11px; padding-top: 15px; border-top: 1px solid #f1f5f9;">
          © 2026 Hospital Management System. All rights reserved.<br>
          This is an automated operational notification.
        </div>
      </div>
    `;
    return mainBody;
  }

  // Check quiet hours restriction
  private static isQuietHours(pref: any, priority: string): boolean {
    if (!pref || !pref.quietHoursEnabled) return false;
    
    // High and critical notifications bypass quiet hours
    if (priority === 'HIGH' || priority === 'CRITICAL') return false;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
    
    const start = pref.quietStart || '22:00';
    const end = pref.quietEnd || '07:00';

    if (start <= end) {
      return currentTimeStr >= start && currentTimeStr <= end;
    } else {
      // quiet hours span across midnight
      return currentTimeStr >= start || currentTimeStr <= end;
    }
  }

  // Main send dispatcher
  static async send(payload: NotificationPayload): Promise<void> {
    const {
      hospitalId,
      eventType,
      recipients,
      title,
      body,
      entityType,
      entityId,
      actionUrl,
      priority = 'NORMAL',
      templateData = {}
    } = payload;

    const today = new Date();

    for (const userId of recipients) {
      try {
        // 1. Fetch User details (Email & Phone)
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, phone: true }
        });

        if (!user) continue;

        // 2. Fetch or initialize notification preferences
        let pref = await prisma.notificationPreference.findUnique({
          where: { userId }
        });

        if (!pref) {
          // Default preferences mapping
          pref = await prisma.notificationPreference.create({
            data: {
              id: `prf_${ulid().toLowerCase()}`,
              userId,
              emailEnabled: true,
              smsEnabled: true,
              inAppEnabled: true,
              eventPreferences: {}
            }
          });
        }

        // 3. Resolve channels to deliver based on preferences and quiet hours
        const inQuietHours = this.isQuietHours(pref, priority);
        const resolvedChannels: ('IN_APP' | 'EMAIL' | 'SMS')[] = [];

        // Check In-App preference
        const eventPrefs = (pref.eventPreferences || {}) as Record<string, any>;
        const eventPref = eventPrefs[eventType] || {};

        if (pref.inAppEnabled && eventPref.inApp !== false) {
          resolvedChannels.push('IN_APP');
        }

        // If in quiet hours, skip dispatching push channels (SMS / Email) unless priority is high
        if (!inQuietHours) {
          if (pref.emailEnabled && eventPref.email !== false && user.email) {
            resolvedChannels.push('EMAIL');
          }
          if (pref.smsEnabled && eventPref.sms !== false && user.phone) {
            resolvedChannels.push('SMS');
          }
        } else {
          console.log(`[QUIET HOURS SUPPRESSION] Suppressing SMS/Email for user ${userId}. Priority: ${priority}`);
        }

        // 4. Create database Notification log
        const notificationId = `ntf_${ulid().toLowerCase()}`;
        
        await prisma.notification.create({
          data: {
            id: notificationId,
            hospitalId,
            userId,
            eventType,
            title,
            body,
            entityType: entityType || null,
            entityId: entityId || null,
            actionUrl: actionUrl || null,
            priority,
            channels: resolvedChannels,
            isRead: false,
            deliveredAt: {}
          }
        });

        // 5. Send Email in Background
        if (resolvedChannels.includes('EMAIL') && user.email) {
          const htmlContent = this.getHtmlTemplate(eventType, title, body, templateData);
          
          transporter.sendMail({
            from: env.SMTP_FROM,
            to: user.email,
            subject: title,
            html: htmlContent,
            text: `${title}\n\n${body}\n\nAccess the portal here: http://localhost:3000`
          }).then(async (info) => {
            // Update delivered stamp
            const deliveredStamp: Record<string, string> = { EMAIL: new Date().toISOString() };
            await prisma.notification.update({
              where: { id: notificationId },
              data: { deliveredAt: deliveredStamp }
            });
          }).catch(async (emailErr) => {
            console.error(`[EMAIL DISPATCH FAILURE] Failed to send to ${user.email}:`, emailErr);
            await prisma.notification.update({
              where: { id: notificationId },
              data: { failedChannels: { push: 'EMAIL' } }
            });
          });
        }

        // 6. Send SMS in Background
        if (resolvedChannels.includes('SMS') && user.phone) {
          const smsText = `HMS Notification: ${title}. ${body}`;
          
          // Execute mock Twilio SMS dispatch
          Promise.resolve().then(async () => {
            console.log(`[SMS DISPATCH - TWILIO MOCK] Dispatching SMS to: ${user.phone} | Content: "${smsText}"`);
            
            // Update delivered timestamp
            const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
            const currentDelivered = (notification?.deliveredAt || {}) as Record<string, any>;
            currentDelivered.SMS = new Date().toISOString();

            await prisma.notification.update({
              where: { id: notificationId },
              data: { deliveredAt: currentDelivered }
            });
          }).catch(async (smsErr) => {
            console.error(`[SMS DISPATCH FAILURE] Failed to send to ${user.phone}:`, smsErr);
            await prisma.notification.update({
              where: { id: notificationId },
              data: { failedChannels: { push: 'SMS' } }
            });
          });
        }

      } catch (err) {
        console.error(`[NOTIFICATION ENGINE ERROR] Failed to dispatch for user ${userId}:`, err);
      }
    }
  }
}
