# Module 2: Hospital & Department Setup

> **Build Order**: Second — establishes multi-tenant context for all other modules.
> **Estimated Effort**: 2–3 days

---

## 1. Module Overview

This module establishes the multi-tenant foundation of the HMS. A **Super Admin** creates hospital entities and assigns Hospital Admins. Each hospital has its own set of departments, and all data in the system is scoped to a `hospital_id`. This ensures complete data isolation between hospitals.

**Key Responsibilities:**
- Super Admin creates and manages hospital entities
- Hospital Admin manages departments within their hospital
- Department assignments for doctors and staff
- Hospital-level configuration (working hours, holidays, specializations list)

---

## 2. Business Rules

- One Super Admin exists per system (seeded during initial deployment)
- A hospital can have multiple departments (e.g., Cardiology, Orthopedics, Radiology)
- A department belongs to exactly one hospital
- A doctor is assigned to one primary department but can be associated with multiple
- All data queries must include `hospital_id` filter to enforce tenant isolation
- Hospital working hours define valid appointment slots

---

## 3. Database Schema

### `hospitals` Table

```sql
CREATE TABLE hospitals (
  id              TEXT PRIMARY KEY,         -- ULID
  name            TEXT NOT NULL,
  registration_no TEXT UNIQUE NOT NULL,
  address         TEXT NOT NULL,
  city            TEXT NOT NULL,
  state           TEXT NOT NULL,
  country         TEXT NOT NULL DEFAULT 'India',
  phone           TEXT NOT NULL,
  email           TEXT NOT NULL,
  website         TEXT,
  logo_url        TEXT,                     -- S3 URL
  is_active       BOOLEAN DEFAULT TRUE,
  settings        JSONB DEFAULT '{}',       -- hospital-level config
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);
```

### `departments` Table

```sql
CREATE TABLE departments (
  id           TEXT PRIMARY KEY,            -- ULID
  hospital_id  TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,              -- e.g., "Cardiology"
  code         TEXT NOT NULL,              -- e.g., "CARD"
  description  TEXT,
  floor        TEXT,                        -- physical location
  head_doctor_id TEXT REFERENCES users(id), -- department head
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hospital_id, code)
);
```

### `hospital_settings` JSONB Structure

```json
{
  "workingHours": {
    "monday":    { "open": "08:00", "close": "20:00", "isHoliday": false },
    "tuesday":   { "open": "08:00", "close": "20:00", "isHoliday": false },
    "wednesday": { "open": "08:00", "close": "20:00", "isHoliday": false },
    "thursday":  { "open": "08:00", "close": "20:00", "isHoliday": false },
    "friday":    { "open": "08:00", "close": "20:00", "isHoliday": false },
    "saturday":  { "open": "08:00", "close": "14:00", "isHoliday": false },
    "sunday":    { "open": "00:00", "close": "00:00", "isHoliday": true  }
  },
  "appointmentSlotDuration": 30,
  "currency": "INR",
  "timezone": "Asia/Kolkata",
  "emergencyPhone": "+911234567890"
}
```

### `holidays` Table

```sql
CREATE TABLE holidays (
  id          TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL REFERENCES hospitals(id),
  date        DATE NOT NULL,
  name        TEXT NOT NULL,
  is_recurring BOOLEAN DEFAULT FALSE,     -- yearly recurring
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hospital_id, date)
);
```

---

## 4. Default Departments (Seed Data)

When a hospital is created, the following departments are auto-created:

| Code | Department Name |
|---|---|
| `CARD` | Cardiology |
| `ORTH` | Orthopedics |
| `NEUR` | Neurology |
| `GAST` | Gastroenterology |
| `PEDI` | Pediatrics |
| `GYNE` | Gynecology & Obstetrics |
| `DERM` | Dermatology |
| `PSYC` | Psychiatry |
| `ONCO` | Oncology |
| `OPTH` | Ophthalmology |
| `ENT` | ENT (Ear, Nose, Throat) |
| `EMER` | Emergency |
| `SURG` | General Surgery |
| `RADI` | Radiology |
| `PATH` | Pathology / Laboratory |
| `PHAR` | Pharmacy |

---

## 5. API Endpoints

### Hospital Management (Super Admin only)
**Base path:** `/api/v1/hospitals`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Super Admin | Create a new hospital |
| GET | `/` | Super Admin | List all hospitals (paginated) |
| GET | `/:id` | Super Admin, Hospital Admin (own) | Get hospital details |
| PATCH | `/:id` | Super Admin | Update hospital info |
| PATCH | `/:id/settings` | Super Admin, Hospital Admin | Update hospital settings |
| PATCH | `/:id/activate` | Super Admin | Activate/deactivate hospital |
| DELETE | `/:id` | Super Admin | Soft delete hospital |
| POST | `/:id/logo` | Super Admin, Hospital Admin | Upload hospital logo to S3 |

### Department Management
**Base path:** `/api/v1/hospitals/:hospitalId/departments`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Hospital Admin | Create department |
| GET | `/` | All authenticated (same hospital) | List departments |
| GET | `/:id` | All authenticated (same hospital) | Get department detail |
| PATCH | `/:id` | Hospital Admin | Update department |
| PATCH | `/:id/activate` | Hospital Admin | Activate/deactivate |
| DELETE | `/:id` | Hospital Admin | Soft delete department |
| POST | `/:id/head` | Hospital Admin | Assign department head doctor |

### Holiday Management
**Base path:** `/api/v1/hospitals/:hospitalId/holidays`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Hospital Admin | Add holiday |
| GET | `/` | All authenticated | List holidays |
| DELETE | `/:id` | Hospital Admin | Remove holiday |

---

## 6. Request / Response Contracts

### POST `/api/v1/hospitals` (Super Admin)

**Request:**
```json
{
  "name": "Apollo Hospitals Delhi",
  "registrationNo": "DL-HOSP-2024-001",
  "address": "Sarita Vihar, New Delhi",
  "city": "New Delhi",
  "state": "Delhi",
  "phone": "+911140000000",
  "email": "admin@apollodelhi.com",
  "website": "https://apollohospitals.com",
  "adminEmail": "hospitaladmin@apollodelhi.com",
  "adminFirstName": "Rakesh",
  "adminLastName": "Verma"
}
```

**What happens on creation:**
1. Hospital record created in DB
2. Default 16 departments auto-seeded
3. Hospital Admin user account created
4. Welcome email sent to Hospital Admin
5. Audit log entry created

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "hospital": { "id": "01HXY...", "name": "Apollo Hospitals Delhi", ... },
    "admin": { "id": "01HXY...", "email": "hospitaladmin@apollodelhi.com" },
    "departmentsCreated": 16
  }
}
```

---

### GET `/api/v1/hospitals/:hospitalId/departments`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "departments": [
      {
        "id": "01HXY...",
        "name": "Cardiology",
        "code": "CARD",
        "floor": "3rd Floor",
        "headDoctor": {
          "id": "01HXY...",
          "name": "Dr. Priya Nair",
          "specialization": "Interventional Cardiology"
        },
        "activeDoctors": 5,
        "isActive": true
      }
    ],
    "total": 16
  }
}
```

---

## 7. Frontend Pages & Components

### Super Admin Pages

| Route | Component | Description |
|---|---|---|
| `/super-admin/hospitals` | `HospitalListPage` | Grid/table of all hospitals with status |
| `/super-admin/hospitals/new` | `CreateHospitalPage` | Form to create hospital + initial admin |
| `/super-admin/hospitals/:id` | `HospitalDetailPage` | Hospital overview, departments, settings |
| `/super-admin/hospitals/:id/settings` | `HospitalSettingsPage` | Working hours, slots, config |

### Hospital Admin Pages

| Route | Component | Description |
|---|---|---|
| `/admin/departments` | `DepartmentListPage` | Manage hospital departments |
| `/admin/departments/new` | `CreateDepartmentPage` | Add new department |
| `/admin/departments/:id` | `DepartmentDetailPage` | Staff list, head assignment |
| `/admin/settings` | `HospitalSettingsPage` | Edit working hours, holidays |
| `/admin/settings/holidays` | `HolidaysPage` | Manage hospital holidays |

### Shared Components

- `DepartmentSelector` — Dropdown for selecting departments (used across modules)
- `HospitalBadge` — Shows hospital name + logo
- `WorkingHoursEditor` — Visual grid for setting open/close times per day
- `HolidayCalendar` — Calendar view of hospital holidays

---

## 8. Tenant Isolation Strategy

All API handlers must apply this filter on every database query:

```typescript
// Middleware: attachHospitalFilter
// For any route under /api/v1/hospitals/:hospitalId/*
// Validates that the authenticated user's hospitalId === req.params.hospitalId
// Super Admin can access any hospital

const validateHospitalAccess = (req, res, next) => {
  const { hospitalId } = req.params;
  if (req.user.role === 'SUPER_ADMIN') return next();
  if (req.user.hospitalId !== hospitalId) {
    return res.status(403).json({ error: 'Access denied: hospital mismatch' });
  }
  next();
};
```

All Prisma queries must always include `where: { hospitalId: req.user.hospitalId }`.

---

## 9. Implementation Checklist

### Backend
- [ ] Create `hospitals` table in Prisma schema
- [ ] Create `departments` table in Prisma schema
- [ ] Create `holidays` table in Prisma schema
- [ ] Implement hospital CRUD service
- [ ] Implement department CRUD service
- [ ] Implement `createHospital` with auto-department seeding and admin account creation
- [ ] Implement hospital settings update (working hours, slot duration)
- [ ] Implement `validateHospitalAccess` middleware
- [ ] Implement S3 upload for hospital logo
- [ ] Implement holiday management endpoints
- [ ] Add Swagger docs for all endpoints
- [ ] Write integration tests

### Frontend
- [ ] Hospital list page with search, filter, status badges
- [ ] Create hospital form with validation
- [ ] Department management page
- [ ] Working hours editor component
- [ ] Holiday calendar component
- [ ] Department selector dropdown (reusable)
- [ ] Hospital logo upload with preview
