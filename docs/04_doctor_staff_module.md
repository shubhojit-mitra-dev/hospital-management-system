# Module 4: Doctor & Staff Management

> **Build Order**: Fourth — doctors and staff must exist before appointments or consultations.
> **Estimated Effort**: 3 days

---

## 1. Module Overview

This module manages all hospital personnel except patients. It handles:
- Doctor profiles with specializations, qualifications, and schedule availability
- Staff profiles (Nurses, Receptionists, Lab Technicians, Pharmacists, Billing Executives)
- Department assignments and role assignments
- Doctor availability / working schedule configuration
- Leave management for doctors
- Performance metrics visible to admins

---

## 2. Business Rules

- All staff accounts are created **only by Hospital Admin** — no self-registration
- A Doctor belongs to one primary department but can serve multiple departments
- A Doctor's schedule defines when appointments can be booked with them
- If a doctor is on leave for a specific day, their slots are unavailable
- A nurse is assigned to specific doctors or wards
- When a staff account is deactivated, all their future appointments must be reassigned or cancelled
- Doctor's consultation fee is stored and used in billing

---

## 3. Database Schema

### `doctors` Table

```sql
CREATE TABLE doctors (
  id                  TEXT PRIMARY KEY,     -- ULID (same as user_id conceptually)
  user_id             TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id         TEXT NOT NULL REFERENCES hospitals(id),
  department_id       TEXT NOT NULL REFERENCES departments(id),
  
  -- Professional Info
  registration_no     TEXT NOT NULL,        -- Medical council registration
  specialization      TEXT NOT NULL,        -- e.g., "Interventional Cardiology"
  sub_specialization  TEXT,
  qualification       TEXT NOT NULL,        -- e.g., "MBBS, MD (Cardiology), DM"
  experience_years    INTEGER DEFAULT 0,
  bio                 TEXT,
  profile_photo_url   TEXT,
  
  -- Consultation
  consultation_fee    DECIMAL(10,2) NOT NULL DEFAULT 0,
  follow_up_fee       DECIMAL(10,2) DEFAULT 0,
  slot_duration_mins  INTEGER DEFAULT 30,   -- overrides hospital default
  
  -- Status
  is_available        BOOLEAN DEFAULT TRUE,
  is_active           BOOLEAN DEFAULT TRUE,
  
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);
```

### `doctor_departments` Table (Many-to-Many)

```sql
CREATE TABLE doctor_departments (
  doctor_id     TEXT NOT NULL REFERENCES doctors(id),
  department_id TEXT NOT NULL REFERENCES departments(id),
  is_primary    BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (doctor_id, department_id)
);
```

### `doctor_schedules` Table

```sql
CREATE TABLE doctor_schedules (
  id          TEXT PRIMARY KEY,
  doctor_id   TEXT NOT NULL REFERENCES doctors(id),
  day_of_week INTEGER NOT NULL,            -- 0=Sunday ... 6=Saturday
  start_time  TIME NOT NULL,              -- e.g., 09:00
  end_time    TIME NOT NULL,              -- e.g., 17:00
  max_patients INTEGER DEFAULT 20,        -- max appointments per day
  is_active   BOOLEAN DEFAULT TRUE,
  UNIQUE(doctor_id, day_of_week)
);
```

### `doctor_leaves` Table

```sql
CREATE TABLE doctor_leaves (
  id          TEXT PRIMARY KEY,
  doctor_id   TEXT NOT NULL REFERENCES doctors(id),
  hospital_id TEXT NOT NULL REFERENCES hospitals(id),
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  reason      TEXT,
  leave_type  TEXT DEFAULT 'PERSONAL',    -- SICK | PERSONAL | CONFERENCE | VACATION
  status      TEXT DEFAULT 'APPROVED',    -- PENDING | APPROVED | REJECTED
  approved_by TEXT REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### `staff` Table

```sql
CREATE TABLE staff (
  id            TEXT PRIMARY KEY,          -- ULID
  user_id       TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id   TEXT NOT NULL REFERENCES hospitals(id),
  department_id TEXT REFERENCES departments(id),
  
  employee_id   TEXT UNIQUE NOT NULL,      -- e.g., EMP-00001
  designation   TEXT,                      -- e.g., "Senior Nurse"
  qualification TEXT,
  experience_years INTEGER DEFAULT 0,
  
  -- Nurse-specific
  assigned_doctor_id TEXT REFERENCES doctors(id),
  ward_assignment    TEXT,
  
  join_date     DATE,
  is_active     BOOLEAN DEFAULT TRUE,
  
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);
```

---

## 4. API Endpoints

### Doctor Management
**Base Path:** `/api/v1/doctors`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Hospital Admin | Create doctor profile |
| GET | `/` | All authenticated | List doctors (filterable) |
| GET | `/:id` | All authenticated | Get doctor detail |
| PATCH | `/:id` | Hospital Admin, Doctor (own) | Update doctor profile |
| DELETE | `/:id` | Hospital Admin | Soft delete |
| GET | `/:id/schedule` | All authenticated | Get weekly schedule |
| POST | `/:id/schedule` | Hospital Admin, Doctor (own) | Set weekly schedule |
| GET | `/:id/availability` | All authenticated | Get available slots for a date |
| POST | `/:id/leaves` | Doctor (own), Hospital Admin | Apply for leave |
| GET | `/:id/leaves` | Doctor (own), Hospital Admin | List leaves |
| DELETE | `/:id/leaves/:leaveId` | Doctor (own), Hospital Admin | Cancel leave |

### Staff Management
**Base Path:** `/api/v1/staff`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Hospital Admin | Create staff member |
| GET | `/` | Hospital Admin | List all staff |
| GET | `/:id` | Hospital Admin, Self | Get staff detail |
| PATCH | `/:id` | Hospital Admin | Update staff details |
| PATCH | `/:id/activate` | Hospital Admin | Activate/deactivate |
| DELETE | `/:id` | Hospital Admin | Soft delete |

---

## 5. Doctor Availability Algorithm

This is a critical piece of logic used by the appointment booking module.

### Inputs
- `doctorId`: string
- `date`: ISO date string (e.g., `2026-06-20`)

### Algorithm Steps

```typescript
async function getDoctorAvailableSlots(doctorId: string, date: string): Promise<Slot[]> {
  const dayOfWeek = getDay(parseISO(date)); // 0-6
  
  // 1. Check if doctor has schedule for this day
  const schedule = await db.doctorSchedule.findFirst({
    where: { doctorId, dayOfWeek, isActive: true }
  });
  if (!schedule) return []; // Doctor doesn't work this day
  
  // 2. Check if doctor is on leave this date
  const onLeave = await db.doctorLeave.findFirst({
    where: {
      doctorId,
      status: 'APPROVED',
      startDate: { lte: parseISO(date) },
      endDate:   { gte: parseISO(date) }
    }
  });
  if (onLeave) return []; // Doctor on leave
  
  // 3. Check if this date is a hospital holiday
  const isHoliday = await db.holiday.findFirst({
    where: { hospitalId: doctor.hospitalId, date: parseISO(date) }
  });
  if (isHoliday) return []; // Hospital holiday
  
  // 4. Generate all time slots within schedule window
  const slotDuration = doctor.slotDurationMins; // e.g., 30
  const allSlots = generateTimeSlots(schedule.startTime, schedule.endTime, slotDuration);
  
  // 5. Find already booked slots
  const bookedSlots = await db.appointment.findMany({
    where: {
      doctorId,
      appointmentDate: parseISO(date),
      status: { in: ['REQUESTED', 'CONFIRMED', 'IN_CONSULTATION'] }
    },
    select: { appointmentTime: true }
  });
  
  const bookedTimes = new Set(bookedSlots.map(a => a.appointmentTime));
  
  // 6. Return available slots
  return allSlots
    .filter(slot => !bookedTimes.has(slot.time))
    .map(slot => ({
      time: slot.time,
      displayTime: format(slot.datetime, 'hh:mm a'),
      isAvailable: true
    }));
}
```

### Slot Generation

```typescript
function generateTimeSlots(startTime: string, endTime: string, durationMins: number) {
  const slots = [];
  let current = parseTime(startTime);
  const end = parseTime(endTime);
  
  while (addMinutes(current, durationMins) <= end) {
    slots.push({ time: format(current, 'HH:mm'), datetime: current });
    current = addMinutes(current, durationMins);
  }
  return slots;
}
```

---

## 6. Request / Response Contracts

### GET `/api/v1/doctors` — List Doctors

**Query Parameters:**
```
?departmentId=01HXY...
?specialization=Cardiology
?search=Dr. Priya
?date=2026-06-20          # Only return doctors with availability on this date
?page=1&limit=20
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "doctors": [
      {
        "id": "01HXY...",
        "fullName": "Dr. Priya Nair",
        "specialization": "Interventional Cardiology",
        "qualification": "MBBS, MD, DM (Cardiology)",
        "experienceYears": 12,
        "department": { "id": "01HXY...", "name": "Cardiology" },
        "consultationFee": 1500,
        "profilePhotoUrl": "https://s3.amazonaws.com/...",
        "isAvailable": true,
        "nextAvailableDate": "2026-06-20"
      }
    ],
    "meta": { "page": 1, "limit": 20, "total": 45 }
  }
}
```

---

### GET `/api/v1/doctors/:id/availability?date=2026-06-20`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "doctor": { "id": "01HXY...", "name": "Dr. Priya Nair" },
    "date": "2026-06-20",
    "dayName": "Saturday",
    "slots": [
      { "time": "09:00", "displayTime": "09:00 AM", "isAvailable": true },
      { "time": "09:30", "displayTime": "09:30 AM", "isAvailable": false },
      { "time": "10:00", "displayTime": "10:00 AM", "isAvailable": true }
    ],
    "totalSlots": 16,
    "availableSlots": 11
  }
}
```

---

## 7. Frontend Pages & Components

### Hospital Admin Pages

| Route | Component | Description |
|---|---|---|
| `/admin/staff` | `StaffListPage` | All staff across roles with filters |
| `/admin/staff/new` | `CreateStaffPage` | Role selection + dynamic form fields |
| `/admin/staff/:id` | `StaffDetailPage` | Profile, assignments, activity |
| `/admin/doctors` | `DoctorListPage` | All doctors with specialization filter |
| `/admin/doctors/new` | `CreateDoctorPage` | Doctor profile + schedule setup |
| `/admin/doctors/:id` | `DoctorDetailPage` | Full doctor management |
| `/admin/doctors/:id/schedule` | `DoctorSchedulePage` | Weekly availability editor |
| `/admin/doctors/:id/leaves` | `DoctorLeavePage` | Leave history and approval |

### Doctor Self-Service Pages

| Route | Component | Description |
|---|---|---|
| `/doctor/profile` | `MyProfilePage` | Edit own profile, bio |
| `/doctor/schedule` | `MySchedulePage` | Set weekly availability |
| `/doctor/leaves` | `MyLeavesPage` | Apply for leave |

### Shared Components

- `DoctorCard` — Used in appointment booking; shows photo, name, specialization, fee, next slot
- `WeeklyScheduleEditor` — Visual 7-day grid for setting availability hours
- `AvailabilityCalendar` — Month view showing available/leave/holiday days
- `DoctorSearchFilter` — Department + specialization + date filter bar
- `LeaveRequestForm` — Modal form for leave application

---

## 8. Employee ID Generation

- Format: `EMP-XXXXXXXX` (zero-padded 8-digit)
- Per-hospital sequence (same as patient number pattern)

---

## 9. Implementation Checklist

### Backend
- [ ] Create `doctors`, `doctor_departments`, `doctor_schedules`, `doctor_leaves`, `staff` tables
- [ ] Implement doctor CRUD with department assignment
- [ ] Implement staff CRUD with role-specific fields
- [ ] Implement weekly schedule management
- [ ] Implement leave management with status workflow
- [ ] Implement `getDoctorAvailableSlots` availability algorithm
- [ ] Implement doctor list with availability filter
- [ ] Add Swagger docs
- [ ] Write unit tests for availability algorithm

### Frontend
- [ ] Doctor list page with specialty/department filters
- [ ] Doctor detail page with tabs (Profile, Schedule, Leaves, Appointments)
- [ ] Weekly schedule editor (visual drag grid)
- [ ] Staff management pages with role-based forms
- [ ] Doctor card component
- [ ] Availability calendar component
- [ ] Leave request modal
