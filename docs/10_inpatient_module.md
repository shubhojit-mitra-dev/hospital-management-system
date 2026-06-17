# Module 10: Inpatient Admission Management

> **Build Order**: Tenth — depends on Patient (Module 3) and Doctor (Module 4).
> **Estimated Effort**: 3–4 days

---

## 1. Module Overview

The Inpatient Admission Management module handles the complete lifecycle of admitted patients. It covers:
- Patient admission (emergency or planned)
- Room/bed assignment and availability tracking
- Ward management
- Daily treatment updates and vitals monitoring
- Nursing care assignments
- Discharge process with summary generation
- Daily room charge billing integration

---

## 2. Admission Lifecycle

```
Admission Request Created
    ↓
Room/Bed Assigned
    ↓
Patient Admitted (status: ADMITTED)
    ├── Daily: Vitals recorded by Nurse
    ├── Daily: Doctor rounds + notes
    ├── Lab Orders & Prescriptions (as needed)
    └── Room charges auto-billed daily
    ↓
Discharge Initiated by Doctor
    ↓
Discharge Summary Generated
    ↓
Final Invoice Calculated
    ↓
Payment Cleared
    ↓
Patient Discharged (status: DISCHARGED)
```

---

## 3. Database Schema

### `wards` Table

```sql
CREATE TABLE wards (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id),
  department_id   TEXT REFERENCES departments(id),
  
  name            TEXT NOT NULL,            -- e.g., "General Ward B"
  ward_type       TEXT NOT NULL,            -- GENERAL | SEMI_PRIVATE | PRIVATE | ICU | HDU | NICU | PEDIATRIC
  floor           TEXT,
  total_beds      INTEGER NOT NULL,
  
  charge_per_day  DECIMAL(10,2) NOT NULL,   -- Room charge per day
  
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `beds` Table

```sql
CREATE TABLE beds (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id),
  ward_id         TEXT NOT NULL REFERENCES wards(id),
  
  bed_number      TEXT NOT NULL,            -- e.g., "B-101"
  bed_type        TEXT DEFAULT 'STANDARD',  -- STANDARD | ICU | OXYGEN | VENTILATOR
  
  status          TEXT DEFAULT 'AVAILABLE', -- AVAILABLE | OCCUPIED | MAINTENANCE | RESERVED
  is_active       BOOLEAN DEFAULT TRUE,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ward_id, bed_number)
);
```

### `admissions` Table

```sql
CREATE TABLE admissions (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id),
  patient_id      TEXT NOT NULL REFERENCES patients(id),
  doctor_id       TEXT NOT NULL REFERENCES doctors(id),
  department_id   TEXT NOT NULL REFERENCES departments(id),
  ward_id         TEXT NOT NULL REFERENCES wards(id),
  bed_id          TEXT NOT NULL REFERENCES beds(id),
  
  admission_number TEXT UNIQUE NOT NULL,    -- e.g., ADM-2026-001234
  admission_type   TEXT NOT NULL,           -- PLANNED | EMERGENCY | POST_OP
  
  -- Admission details
  admission_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  chief_complaint TEXT,
  admission_diagnosis TEXT,
  
  -- Discharge
  discharge_date  TIMESTAMPTZ,
  discharge_diagnosis TEXT,
  discharge_condition TEXT,                 -- RECOVERED | IMPROVED | REFERRED | AGAINST_ADVICE | DEATH
  discharge_instructions TEXT,
  
  -- Status
  status          TEXT NOT NULL DEFAULT 'ADMITTED', -- ADMITTED | DISCHARGED | TRANSFERRED
  
  -- Assigned nursing staff
  primary_nurse_id TEXT REFERENCES users(id),
  
  -- Companion/Attendant
  attendant_name  TEXT,
  attendant_phone TEXT,
  attendant_relation TEXT,
  
  -- Billing
  daily_room_rate DECIMAL(10,2),            -- Snapshot of ward charge at admission
  last_billed_date DATE,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `admission_notes` Table (Doctor/Nurse round notes)

```sql
CREATE TABLE admission_notes (
  id              TEXT PRIMARY KEY,
  admission_id    TEXT NOT NULL REFERENCES admissions(id),
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id),
  
  note_type       TEXT NOT NULL,            -- DOCTOR_ROUND | NURSE_NOTE | PROCEDURE | INCIDENT
  notes           TEXT NOT NULL,
  
  authored_by     TEXT NOT NULL REFERENCES users(id),
  authored_at     TIMESTAMPTZ DEFAULT NOW()
);
```

### `admission_transfers` Table

```sql
CREATE TABLE admission_transfers (
  id              TEXT PRIMARY KEY,
  admission_id    TEXT NOT NULL REFERENCES admissions(id),
  
  from_ward_id    TEXT REFERENCES wards(id),
  from_bed_id     TEXT REFERENCES beds(id),
  to_ward_id      TEXT REFERENCES wards(id),
  to_bed_id       TEXT REFERENCES beds(id),
  
  reason          TEXT,
  transferred_by  TEXT REFERENCES users(id),
  transferred_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Bed Availability View

```sql
-- Real-time bed availability query
SELECT 
  w.name AS ward_name,
  w.ward_type,
  w.charge_per_day,
  COUNT(b.id) AS total_beds,
  COUNT(b.id) FILTER (WHERE b.status = 'AVAILABLE') AS available_beds,
  COUNT(b.id) FILTER (WHERE b.status = 'OCCUPIED') AS occupied_beds,
  COUNT(b.id) FILTER (WHERE b.status = 'MAINTENANCE') AS maintenance_beds
FROM wards w
LEFT JOIN beds b ON b.ward_id = w.id AND b.is_active = TRUE
WHERE w.hospital_id = $1 AND w.is_active = TRUE
GROUP BY w.id;
```

---

## 5. API Endpoints

### Ward Management
**Base Path:** `/api/v1/wards`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | All authenticated | List wards with availability |
| POST | `/` | Hospital Admin | Create ward |
| GET | `/:id` | All authenticated | Ward details + bed status |
| PATCH | `/:id` | Hospital Admin | Update ward |
| GET | `/:id/beds` | All authenticated | List all beds in ward |
| POST | `/:id/beds` | Hospital Admin | Add beds to ward |
| PATCH | `/:id/beds/:bedId` | Hospital Admin, Nurse | Update bed status |

### Admissions
**Base Path:** `/api/v1/admissions`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Doctor, Admin | Create admission |
| GET | `/` | Doctor, Nurse, Admin | List current admissions |
| GET | `/:id` | Doctor, Nurse, Admin | Admission details |
| PATCH | `/:id` | Doctor, Admin | Update admission |
| POST | `/:id/transfer` | Doctor, Admin | Transfer to another bed/ward |
| POST | `/:id/notes` | Doctor, Nurse | Add round note |
| GET | `/:id/notes` | Doctor, Nurse, Admin | Get all notes |
| POST | `/:id/discharge` | Doctor | Initiate discharge |
| GET | `/:id/summary` | Doctor, Patient (own), Admin | Discharge summary |
| GET | `/availability` | All authenticated | Bed availability overview |

---

## 6. Request / Response Contracts

### POST `/api/v1/admissions` — Admit Patient

**Request:**
```json
{
  "patientId": "01HXY...",
  "doctorId": "01HXY...",
  "departmentId": "01HXY...",
  "wardId": "01HXY...",
  "bedId": "01HXY...",
  "admissionType": "PLANNED",
  "chiefComplaint": "Severe chest pain. Suspected STEMI.",
  "admissionDiagnosis": "Acute Myocardial Infarction",
  "primaryNurseId": "01HXY...",
  "attendantName": "Rohan Kapoor",
  "attendantPhone": "+919876543211",
  "attendantRelation": "Husband"
}
```

**On admission creation:**
1. `admissions` record created with status `ADMITTED`
2. `beds.status` → `OCCUPIED`
3. Admission number generated: `ADM-2026-001234`
4. Draft invoice created for this admission
5. Daily room charge billing job scheduled
6. Patient, Doctor, Nurse notified
7. Audit log entry created

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "admission": {
      "id": "01HXY...",
      "admissionNumber": "ADM-2026-001234",
      "patient": { "name": "Ananya Kapoor", "patientNumber": "PAT-00000001" },
      "doctor": { "name": "Dr. Priya Nair" },
      "ward": { "name": "ICU Ward A", "wardType": "ICU" },
      "bed": { "bedNumber": "ICU-003" },
      "admissionDate": "2026-06-25T14:00:00Z",
      "dailyRoomRate": 5000,
      "status": "ADMITTED"
    }
  }
}
```

---

### POST `/api/v1/admissions/:id/discharge`

**Request:**
```json
{
  "dischargeDiagnosis": "STEMI - Post PCI",
  "dischargeCondition": "IMPROVED",
  "dischargeInstructions": "Bed rest for 2 weeks. Avoid exertion. Follow-up after 7 days. Call emergency if chest pain recurs.",
  "medicines": [
    { "name": "Aspirin", "dosage": "75mg", "frequency": "Once daily", "duration": "Lifelong" },
    { "name": "Clopidogrel", "dosage": "75mg", "frequency": "Once daily", "duration": "12 months" }
  ],
  "followUpDate": "2026-07-02",
  "followUpDoctorId": "01HXY..."
}
```

**On discharge:**
1. `admissions.status` → `DISCHARGED`
2. `admissions.discharge_date` = now
3. `beds.status` → `AVAILABLE`
4. Discharge summary PDF generated (see below)
5. Room charge billing finalized (bill last day)
6. Final invoice updated with total room charges
7. Appointment created for follow-up (if specified)
8. Patient receives discharge summary via email
9. EMR record created with discharge summary

---

### GET `/api/v1/admissions/availability`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalBeds": 200,
      "availableBeds": 47,
      "occupiedBeds": 148,
      "maintenanceBeds": 5,
      "occupancyRate": "74%"
    },
    "wards": [
      {
        "id": "01HXY...",
        "name": "General Ward A",
        "wardType": "GENERAL",
        "totalBeds": 40,
        "availableBeds": 12,
        "occupiedBeds": 28,
        "chargePerDay": 1500,
        "beds": [
          { "bedNumber": "GA-001", "status": "OCCUPIED", "patientName": "Ramesh Kumar" },
          { "bedNumber": "GA-002", "status": "AVAILABLE" },
          { "bedNumber": "GA-003", "status": "MAINTENANCE" }
        ]
      },
      {
        "id": "01HXY...",
        "name": "ICU Ward",
        "wardType": "ICU",
        "totalBeds": 10,
        "availableBeds": 2,
        "chargePerDay": 5000
      }
    ]
  }
}
```

---

## 7. Daily Room Charge Billing (BullMQ)

A cron job runs daily at midnight:

```typescript
// Queue: 'admission-daily-billing'
// Cron: '0 0 * * *'

async function billAdmissions() {
  const activeAdmissions = await prisma.admission.findMany({
    where: { status: 'ADMITTED', lastBilledDate: { lt: today } }
  });
  
  for (const admission of activeAdmissions) {
    const daysUnbilled = differenceInDays(today, admission.lastBilledDate);
    const amount = admission.dailyRoomRate * daysUnbilled;
    
    await addInvoiceItem(admission.invoiceId, {
      itemType: 'ROOM',
      description: `${admission.ward.name} - ${daysUnbilled} day(s)`,
      quantity: daysUnbilled,
      unitPrice: admission.dailyRoomRate,
      totalPrice: amount
    });
    
    await prisma.admission.update({
      where: { id: admission.id },
      data: { lastBilledDate: today }
    });
  }
}
```

---

## 8. Discharge Summary PDF

Generated when discharge is initiated:

```
[HOSPITAL LOGO]              DISCHARGE SUMMARY
APOLLO HOSPITALS DELHI
ICU Department

PATIENT DETAILS:
Name: Ananya Kapoor           Admission No: ADM-2026-001234
Age/Sex: 33Y / Female         Ward: ICU Ward A / Bed: ICU-003
Patient No: PAT-00000001      DOB: 14-May-1992

DATES:
Date of Admission: 25-Jun-2026 (2:00 PM)
Date of Discharge: 01-Jul-2026 (10:00 AM)
Duration of Stay: 6 Days

ADMISSION DIAGNOSIS:
Acute Myocardial Infarction (STEMI)

DISCHARGE DIAGNOSIS:
STEMI - Post Percutaneous Coronary Intervention (PCI)

ATTENDING DOCTOR: Dr. Priya Nair (Cardiology)

DISCHARGE CONDITION: IMPROVED

INVESTIGATIONS DONE:
- CBC (25-Jun-2026) - Report available
- ECG (25-Jun-2026) - Report available
- 2D Echo (26-Jun-2026) - Report available
- Coronary Angiography (26-Jun-2026) - Report available

TREATMENT GIVEN:
[Summary of treatments and procedures]

DISCHARGE MEDICATIONS:
1. Aspirin 75mg — Once daily — Lifelong
2. Clopidogrel 75mg — Once daily — 12 months

DISCHARGE INSTRUCTIONS:
- Bed rest for 2 weeks
- Avoid exertion and stress
- Follow up on 02-Jul-2026 with Dr. Priya Nair

EMERGENCY: Call 112 or hospital emergency at +91-11-40000000

Dr. Priya Nair          Hospital Stamp
Signature: ___________
```

---

## 9. Frontend Pages & Components

### Admin / Doctor / Nurse Pages

| Route | Component | Description |
|---|---|---|
| `/inpatient` | `InpatientDashboard` | Current admissions overview |
| `/inpatient/availability` | `BedAvailabilityPage` | Visual bed map |
| `/inpatient/admit` | `AdmitPatientPage` | New admission form |
| `/inpatient/:id` | `AdmissionDetailPage` | Full admission view with notes |
| `/inpatient/:id/discharge` | `DischargePage` | Discharge form |
| `/wards` | `WardManagementPage` | Ward and bed setup |

### Components

- `BedMap` — Visual grid of wards with color-coded bed status
- `OccupancyGauge` — Circular gauge showing occupancy % per ward
- `AdmissionCard` — Compact card: patient, bed, doctor, days
- `RoundNotesTimeline` — Chronological list of doctor/nurse notes
- `DischargeForm` — Summary form with medication list builder
- `DischargeSummaryPreview` — PDF preview before finalizing
- `BedStatusBadge` — Color-coded: AVAILABLE | OCCUPIED | MAINTENANCE
- `WardTypeIcon` — Icon for ICU / General / Private

---

## 10. Implementation Checklist

### Backend
- [ ] Create `wards`, `beds`, `admissions`, `admission_notes`, `admission_transfers` tables
- [ ] Implement ward and bed CRUD
- [ ] Implement admission creation with bed status update
- [ ] Implement bed availability query
- [ ] Implement round notes CRUD
- [ ] Implement patient transfer between beds/wards
- [ ] Implement discharge process
- [ ] Implement discharge summary PDF generation
- [ ] Implement daily room charge billing cron job
- [ ] Implement follow-up appointment auto-creation
- [ ] Add Swagger docs

### Frontend
- [ ] Inpatient dashboard with summary stats
- [ ] Visual bed map (color-coded grid)
- [ ] Admission form
- [ ] Admission detail with tabs (Info, Notes, Vitals, Labs, Rx)
- [ ] Round notes entry form
- [ ] Transfer modal
- [ ] Discharge form with PDF preview
- [ ] Ward management (admin)
