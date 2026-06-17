# Module 6: Doctor Consultation & Electronic Medical Records (EMR)

> **Build Order**: Sixth — the core clinical workflow. Depends on Appointments (Module 5).
> **Estimated Effort**: 5–6 days

---

## 1. Module Overview

This is the core clinical module. When a patient's appointment moves to `IN_CONSULTATION`, the doctor enters this module. It covers:
- Consultation workspace for doctors (SOAP notes, diagnosis, treatment plan)
- Prescription creation and management
- Lab test ordering
- Electronic Medical Records (EMR) file management
- AI-powered patient history summarization
- Integration with pharmacy (prescription → fulfillment) and lab (test orders → results)

---

## 2. Consultation Workflow

```
Appointment → IN_CONSULTATION
    ↓
Doctor opens Consultation Workspace
    ├── Reviews Patient History + Vitals
    ├── AI Summary (optional)
    ├── Records Chief Complaint + Symptoms
    ├── Writes SOAP Notes (Subjective, Objective, Assessment, Plan)
    ├── Sets Diagnosis (ICD-10 codes)
    ├── Creates Treatment Plan
    ├── Writes Prescription
    ├── Orders Lab Tests (optional)
    └── Marks Consultation Complete
         ↓
    Appointment → COMPLETED
    Prescription → sent to Pharmacy
    Lab Orders  → sent to Lab
```

---

## 3. Database Schema

### `consultations` Table

```sql
CREATE TABLE consultations (
  id              TEXT PRIMARY KEY,         -- ULID
  appointment_id  TEXT UNIQUE NOT NULL REFERENCES appointments(id),
  patient_id      TEXT NOT NULL REFERENCES patients(id),
  doctor_id       TEXT NOT NULL REFERENCES doctors(id),
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id),
  
  -- SOAP Notes
  subjective      TEXT,                     -- Patient complaints in their words
  objective       TEXT,                     -- Examination findings
  assessment      TEXT,                     -- Doctor's assessment
  plan            TEXT,                     -- Treatment plan
  
  -- Diagnosis
  chief_complaint TEXT,
  diagnosis       TEXT NOT NULL,            -- Free text + ICD code
  icd_codes       JSONB DEFAULT '[]',       -- [{ "code": "I21", "description": "Acute MI" }]
  severity        TEXT,                     -- MILD | MODERATE | SEVERE | CRITICAL
  
  -- Follow-up
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_after_days INTEGER,
  follow_up_notes TEXT,
  
  -- Status
  status          TEXT DEFAULT 'DRAFT',     -- DRAFT | COMPLETED
  completed_at    TIMESTAMPTZ,
  
  -- AI
  ai_summary      TEXT,                     -- AI-generated patient history summary
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `prescriptions` Table

```sql
CREATE TABLE prescriptions (
  id              TEXT PRIMARY KEY,
  consultation_id TEXT NOT NULL REFERENCES consultations(id),
  patient_id      TEXT NOT NULL REFERENCES patients(id),
  doctor_id       TEXT NOT NULL REFERENCES doctors(id),
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id),
  
  prescription_no TEXT UNIQUE NOT NULL,     -- e.g., RX-2026-001234
  diagnosis       TEXT,                     -- carried from consultation
  notes           TEXT,                     -- general prescription notes
  
  status          TEXT DEFAULT 'PENDING',   -- PENDING | DISPENSED | PARTIAL | CANCELLED
  dispensed_at    TIMESTAMPTZ,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `prescription_items` Table

```sql
CREATE TABLE prescription_items (
  id              TEXT PRIMARY KEY,
  prescription_id TEXT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  
  medicine_name   TEXT NOT NULL,
  generic_name    TEXT,
  dosage          TEXT NOT NULL,            -- e.g., "500mg"
  form            TEXT,                     -- TABLET | SYRUP | INJECTION | CAPSULE | CREAM
  route           TEXT,                     -- ORAL | IV | IM | TOPICAL | INHALED
  frequency       TEXT NOT NULL,            -- e.g., "Twice daily after meals"
  duration_days   INTEGER NOT NULL,         -- e.g., 7 days
  quantity        INTEGER,                  -- total quantity to dispense
  instructions    TEXT,                     -- special instructions
  is_available    BOOLEAN,                  -- checked against pharmacy inventory
  
  -- Dispensing
  dispensed_qty   INTEGER DEFAULT 0,
  dispensed_at    TIMESTAMPTZ
);
```

### `emr_records` Table (Electronic Medical Records)

```sql
CREATE TABLE emr_records (
  id              TEXT PRIMARY KEY,
  patient_id      TEXT NOT NULL REFERENCES patients(id),
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id),
  consultation_id TEXT REFERENCES consultations(id),
  uploaded_by     TEXT NOT NULL REFERENCES users(id),
  
  record_type     TEXT NOT NULL,            -- PRESCRIPTION | LAB_REPORT | XRAY | MRI | CT_SCAN | DISCHARGE_SUMMARY | OTHER
  title           TEXT NOT NULL,
  description     TEXT,
  
  file_url        TEXT NOT NULL,            -- S3 URL
  file_name       TEXT NOT NULL,
  file_size_bytes INTEGER,
  file_mime_type  TEXT,
  
  -- AI Embeddings for semantic search
  embedding       vector(768),              -- pgvector column
  
  tags            TEXT[] DEFAULT '{}',
  is_confidential BOOLEAN DEFAULT FALSE,    -- restricts to doctor+admin only
  
  recorded_date   DATE,                     -- date of the report/record
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);
```

---

## 4. ICD-10 Integration

Store an ICD-10 lookup table for diagnosis coding:

```sql
CREATE TABLE icd_codes (
  code        TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  category    TEXT
);
-- Seed with WHO ICD-10 dataset (~16,000 codes)
```

API: `GET /api/v1/icd-codes?search=cardiac` → returns matching codes for autocomplete.

---

## 5. API Endpoints

### Consultation Endpoints
**Base Path:** `/api/v1/consultations`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Doctor | Start consultation from appointment |
| GET | `/:id` | Doctor, Nurse, Admin | Get consultation details |
| PATCH | `/:id` | Doctor | Update SOAP notes, diagnosis |
| PATCH | `/:id/complete` | Doctor | Complete consultation |
| GET | `/patient/:patientId` | Doctor, Nurse | All consultations for patient |

### Prescription Endpoints
**Base Path:** `/api/v1/prescriptions`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Doctor | Create prescription |
| GET | `/:id` | Doctor, Nurse, Pharmacist, Patient (own) | Get prescription |
| GET | `/patient/:patientId` | Doctor, Nurse | Patient's prescription history |
| GET | `/consultation/:consultationId` | Doctor, Nurse, Pharmacist | Consultation's prescription |
| PATCH | `/:id` | Doctor | Update prescription (before dispensing) |
| GET | `/:id/pdf` | All | Download prescription PDF |

### EMR Endpoints
**Base Path:** `/api/v1/emr`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/upload` | Doctor, Nurse, Lab Technician | Upload medical document |
| GET | `/patient/:patientId` | Doctor, Nurse, Admin, Patient (own) | List patient records |
| GET | `/:id` | All (role-based) | Get record metadata |
| GET | `/:id/download` | All (role-based) | Get signed S3 download URL |
| DELETE | `/:id` | Hospital Admin | Soft delete record |
| GET | `/patient/:patientId/search` | Doctor, Admin | Semantic search EMR |

### ICD-10 Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/v1/icd-codes` | Authenticated | Search ICD-10 codes |

---

## 6. Consultation Workspace — Detailed Behavior

### Opening a Consultation

When doctor clicks "Start Consultation":
1. System checks appointment is in `CONFIRMED` status
2. Appointment status → `IN_CONSULTATION`
3. Consultation record created with status `DRAFT`
4. Doctor is presented the Consultation Workspace

### Auto-Populating the Workspace

When workspace opens, system pre-loads:
- **Patient demographics bar**: Name, age, gender, blood group, allergy badges
- **Latest vitals** (recorded by nurse for this visit)
- **Medical history**: Allergies, conditions, surgeries, medications
- **Previous consultations**: Last 5 with diagnoses, expandable
- **Previous prescriptions**: Last 3, expandable
- **Pending lab results**: Any unreviewed lab results for this patient
- **EMR documents**: Recent uploads

### Auto-Save (Draft)

The consultation form auto-saves every 30 seconds as `DRAFT`. The doctor must explicitly click "Complete Consultation" to finalize.

---

## 7. Prescription Creation

### Prescription Form Flow

1. Doctor types medicine name → autocomplete from `medicines` table (pharmacy inventory)
2. If medicine is in pharmacy inventory → shows current stock level
3. If out of stock → warning badge shown
4. Doctor specifies: dosage, form, route, frequency, duration, instructions
5. System auto-calculates total quantity based on frequency × duration
6. Allergy check: If prescribed medicine is in patient's allergy list → show red warning
7. Doctor adds all medicines → reviews → saves prescription
8. Prescription number generated: `RX-YYYY-XXXXXX`

---

## 8. S3 File Upload for EMR

### Upload Flow

```typescript
// 1. Frontend requests pre-signed URL from backend
POST /api/v1/emr/upload-url
{
  fileName: "blood_test_report.pdf",
  mimeType: "application/pdf",
  patientId: "01HXY...",
  recordType: "LAB_REPORT"
}

// 2. Backend generates S3 pre-signed URL (expires 5 minutes)
// File path in S3: hospitals/{hospitalId}/patients/{patientId}/emr/{ulid}-{filename}

// 3. Frontend uploads directly to S3 (bypasses our server — better performance)
PUT https://s3.amazonaws.com/...presigned-url... (with file binary)

// 4. Frontend notifies backend of completion
POST /api/v1/emr/confirm-upload
{
  uploadId: "01HXY...",
  patientId: "01HXY...",
  consultationId: "01HXY...",   // optional
  recordType: "LAB_REPORT",
  title: "CBC Blood Test Report - June 2026",
  description: "Complete blood count",
  recordedDate: "2026-06-25",
  tags: ["CBC", "Blood Test"]
}

// 5. Backend saves EMR record to DB
// 6. Background job: generate text embedding from file content for semantic search
```

### File Type Restrictions

| Allowed Types | Max Size |
|---|---|
| PDF | 20 MB |
| JPEG, PNG | 10 MB |
| DICOM (MRI/CT) | 100 MB |

### Access Control on S3

- Generate **signed URLs** valid for 15 minutes when downloading
- Files are private in S3 — never publicly accessible
- Backend validates user has permission before generating download URL

---

## 9. Semantic Search for EMR (pgvector)

### Indexing

When an EMR document is uploaded:
1. Background job extracts text (PDF text extraction or OCR for images)
2. Text chunked and embedded using Google `text-embedding-004`
3. Embedding stored in `emr_records.embedding` (pgvector column)

### Search Query

```typescript
// User searches: "blood test June 2026"
// Generate query embedding → cosine similarity search in pgvector

const results = await prisma.$queryRaw`
  SELECT id, title, description, record_type, recorded_date,
    1 - (embedding <=> ${queryEmbedding}::vector) AS similarity
  FROM emr_records
  WHERE patient_id = ${patientId}
    AND deleted_at IS NULL
    AND 1 - (embedding <=> ${queryEmbedding}::vector) > 0.7
  ORDER BY similarity DESC
  LIMIT 10
`;
```

---

## 10. Prescription PDF Generation

When `GET /api/v1/prescriptions/:id/pdf` is called:
- Backend generates PDF using `@react-pdf/renderer` (server-side)
- PDF includes: hospital letterhead, doctor's name + registration no, patient details, medicines list
- PDF is cached in Redis for 1 hour
- Returns binary PDF response with `Content-Disposition: attachment`

### PDF Template Structure

```
[HOSPITAL LOGO]          [Date: 25-Jun-2026]
APOLLO HOSPITALS DELHI
Department of Cardiology

PRESCRIPTION

Patient: Ananya Kapoor (PAT-00000001)   Age: 33 | Female | B+
Doctor: Dr. Priya Nair (Reg: MCI-2014-XXXX)   Dept: Cardiology

Diagnosis: Hypertension (ICD: I10)

Rx:
1. Amlodipine 5mg — Oral — Once daily at night — 30 days
   Special instructions: Monitor blood pressure daily

2. Aspirin 75mg — Oral — Once daily after breakfast — 30 days
   Special instructions: Take with food

Follow-up: 30 days

Signature: _________________
Dr. Priya Nair
```

---

## 11. Frontend Pages & Components

### Doctor Consultation Workspace

| Route | Component | Description |
|---|---|---|
| `/consultation/:appointmentId` | `ConsultationWorkspace` | Main doctor consultation UI |

### Consultation Workspace Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Patient Header: Ananya Kapoor | 33F | B+ | ⚠️ PENICILLIN    │
├──────────────┬──────────────────────────────────────────────┤
│ LEFT PANEL   │ RIGHT PANEL (main working area)              │
│              │                                              │
│ Quick Info   │ Tabs: SOAP | Diagnosis | Prescription | EMR  │
│ - Vitals     │                                              │
│ - Allergies  │ [Active Tab Content]                         │
│ - History    │                                              │
│ - Prev Rx    │                                              │
│              │                                              │
│ [AI Summary] │                                              │
└──────────────┴──────────────────────────────────────────────┘
│ [Save Draft]                    [Complete Consultation] →   │
└─────────────────────────────────────────────────────────────┘
```

### Patient-Facing Pages

| Route | Component | Description |
|---|---|---|
| `/my-records` | `MyEMRPage` | View and download own records |
| `/my-prescriptions` | `MyPrescriptionsPage` | Prescription history |
| `/my-prescriptions/:id` | `PrescriptionDetailPage` | View + download PDF |

### Components

- `SOAPNoteEditor` — Rich text editor for Subjective, Objective, Assessment, Plan
- `DiagnosisSelector` — ICD-10 autocomplete with multi-select
- `PrescriptionBuilder` — Dynamic medicine rows with autocomplete + allergy check
- `MedicineAutoComplete` — Searches pharmacy inventory in real-time
- `EMRUploader` — Drag-and-drop file upload with progress
- `EMRDocumentList` — Filterable list of EMR docs with icons by type
- `EMRViewer` — In-browser PDF/image viewer
- `PatientHistorySidebar` — Collapsible panels for history, vitals, previous consultations
- `AISummaryCard` — "Summarize History" button + streamed AI output display
- `PrescriptionPDF` — Print/download-ready prescription view

---

## 12. Implementation Checklist

### Backend
- [ ] Create `consultations`, `prescriptions`, `prescription_items`, `emr_records` tables
- [ ] Enable `pgvector` extension in PostgreSQL
- [ ] Seed ICD-10 codes dataset (~16,000 codes)
- [ ] Implement consultation CRUD with status machine
- [ ] Implement prescription creation with allergy checking
- [ ] Implement S3 pre-signed URL generation for uploads
- [ ] Implement EMR record confirmation and metadata storage
- [ ] Implement signed URL generation for EMR downloads
- [ ] Implement prescription PDF generation with @react-pdf/renderer
- [ ] Implement text extraction from uploaded PDFs (pdf-parse library)
- [ ] Implement embedding generation via Gemini API
- [ ] Implement semantic search with pgvector
- [ ] Implement ICD-10 search endpoint
- [ ] Add auto-save mechanism (consultation draft)
- [ ] Add Swagger docs
- [ ] Write integration tests

### Frontend
- [ ] Doctor consultation workspace (split-panel layout)
- [ ] SOAP note rich text editor
- [ ] ICD-10 diagnosis autocomplete
- [ ] Prescription builder with medicine autocomplete
- [ ] Allergy warning in prescription builder
- [ ] EMR drag-and-drop uploader
- [ ] In-browser PDF viewer for EMR docs
- [ ] Patient records page for patients
- [ ] Prescription PDF download
- [ ] AI summary card with streaming
