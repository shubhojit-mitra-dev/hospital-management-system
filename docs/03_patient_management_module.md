# Module 3: Patient Management

> **Build Order**: Third — patients are central to all clinical workflows.
> **Estimated Effort**: 3–4 days

---

## 1. Module Overview

The Patient Management module handles the complete lifecycle of a patient within the hospital system. This includes:
- Patient self-registration via the portal
- Receptionist-assisted registration at the front desk
- Comprehensive patient profile with demographics, contact info, and insurance
- Medical history tracking (allergies, diseases, surgeries, medications)
- Patient search and lookup
- Patient timeline view showing all visits, prescriptions, lab results, and billing

---

## 2. Business Rules

- A patient account is created when they self-register OR when a receptionist registers them
- Patient ID is system-generated (ULID) and displayed as formatted `PAT-XXXXXXXX`
- A patient's profile belongs to a specific hospital but can be searched across hospitals by Super Admin
- Medical history is maintained cumulatively — never overwritten, only appended
- Sensitive fields (insurance info, emergency contacts) are masked in API responses for lower-privilege roles
- Soft delete only — patient records are never permanently deleted for compliance
- Patients can view and update their own non-medical profile fields
- Only doctors and nurses can update medical history

---

## 3. Database Schema

### `patients` Table

```sql
CREATE TABLE patients (
  id                TEXT PRIMARY KEY,       -- ULID
  hospital_id       TEXT NOT NULL REFERENCES hospitals(id),
  user_id           TEXT UNIQUE REFERENCES users(id), -- null if registered by receptionist without portal access
  patient_number    TEXT UNIQUE NOT NULL,   -- e.g., PAT-00001234
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  date_of_birth     DATE NOT NULL,
  gender            TEXT NOT NULL,          -- MALE | FEMALE | OTHER
  blood_group       TEXT,                   -- A+, B-, O+, AB+, etc.
  phone             TEXT NOT NULL,
  alternate_phone   TEXT,
  email             TEXT,
  address           TEXT,
  city              TEXT,
  state             TEXT,
  pincode           TEXT,
  nationality       TEXT DEFAULT 'Indian',
  profile_photo_url TEXT,                   -- S3 URL
  
  -- Emergency Contact
  emergency_contact_name         TEXT,
  emergency_contact_phone        TEXT,
  emergency_contact_relationship TEXT,
  
  -- Insurance
  insurance_provider   TEXT,
  insurance_policy_no  TEXT,
  insurance_valid_till DATE,
  insurance_coverage   JSONB,               -- details of what's covered
  
  -- Meta
  registered_by TEXT REFERENCES users(id), -- receptionist who registered
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);
```

### `patient_medical_history` Table

```sql
CREATE TABLE patient_medical_history (
  id           TEXT PRIMARY KEY,            -- ULID
  patient_id   TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id  TEXT NOT NULL REFERENCES hospitals(id),
  
  -- Allergies
  allergies    JSONB DEFAULT '[]',
  -- Structure: [{ "substance": "Penicillin", "reaction": "Anaphylaxis", "severity": "SEVERE" }]
  
  -- Chronic Conditions
  conditions   JSONB DEFAULT '[]',
  -- Structure: [{ "name": "Type 2 Diabetes", "diagnosedYear": 2018, "status": "ONGOING" }]
  
  -- Past Surgeries
  surgeries    JSONB DEFAULT '[]',
  -- Structure: [{ "procedure": "Appendectomy", "date": "2021-03-15", "hospital": "AIIMS Delhi" }]
  
  -- Current Medications
  medications  JSONB DEFAULT '[]',
  -- Structure: [{ "name": "Metformin", "dosage": "500mg", "frequency": "Twice daily" }]
  
  -- Lifestyle
  smoking_status    TEXT,                   -- NEVER | FORMER | CURRENT
  alcohol_status    TEXT,                   -- NEVER | OCCASIONAL | REGULAR
  exercise_frequency TEXT,
  
  -- Family History
  family_history JSONB DEFAULT '[]',
  -- Structure: [{ "condition": "Heart Disease", "relation": "Father" }]
  
  updated_by   TEXT REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### `patient_vitals` Table (recorded at each visit)

```sql
CREATE TABLE patient_vitals (
  id              TEXT PRIMARY KEY,
  patient_id      TEXT NOT NULL REFERENCES patients(id),
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id),
  appointment_id  TEXT REFERENCES appointments(id),
  recorded_by     TEXT NOT NULL REFERENCES users(id),  -- nurse
  
  weight_kg       DECIMAL(5,2),
  height_cm       DECIMAL(5,2),
  bmi             DECIMAL(4,2),             -- auto-calculated
  
  blood_pressure_systolic  INTEGER,
  blood_pressure_diastolic INTEGER,
  pulse_bpm       INTEGER,
  temperature_c   DECIMAL(4,2),
  spo2_percent    INTEGER,
  respiratory_rate INTEGER,
  
  notes           TEXT,
  recorded_at     TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. API Endpoints

### Base Path: `/api/v1/patients`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Receptionist, Hospital Admin | Register new patient |
| GET | `/` | Receptionist, Doctor, Nurse, Admin | Search/list patients |
| GET | `/:id` | Doctor, Nurse, Receptionist, Admin, Patient (own) | Get patient profile |
| PATCH | `/:id` | Receptionist, Admin, Patient (limited fields) | Update patient profile |
| DELETE | `/:id` | Hospital Admin | Soft delete patient |
| GET | `/:id/history` | Doctor, Nurse, Admin | Get medical history |
| PATCH | `/:id/history` | Doctor, Nurse | Update medical history |
| GET | `/:id/vitals` | Doctor, Nurse | Get vitals history |
| POST | `/:id/vitals` | Nurse | Record new vitals |
| GET | `/:id/timeline` | Doctor, Admin | Full patient timeline |
| POST | `/:id/photo` | Receptionist, Patient (own) | Upload profile photo |

---

## 5. Request / Response Contracts

### POST `/api/v1/patients` — Register Patient

**Request Body:**
```json
{
  "firstName": "Ananya",
  "lastName": "Kapoor",
  "dateOfBirth": "1992-05-14",
  "gender": "FEMALE",
  "bloodGroup": "B+",
  "phone": "+919876543210",
  "email": "ananya@example.com",
  "address": "12, Park Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "emergencyContactName": "Rohan Kapoor",
  "emergencyContactPhone": "+919876543211",
  "emergencyContactRelationship": "Husband",
  "insuranceProvider": "Star Health",
  "insurancePolicyNo": "SH-2024-XXXXXXXXX",
  "insuranceValidTill": "2026-12-31"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "patient": {
      "id": "01HXY...",
      "patientNumber": "PAT-00000001",
      "firstName": "Ananya",
      "lastName": "Kapoor",
      "age": 33,
      "gender": "FEMALE",
      "bloodGroup": "B+",
      "phone": "+919876543210"
    }
  }
}
```

---

### GET `/api/v1/patients` — Search Patients

**Query Parameters:**
```
?search=ananya        # Search by name, phone, email, patientNumber
?gender=FEMALE
?bloodGroup=B+
?page=1&limit=20
?sortBy=createdAt&sortOrder=desc
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "patients": [
      {
        "id": "01HXY...",
        "patientNumber": "PAT-00000001",
        "fullName": "Ananya Kapoor",
        "age": 33,
        "gender": "FEMALE",
        "bloodGroup": "B+",
        "phone": "+919876543210",
        "lastVisit": "2026-05-10T14:30:00Z",
        "isActive": true
      }
    ],
    "meta": { "page": 1, "limit": 20, "total": 245 }
  }
}
```

---

### GET `/api/v1/patients/:id` — Full Patient Profile

**Role-based field masking:**
- Patients can only see their own profile
- Insurance details masked for Nurses (only doctors/admins see)
- Emergency contact shown to all clinical staff

```json
{
  "success": true,
  "data": {
    "patient": {
      "id": "01HXY...",
      "patientNumber": "PAT-00000001",
      "firstName": "Ananya",
      "lastName": "Kapoor",
      "dateOfBirth": "1992-05-14",
      "age": 33,
      "gender": "FEMALE",
      "bloodGroup": "B+",
      "phone": "+919876543210",
      "email": "ananya@example.com",
      "address": "12, Park Street, Mumbai, Maharashtra - 400001",
      "emergencyContact": {
        "name": "Rohan Kapoor",
        "phone": "+919876543211",
        "relationship": "Husband"
      },
      "insurance": {
        "provider": "Star Health",
        "policyNo": "SH-2024-XXXXXXXXX",
        "validTill": "2026-12-31"
      },
      "medicalHistory": {
        "allergies": [
          { "substance": "Penicillin", "reaction": "Anaphylaxis", "severity": "SEVERE" }
        ],
        "conditions": [
          { "name": "Hypothyroidism", "diagnosedYear": 2020, "status": "ONGOING" }
        ],
        "surgeries": [],
        "medications": [
          { "name": "Thyronorm", "dosage": "50mcg", "frequency": "Once daily, empty stomach" }
        ]
      },
      "latestVitals": {
        "bloodPressure": "120/80",
        "pulse": 72,
        "temperature": 37.0,
        "spo2": 98,
        "bmi": 22.4,
        "recordedAt": "2026-06-10T09:00:00Z"
      }
    }
  }
}
```

---

### GET `/api/v1/patients/:id/timeline`

Returns a chronological merged timeline of all patient interactions:

```json
{
  "success": true,
  "data": {
    "timeline": [
      {
        "type": "APPOINTMENT",
        "date": "2026-06-10T09:00:00Z",
        "summary": "Consultation with Dr. Priya Nair (Cardiology)",
        "status": "COMPLETED",
        "entityId": "01HXY..."
      },
      {
        "type": "LAB_RESULT",
        "date": "2026-06-11T14:00:00Z",
        "summary": "Blood Test — CBC Report Available",
        "status": "COMPLETED",
        "entityId": "01HXY..."
      },
      {
        "type": "PRESCRIPTION",
        "date": "2026-06-10T11:30:00Z",
        "summary": "Prescribed by Dr. Priya Nair — 3 medicines",
        "entityId": "01HXY..."
      },
      {
        "type": "BILLING",
        "date": "2026-06-10T16:00:00Z",
        "summary": "Invoice #INV-000123 — ₹2,500 — Paid",
        "entityId": "01HXY..."
      }
    ]
  }
}
```

---

## 6. Patient Number Generation

- Auto-increment per hospital: `PAT-XXXXXXXX` (8-digit zero-padded)
- Stored in a `sequences` table or using PostgreSQL sequences:
```sql
CREATE SEQUENCE hospital_patient_seq START 1;
-- Patient number: 'PAT-' || LPAD(nextval('hospital_patient_seq')::TEXT, 8, '0')
```
- Each hospital gets its own sequence to avoid gaps visible to patients

---

## 7. Age Calculation

Never store age — always calculate from `date_of_birth`:
```typescript
const age = differenceInYears(new Date(), parseISO(patient.dateOfBirth));
```

---

## 8. Frontend Pages & Components

### Patient-Facing Pages

| Route | Component | Description |
|---|---|---|
| `/patient/profile` | `PatientProfilePage` | View/edit own profile |
| `/patient/history` | `MedicalHistoryPage` | View own medical history |
| `/patient/timeline` | `TimelinePage` | Full visit history |

### Staff-Facing Pages

| Route | Component | Description |
|---|---|---|
| `/patients` | `PatientListPage` | Search + table of all patients |
| `/patients/new` | `RegisterPatientPage` | Receptionist registration form |
| `/patients/:id` | `PatientDetailPage` | Full profile with tabs |
| `/patients/:id/vitals` | `VitalsPage` | Record and view vitals |
| `/patients/:id/history` | `MedicalHistoryEditPage` | Doctor/Nurse update medical history |

### Shared Components

- `PatientCard` — Compact card showing name, age, blood group, patient number
- `AllergyBadge` — Prominent red badge for known allergies (shown on all clinical views)
- `VitalsDisplay` — Grid showing latest vitals with trend indicators
- `MedicalHistoryForm` — CRUD form for allergies, conditions, surgeries, medications
- `PatientSearch` — Global search bar (available in navbar for all staff roles)
- `PatientTimeline` — Vertical timeline component
- `AgeDisplay` — Shows age computed from DOB

---

## 9. Allergy Alert System

When a nurse records vitals or a doctor opens a consultation, if the patient has `SEVERE` allergies:
- Display a prominent red modal alert on first load
- Show allergy badges persistently on the consultation page header
- Include allergy info in the AI Medical Record Summarizer context

---

## 10. Vital Signs BMI Auto-Calculation

```typescript
// Auto-calculate BMI when height and weight are both provided
const bmi = weight_kg / Math.pow(height_cm / 100, 2);
const bmiCategory = 
  bmi < 18.5 ? 'Underweight' :
  bmi < 25   ? 'Normal' :
  bmi < 30   ? 'Overweight' : 'Obese';
```

---

## 11. Implementation Checklist

### Backend
- [ ] Create `patients`, `patient_medical_history`, `patient_vitals` tables
- [ ] Implement patient registration endpoint with number generation
- [ ] Implement patient search (name, phone, patientNumber, email)
- [ ] Implement full patient profile endpoint with role-based masking
- [ ] Implement medical history CRUD (append-only for history items)
- [ ] Implement vitals recording with BMI auto-calc
- [ ] Implement patient timeline aggregation
- [ ] Implement profile photo upload to S3
- [ ] Add PostgreSQL indexes on `hospital_id`, `phone`, `patient_number`
- [ ] Write unit tests for patient number generation
- [ ] Add Swagger documentation

### Frontend
- [ ] Patient list page with search + filters + pagination
- [ ] Patient registration form (multi-section)
- [ ] Patient detail page with tabbed sections
- [ ] Medical history editor (dynamic add/remove items)
- [ ] Vitals recording form with BMI preview
- [ ] Allergy alert modal
- [ ] Patient timeline component
- [ ] Patient card component (used in appointment, consultation views)
