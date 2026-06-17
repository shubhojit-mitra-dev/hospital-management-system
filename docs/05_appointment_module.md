# Module 5: Appointment Management

> **Build Order**: Fifth — depends on patients (Module 3) and doctors (Module 4).
> **Estimated Effort**: 4–5 days

---

## 1. Module Overview

The Appointment Management module is the operational heart of the HMS. It handles:
- Patient self-service appointment booking
- Receptionist-assisted appointment scheduling
- Appointment confirmation, rescheduling, and cancellation
- Appointment status lifecycle management
- Calendar view for doctors and admins
- Automated SMS/email reminders
- Appointment queue management for walk-ins

---

## 2. Appointment Status Lifecycle

```
REQUESTED → CONFIRMED → IN_CONSULTATION → COMPLETED
                ↓
            CANCELLED
```

| Status | Description | Who Triggers |
|---|---|---|
| `REQUESTED` | Patient or receptionist books | Patient, Receptionist |
| `CONFIRMED` | Receptionist or auto-system confirms | Receptionist, Auto |
| `IN_CONSULTATION` | Doctor starts the consultation | Doctor, System |
| `COMPLETED` | Consultation finished | Doctor, System |
| `CANCELLED` | Appointment cancelled | Patient, Doctor, Admin |
| `NO_SHOW` | Patient didn't arrive | Receptionist (after grace period) |
| `RESCHEDULED` | Previous slot; replaced by new appointment | System |

---

## 3. Appointment Types

| Type | Code | Description |
|---|---|---|
| New Consultation | `NEW` | First visit for a condition |
| Follow-Up | `FOLLOWUP` | Follow-up after previous consultation |
| Emergency | `EMERGENCY` | Urgent booking bypassing normal queue |
| Teleconsultation | `TELE` | Future feature; virtual visit |

---

## 4. Database Schema

### `appointments` Table

```sql
CREATE TABLE appointments (
  id                TEXT PRIMARY KEY,       -- ULID
  hospital_id       TEXT NOT NULL REFERENCES hospitals(id),
  patient_id        TEXT NOT NULL REFERENCES patients(id),
  doctor_id         TEXT NOT NULL REFERENCES doctors(id),
  department_id     TEXT NOT NULL REFERENCES departments(id),
  
  appointment_type  TEXT NOT NULL DEFAULT 'NEW',     -- NEW | FOLLOWUP | EMERGENCY | TELE
  status            TEXT NOT NULL DEFAULT 'REQUESTED', -- lifecycle statuses
  
  appointment_date  DATE NOT NULL,
  appointment_time  TIME NOT NULL,
  slot_duration_mins INTEGER NOT NULL DEFAULT 30,
  
  -- Booking context
  chief_complaint   TEXT,                   -- patient's stated reason
  notes             TEXT,                   -- receptionist notes
  
  -- Follow-up linkage
  parent_appointment_id TEXT REFERENCES appointments(id), -- for follow-up tracking
  
  -- Cancellation
  cancelled_at      TIMESTAMPTZ,
  cancelled_by      TEXT REFERENCES users(id),
  cancellation_reason TEXT,
  
  -- Rescheduling
  rescheduled_from_id TEXT REFERENCES appointments(id),
  
  -- Reminders
  reminder_sent_at  TIMESTAMPTZ,
  
  -- Meta
  booked_by         TEXT REFERENCES users(id), -- patient or receptionist
  token_number      INTEGER,               -- queue token for the day
  
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### `appointment_queue` Table (daily queue management)

```sql
CREATE TABLE appointment_queue (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id),
  doctor_id       TEXT NOT NULL REFERENCES doctors(id),
  queue_date      DATE NOT NULL,
  appointment_id  TEXT NOT NULL REFERENCES appointments(id),
  token_number    SERIAL,
  queue_status    TEXT DEFAULT 'WAITING',  -- WAITING | IN_PROGRESS | DONE | SKIPPED
  called_at       TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  UNIQUE(doctor_id, queue_date, token_number)
);
```

---

## 5. API Endpoints

### Base Path: `/api/v1/appointments`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Patient, Receptionist | Book appointment |
| GET | `/` | Doctor, Receptionist, Admin | List/search appointments |
| GET | `/my` | Patient | Patient's own appointments |
| GET | `/:id` | All authenticated | Get appointment details |
| PATCH | `/:id/confirm` | Receptionist, Admin | Confirm appointment |
| PATCH | `/:id/start` | Doctor | Mark as IN_CONSULTATION |
| PATCH | `/:id/complete` | Doctor | Mark as COMPLETED |
| PATCH | `/:id/cancel` | Patient, Doctor, Receptionist, Admin | Cancel appointment |
| PATCH | `/:id/reschedule` | Patient, Receptionist | Reschedule to new slot |
| PATCH | `/:id/no-show` | Receptionist | Mark patient as no-show |
| GET | `/calendar` | Doctor, Admin, Receptionist | Calendar view |
| GET | `/queue/:doctorId` | Receptionist, Doctor | Today's queue for doctor |
| PATCH | `/queue/:queueId/call` | Receptionist | Call next patient |

---

## 6. Request / Response Contracts

### POST `/api/v1/appointments` — Book Appointment

**Request Body:**
```json
{
  "patientId": "01HXY...",
  "doctorId": "01HXY...",
  "departmentId": "01HXY...",
  "appointmentDate": "2026-06-25",
  "appointmentTime": "10:00",
  "appointmentType": "NEW",
  "chiefComplaint": "Chest pain and shortness of breath for 3 days"
}
```

**Validation Logic (before saving):**
1. Verify `appointmentDate` is not in the past
2. Verify the slot is within doctor's schedule for that day
3. Verify the slot is not already booked
4. Verify doctor is not on leave
5. Verify date is not a hospital holiday
6. Verify patient exists and belongs to same hospital
7. For `FOLLOWUP` type, verify `parentAppointmentId` exists and is `COMPLETED`

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "appointment": {
      "id": "01HXY...",
      "appointmentNumber": "APT-2026-06-25-001",
      "patient": { "id": "...", "name": "Ananya Kapoor", "patientNumber": "PAT-00000001" },
      "doctor": { "id": "...", "name": "Dr. Priya Nair", "department": "Cardiology" },
      "appointmentDate": "2026-06-25",
      "appointmentTime": "10:00",
      "displayTime": "10:00 AM",
      "status": "REQUESTED",
      "tokenNumber": 7,
      "message": "Appointment booked. Token #7. Please arrive 15 minutes early."
    }
  }
}
```

---

### GET `/api/v1/appointments` — List Appointments

**Query Parameters:**
```
?doctorId=01HXY...
?patientId=01HXY...
?departmentId=01HXY...
?status=CONFIRMED
?date=2026-06-25
?dateFrom=2026-06-01&dateTo=2026-06-30
?appointmentType=NEW
?page=1&limit=20
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "appointments": [
      {
        "id": "01HXY...",
        "tokenNumber": 7,
        "patient": { "name": "Ananya Kapoor", "patientNumber": "PAT-00000001", "age": 33 },
        "doctor": { "name": "Dr. Priya Nair" },
        "department": { "name": "Cardiology" },
        "appointmentDate": "2026-06-25",
        "appointmentTime": "10:00 AM",
        "status": "CONFIRMED",
        "appointmentType": "NEW",
        "chiefComplaint": "Chest pain and shortness of breath"
      }
    ],
    "meta": { "page": 1, "limit": 20, "total": 47 }
  }
}
```

---

### GET `/api/v1/appointments/calendar`

**Query Parameters:**
```
?doctorId=01HXY...      # Optional — filter by doctor
?month=2026-06          # Month view
?view=week&date=2026-06-23  # Week view
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "01HXY...",
        "title": "Ananya Kapoor — Chest Pain",
        "start": "2026-06-25T10:00:00",
        "end": "2026-06-25T10:30:00",
        "status": "CONFIRMED",
        "doctor": "Dr. Priya Nair",
        "color": "#4CAF50"
      }
    ]
  }
}
```

**Color coding by status:**
- `REQUESTED` → `#FFC107` (amber)
- `CONFIRMED` → `#2196F3` (blue)
- `IN_CONSULTATION` → `#FF5722` (deep orange)
- `COMPLETED` → `#4CAF50` (green)
- `CANCELLED` → `#9E9E9E` (grey)
- `NO_SHOW` → `#F44336` (red)

---

### GET `/api/v1/appointments/queue/:doctorId`

Returns today's queue for a doctor in token order:

**Response (200):**
```json
{
  "success": true,
  "data": {
    "date": "2026-06-25",
    "doctor": { "id": "...", "name": "Dr. Priya Nair" },
    "queue": [
      {
        "queueId": "01HXY...",
        "tokenNumber": 1,
        "appointment": {
          "id": "...",
          "patient": { "name": "Ramesh Kumar", "age": 54 },
          "appointmentTime": "09:00 AM",
          "chiefComplaint": "Back pain",
          "status": "COMPLETED"
        },
        "queueStatus": "DONE"
      },
      {
        "queueId": "01HXY...",
        "tokenNumber": 2,
        "appointment": {
          "id": "...",
          "patient": { "name": "Sita Devi", "age": 45 },
          "appointmentTime": "09:30 AM",
          "chiefComplaint": "Knee swelling",
          "status": "IN_CONSULTATION"
        },
        "queueStatus": "IN_PROGRESS"
      },
      {
        "queueId": "01HXY...",
        "tokenNumber": 3,
        "appointment": {
          "id": "...",
          "patient": { "name": "Ananya Kapoor", "age": 33 },
          "appointmentTime": "10:00 AM",
          "chiefComplaint": "Chest pain",
          "status": "CONFIRMED"
        },
        "queueStatus": "WAITING"
      }
    ],
    "stats": {
      "total": 20,
      "waiting": 14,
      "inProgress": 1,
      "completed": 4,
      "noShow": 1
    }
  }
}
```

---

## 7. Appointment Reminders (BullMQ Jobs)

### Reminder Schedule

| Trigger | Channel | When |
|---|---|---|
| Booking confirmed | Email + SMS | Immediately after booking |
| Day-before reminder | Email + SMS | 24 hours before appointment |
| Hour reminder | SMS | 1 hour before appointment |
| No-show follow-up | Email | 2 hours after missed appointment |

### BullMQ Job Definition

```typescript
// Queue: 'appointment-reminders'
// Jobs added when appointment is created/confirmed

interface AppointmentReminderJob {
  type: 'BOOKING_CONFIRMED' | 'DAY_BEFORE' | 'HOUR_BEFORE' | 'NOSHOW_FOLLOWUP';
  appointmentId: string;
  patientPhone: string;
  patientEmail: string;
  patientName: string;
  doctorName: string;
  department: string;
  appointmentDate: string;
  appointmentTime: string;
  tokenNumber: number;
}
```

---

## 8. Rescheduling Flow

```
1. Patient/Receptionist requests reschedule
2. POST /appointments/:id/reschedule with { newDate, newTime }
3. System validates new slot availability
4. Old appointment status → 'RESCHEDULED'
5. New appointment created with status 'CONFIRMED', linked via rescheduled_from_id
6. Reminder for old appointment cancelled in BullMQ
7. New reminders scheduled
8. Patient notified via email + SMS of new slot
```

---

## 9. Cancellation Policy

| Cancelled By | Timing | Action |
|---|---|---|
| Patient | > 2 hours before | Free cancellation |
| Patient | < 2 hours before | Cancellation fee may apply (config) |
| Doctor | Any time | Notify patient + offer rescheduling |
| Admin | Any time | Notify patient |

When cancelled:
- Appointment status → `CANCELLED`
- Queue slot freed
- BullMQ reminder jobs cancelled
- Notification sent to patient

---

## 10. Walk-In Registration

For patients who arrive without appointment:
1. Receptionist searches patient by phone/patientNumber
2. If doctor has available slots today, books immediately with `status: CONFIRMED`
3. Token assigned in queue
4. Otherwise, directs to next available date

---

## 11. Real-Time Queue Updates (Socket.IO)

Events emitted to doctor's room: `doctor:${doctorId}:queue`
- `queue:patient_called` — when receptionist calls next token
- `queue:patient_completed` — when consultation ends
- `queue:patient_added` — when new appointment booked for today

Receptionist dashboard listens to same events for live queue management.

---

## 12. Frontend Pages & Components

### Patient Pages

| Route | Component | Description |
|---|---|---|
| `/book-appointment` | `BookAppointmentPage` | Multi-step booking wizard |
| `/my-appointments` | `MyAppointmentsPage` | Patient's appointment history |
| `/my-appointments/:id` | `AppointmentDetailPage` | Details + actions (cancel/reschedule) |

### Staff Pages

| Route | Component | Description |
|---|---|---|
| `/appointments` | `AppointmentListPage` | Search + table view |
| `/appointments/calendar` | `CalendarPage` | FullCalendar.io integration |
| `/appointments/new` | `BookForPatientPage` | Receptionist books for patient |
| `/appointments/queue/:doctorId` | `QueuePage` | Live queue management board |
| `/appointments/:id` | `AppointmentDetailPage` | Details + status transitions |

### Shared Components

- `BookingWizard` — 4-step: (1) Select Dept → (2) Select Doctor → (3) Select Date/Time → (4) Confirm
- `DoctorSlotPicker` — Shows available time slots in a grid
- `AppointmentStatusBadge` — Color-coded status chip
- `QueueBoard` — Kanban-style board: Waiting | In Progress | Completed
- `AppointmentCard` — Summary card for list views
- `AvailabilityDatePicker` — Calendar that greys out unavailable dates
- `RescheduleModal` — Date + slot picker for rescheduling

---

## 13. Implementation Checklist

### Backend
- [ ] Create `appointments`, `appointment_queue` tables
- [ ] Implement slot conflict detection
- [ ] Implement appointment booking with validation chain
- [ ] Implement appointment status transitions with guards
- [ ] Implement appointment list with all filters
- [ ] Implement calendar events endpoint (month/week view)
- [ ] Implement queue management endpoints
- [ ] Set up BullMQ reminder jobs
- [ ] Implement SMS via Twilio
- [ ] Implement email via AWS SES
- [ ] Implement reschedule flow
- [ ] Implement cancellation flow
- [ ] Set up Socket.IO for real-time queue events
- [ ] Add Swagger docs
- [ ] Write integration tests for booking flow

### Frontend
- [ ] 4-step booking wizard
- [ ] Doctor slot picker grid
- [ ] FullCalendar.io integration with color coding
- [ ] Live queue board with Socket.IO
- [ ] Appointment list with search/filter
- [ ] Status transition buttons with confirmation modals
- [ ] Reschedule modal
- [ ] Patient appointment history page
