# Module 12: Notifications System

> **Build Order**: Twelfth — cross-cutting concern that connects all modules.
> **Estimated Effort**: 2–3 days

---

## 1. Module Overview

The Notifications System is a centralized, multi-channel communication layer that connects all modules. It handles:
- In-app real-time notifications (Socket.IO)
- Email notifications (AWS SES)
- SMS notifications (Twilio)
- Push notifications (future: PWA Push)
- Notification preferences per user
- Notification read/unread state management
- BullMQ-powered async notification delivery

---

## 2. Notification Event Catalog

### Patient Notifications

| Event | Trigger | Channels |
|---|---|---|
| `APPOINTMENT_BOOKED` | Patient books appointment | In-app, Email, SMS |
| `APPOINTMENT_CONFIRMED` | Receptionist confirms | In-app, Email, SMS |
| `APPOINTMENT_REMINDER_1D` | 24 hours before appointment | Email, SMS |
| `APPOINTMENT_REMINDER_1H` | 1 hour before appointment | SMS |
| `APPOINTMENT_CANCELLED` | Appointment cancelled | In-app, Email, SMS |
| `APPOINTMENT_RESCHEDULED` | Appointment rescheduled | In-app, Email, SMS |
| `LAB_REPORT_READY` | Lab results uploaded | In-app, Email, SMS |
| `PRESCRIPTION_READY` | Prescription dispensed | In-app, SMS |
| `INVOICE_GENERATED` | Invoice created | In-app, Email |
| `PAYMENT_RECEIVED` | Payment confirmed | In-app, Email |
| `DISCHARGE_SUMMARY_READY` | Patient discharged | In-app, Email |
| `EMR_UPLOADED` | New record uploaded | In-app |

### Doctor Notifications

| Event | Trigger | Channels |
|---|---|---|
| `NEW_APPOINTMENT` | New appointment booked | In-app |
| `APPOINTMENT_CANCELLED_DOCTOR` | Patient cancels | In-app |
| `LAB_RESULT_REVIEWED` | Lab result for their patient | In-app |
| `EMERGENCY_ASSIGNED` | Emergency case assigned | In-app, SMS |
| `CRITICAL_LAB_VALUE` | Critical lab result | In-app, SMS |
| `PATIENT_ADMITTED` | Patient admitted under their care | In-app |

### Admin Notifications

| Event | Trigger | Channels |
|---|---|---|
| `INVENTORY_LOW_STOCK` | Medicine below reorder level | In-app, Email |
| `INVENTORY_EXPIRING` | Medicine expiring soon | In-app, Email |
| `EMERGENCY_ACTIVE` | Emergency case created | In-app |
| `STAFF_ACCOUNT_CREATED` | New staff added | In-app |
| `DAILY_SUMMARY` | End of day operational summary | Email |

---

## 3. Database Schema

### `notifications` Table

```sql
CREATE TABLE notifications (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id),
  user_id         TEXT NOT NULL REFERENCES users(id),
  
  event_type      TEXT NOT NULL,            -- e.g., 'APPOINTMENT_BOOKED'
  title           TEXT NOT NULL,            -- Short notification title
  body            TEXT NOT NULL,            -- Full notification body
  
  -- Context / Deep Link
  entity_type     TEXT,                     -- 'appointment' | 'invoice' | 'lab_order'
  entity_id       TEXT,                     -- ID of the related entity
  action_url      TEXT,                     -- Frontend route to navigate to
  
  -- State
  is_read         BOOLEAN DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  
  -- Delivery tracking
  channels        TEXT[] DEFAULT '{}',       -- ['IN_APP', 'EMAIL', 'SMS']
  delivered_at    JSONB DEFAULT '{}',        -- { "EMAIL": "2026-06-25T10:00:00Z" }
  failed_channels TEXT[] DEFAULT '{}',
  
  priority        TEXT DEFAULT 'NORMAL',    -- LOW | NORMAL | HIGH | CRITICAL
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ               -- auto-delete old notifications
);
```

### `notification_preferences` Table

```sql
CREATE TABLE notification_preferences (
  id              TEXT PRIMARY KEY,
  user_id         TEXT UNIQUE NOT NULL REFERENCES users(id),
  
  -- Per-channel preferences
  email_enabled   BOOLEAN DEFAULT TRUE,
  sms_enabled     BOOLEAN DEFAULT TRUE,
  in_app_enabled  BOOLEAN DEFAULT TRUE,
  
  -- Per-event-type preferences (JSON map)
  event_preferences JSONB DEFAULT '{}',
  -- e.g., { "APPOINTMENT_REMINDER_1D": { "email": true, "sms": true, "in_app": true } }
  
  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_start     TIME DEFAULT '22:00',
  quiet_end       TIME DEFAULT '07:00',
  
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Notification Service Architecture

```
Event Occurs (any module)
    ↓
Call NotificationService.send(event, payload)
    ↓
NotificationService:
  1. Look up recipients for this event
  2. Check notification preferences
  3. Create notification record in DB
  4. Queue delivery jobs in BullMQ:
     - Email job → EmailWorker → AWS SES
     - SMS job   → SMSWorker   → Twilio
     - In-app    → Socket.IO (real-time push to client)
```

### NotificationService Interface

```typescript
interface NotificationPayload {
  eventType: string;
  recipients: string[];        // user IDs
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  channels?: ('EMAIL' | 'SMS' | 'IN_APP')[];
  templateData?: Record<string, string>;  // for email templates
}

// Usage from any module:
await NotificationService.send({
  eventType: 'APPOINTMENT_BOOKED',
  recipients: [patient.userId],
  title: 'Appointment Confirmed',
  body: `Your appointment with Dr. ${doctorName} is confirmed for ${appointmentDateTime}`,
  entityType: 'appointment',
  entityId: appointment.id,
  actionUrl: `/my-appointments/${appointment.id}`,
  templateData: {
    patientName: patient.firstName,
    doctorName,
    date: formattedDate,
    time: formattedTime,
    tokenNumber: appointment.tokenNumber.toString()
  }
});
```

---

## 5. BullMQ Job Structure

### Email Job

```typescript
// Queue: 'email-notifications'
interface EmailJob {
  to: string;
  toName: string;
  subject: string;
  templateId: string;           // e.g., 'appointment_booked'
  templateData: Record<string, string>;
  notificationId: string;
}
```

### SMS Job

```typescript
// Queue: 'sms-notifications'
interface SMSJob {
  to: string;                   // Phone number with country code
  body: string;                 // Max 160 chars for 1 SMS
  notificationId: string;
}
```

### In-App Job (Immediate — no BullMQ needed)

```typescript
// Direct Socket.IO emit — no queue needed
socket.to(`user:${userId}`).emit('notification:new', {
  id: notification.id,
  eventType,
  title,
  body,
  entityType,
  entityId,
  actionUrl,
  priority,
  createdAt: notification.createdAt
});
```

---

## 6. Email Templates

### `appointment_booked` Template

```html
Subject: Appointment Confirmed — {{doctorName}} on {{date}}

Dear {{patientName}},

Your appointment has been confirmed:

  Doctor:     {{doctorName}}
  Department: {{department}}
  Date:       {{date}}
  Time:       {{time}} IST
  Token No:   #{{tokenNumber}}

Arrive 15 minutes early.

[View Appointment] [Cancel Appointment]

Apollo Hospitals Delhi
```

### `lab_report_ready` Template

```html
Subject: Your Lab Report is Ready — {{testName}}

Dear {{patientName}},

Your lab report for {{testName}} is now ready.
You can download it from your patient portal.

[View Report]

If you have any questions, please contact:
Lab Department: +91-11-40000000 ext. 204
```

---

## 7. SMS Templates

```
# Appointment Reminder (1 day before)
Apollo Hospitals: Reminder - Appointment with Dr.{{doctorName}} ({{dept}}) tomorrow at {{time}}. Token #{{token}}. Info: +91-11-40000000

# Lab Report Ready
Apollo Hospitals: Your lab report ({{testName}}) is ready. Download from portal or collect at Lab Counter 3. Ref: {{orderNo}}

# Emergency Alert (to doctor)
EMERGENCY: Assigned to Case {{caseNo}} - {{complaint}} - Level {{level}}. Report to ER immediately. - Apollo Hospitals

# Payment Received
Apollo Hospitals: Payment of Rs.{{amount}} received for Invoice {{invoiceNo}}. Ref: {{txnId}}. Thank you!
```

---

## 8. API Endpoints

**Base Path:** `/api/v1/notifications`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Authenticated | Get own notifications (paginated) |
| GET | `/unread-count` | Authenticated | Count unread notifications |
| PATCH | `/:id/read` | Authenticated | Mark notification as read |
| PATCH | `/read-all` | Authenticated | Mark all as read |
| DELETE | `/:id` | Authenticated | Delete a notification |
| GET | `/preferences` | Authenticated | Get notification preferences |
| PATCH | `/preferences` | Authenticated | Update preferences |

---

## 9. Request / Response Contracts

### GET `/api/v1/notifications`

**Query Parameters:**
```
?page=1&limit=20
?isRead=false
?priority=HIGH
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "01HXY...",
        "eventType": "LAB_REPORT_READY",
        "title": "Lab Report Ready",
        "body": "Your CBC report is now available for download.",
        "entityType": "lab_order",
        "entityId": "01HXY...",
        "actionUrl": "/my-labs/01HXY...",
        "isRead": false,
        "priority": "NORMAL",
        "createdAt": "2026-06-25T14:00:00Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 47,
      "unreadCount": 12
    }
  }
}
```

---

### PATCH `/api/v1/notifications/preferences`

**Request:**
```json
{
  "emailEnabled": true,
  "smsEnabled": true,
  "inAppEnabled": true,
  "quietHoursEnabled": true,
  "quietStart": "22:00",
  "quietEnd": "07:00",
  "eventPreferences": {
    "APPOINTMENT_REMINDER_1D": { "email": true, "sms": true },
    "INVOICE_GENERATED": { "email": true, "sms": false },
    "LAB_REPORT_READY": { "email": true, "sms": true }
  }
}
```

---

## 10. Notification Bell Component (Frontend)

The notification bell is in the top navigation bar and is universal across all roles:

```
🔔 12   ← Bell icon with unread badge count
    ↓
 ┌────────────────────────────────┐
 │ Notifications          Mark all read │
 ├────────────────────────────────┤
 │ 🔴 CRITICAL (2 hours ago)     │
 │ Lab: Critical Hemoglobin       │
 │ Patient: Ananya Kapoor          │
 ├────────────────────────────────┤
 │ 🟡 NORMAL (1 day ago)         │
 │ New Appointment — Dr. Nair     │
 │ 25 Jun, 10:00 AM               │
 ├────────────────────────────────┤
 │ [View All Notifications]        │
 └────────────────────────────────┘
```

### Socket.IO Subscription on Login

```typescript
// When user logs in, subscribe to their personal notification channel
socket.emit('subscribe', { userId: user.id });
socket.on(`notification:new`, (notification) => {
  // Add to notification bell dropdown
  addNotification(notification);
  // Show toast for HIGH/CRITICAL priority
  if (['HIGH', 'CRITICAL'].includes(notification.priority)) {
    showToast(notification.title, notification.body);
  }
  // Play sound for CRITICAL
  if (notification.priority === 'CRITICAL') {
    playAlertSound();
  }
});
```

---

## 11. Frontend Pages & Components

| Route | Component | Description |
|---|---|---|
| `/notifications` | `NotificationsPage` | Full notifications list with filters |
| `/settings/notifications` | `NotificationPreferencesPage` | Manage notification preferences |

### Components

- `NotificationBell` — Bell icon with badge + dropdown (in navbar)
- `NotificationDropdown` — Preview panel (last 10, grouped by date)
- `NotificationToast` — Bottom-right toast popup for new notifications
- `NotificationCard` — Clickable card that navigates to related entity
- `EmergencyFlash` — Full-width red flash for CRITICAL notifications
- `PreferencesForm` — Toggle matrix for event × channel preferences

---

## 12. Implementation Checklist

### Backend
- [ ] Create `notifications`, `notification_preferences` tables
- [ ] Implement NotificationService with multi-channel dispatch
- [ ] Set up BullMQ email queue + EmailWorker (AWS SES)
- [ ] Set up BullMQ SMS queue + SMSWorker (Twilio)
- [ ] Create all email HTML templates (8+ templates)
- [ ] Implement Socket.IO user-specific channels
- [ ] Implement notification CRUD API
- [ ] Implement notification preferences API
- [ ] Implement quiet hours logic in SMS/email workers
- [ ] Add notification calls to all relevant module events
- [ ] Implement daily admin summary email job (cron)
- [ ] Add Swagger docs

### Frontend
- [ ] Notification bell with unread badge
- [ ] Notification dropdown panel
- [ ] Toast notification component
- [ ] Full notifications page with read/unread filter
- [ ] Emergency flash banner component
- [ ] Notification preferences settings page
- [ ] Sound alert for critical notifications
- [ ] Socket.IO subscription on auth
