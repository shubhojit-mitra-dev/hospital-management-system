# Module 7: Laboratory Management

> **Build Order**: Seventh — depends on Consultations (Module 6) for test orders.
> **Estimated Effort**: 3–4 days

---

## 1. Module Overview

The Laboratory Management module handles the complete lifecycle of diagnostic tests ordered by doctors. It covers:
- Doctor ordering lab tests from the consultation workspace
- Lab technician receiving, processing, and uploading test results
- Doctor reviewing and approving lab results
- Patient viewing/downloading their reports
- Lab test catalog management
- Integration with billing (test charges)

---

## 2. Test Request Lifecycle

```
Doctor Orders Test (from consultation)
    ↓
Lab Receives Request (status: PENDING)
    ↓
Sample Collected (status: SAMPLE_COLLECTED)
    ↓
Processing / Analysis (status: PROCESSING)
    ↓
Report Generated (status: COMPLETED)
    ↓
Doctor Reviews Report (status: REVIEWED)
    ↓
Patient Notified
```

---

## 3. Lab Test Types

| Category | Tests |
|---|---|
| **Hematology** | CBC (Complete Blood Count), ESR, PT/INR, aPTT |
| **Biochemistry** | Glucose, HbA1c, Lipid Profile, LFT, KFT, Thyroid Panel |
| **Microbiology** | Blood Culture, Urine Culture, Sputum Culture |
| **Serology** | HIV, HBsAg, HCV, Widal, Dengue NS1, Covid Antigen |
| **Radiology** | X-Ray, Ultrasound, CT Scan, MRI |
| **Pathology** | Biopsy, FNAC, Pap Smear, Urine Routine |
| **Cardiology** | ECG, 2D Echo, Treadmill Test |

---

## 4. Database Schema

### `lab_test_catalog` Table

```sql
CREATE TABLE lab_test_catalog (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id),
  department_id   TEXT REFERENCES departments(id),       -- Pathology / Radiology dept
  
  test_code       TEXT NOT NULL,                         -- e.g., CBC, LFT
  test_name       TEXT NOT NULL,                         -- e.g., "Complete Blood Count"
  category        TEXT NOT NULL,                         -- HEMATOLOGY | BIOCHEMISTRY | ...
  description     TEXT,
  normal_range    JSONB,                                 -- reference ranges
  -- e.g., { "WBC": { "min": 4.0, "max": 11.0, "unit": "x10³/μL" } }
  
  price           DECIMAL(10,2) NOT NULL,
  preparation_instructions TEXT,                        -- e.g., "8 hours fasting required"
  turnaround_hours INTEGER DEFAULT 24,                  -- expected TAT
  
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `lab_orders` Table

```sql
CREATE TABLE lab_orders (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id),
  patient_id      TEXT NOT NULL REFERENCES patients(id),
  doctor_id       TEXT NOT NULL REFERENCES doctors(id),
  consultation_id TEXT REFERENCES consultations(id),
  
  order_number    TEXT UNIQUE NOT NULL,                  -- e.g., LAB-2026-001234
  status          TEXT NOT NULL DEFAULT 'PENDING',
  -- PENDING | SAMPLE_COLLECTED | PROCESSING | COMPLETED | REVIEWED | CANCELLED
  
  priority        TEXT DEFAULT 'ROUTINE',               -- ROUTINE | URGENT | STAT
  clinical_notes  TEXT,                                 -- doctor's notes for lab tech
  
  sample_collected_at TIMESTAMPTZ,
  sample_collected_by TEXT REFERENCES users(id),        -- nurse or lab tech
  completed_at    TIMESTAMPTZ,
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     TEXT REFERENCES users(id),
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `lab_order_items` Table

```sql
CREATE TABLE lab_order_items (
  id              TEXT PRIMARY KEY,
  lab_order_id    TEXT NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
  test_catalog_id TEXT NOT NULL REFERENCES lab_test_catalog(id),
  
  test_code       TEXT NOT NULL,
  test_name       TEXT NOT NULL,
  price           DECIMAL(10,2) NOT NULL,                -- snapshot at order time
  status          TEXT DEFAULT 'PENDING',                -- per-test status
  
  -- Results
  result_values   JSONB,
  -- e.g., { "WBC": "7.2", "RBC": "4.8", "Hemoglobin": "13.5" }
  
  result_interpretation TEXT,                            -- NORMAL | ABNORMAL | CRITICAL
  technician_notes TEXT,
  
  report_file_url TEXT,                                  -- S3 URL for uploaded report
  result_entered_at TIMESTAMPTZ,
  result_entered_by TEXT REFERENCES users(id)
);
```

### `lab_results` Table (normalized result storage)

```sql
CREATE TABLE lab_results (
  id              TEXT PRIMARY KEY,
  lab_order_item_id TEXT NOT NULL REFERENCES lab_order_items(id),
  patient_id      TEXT NOT NULL REFERENCES patients(id),
  
  parameter_name  TEXT NOT NULL,                         -- e.g., "Hemoglobin"
  result_value    TEXT NOT NULL,                         -- e.g., "13.5"
  unit            TEXT,                                  -- e.g., "g/dL"
  reference_min   TEXT,
  reference_max   TEXT,
  is_abnormal     BOOLEAN DEFAULT FALSE,
  is_critical     BOOLEAN DEFAULT FALSE,                 -- triggers alert if true
  
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. API Endpoints

### Lab Test Catalog
**Base Path:** `/api/v1/lab-catalog`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Authenticated | List all tests (filterable by category) |
| POST | `/` | Hospital Admin | Add test to catalog |
| PATCH | `/:id` | Hospital Admin | Update test details/pricing |
| DELETE | `/:id` | Hospital Admin | Deactivate test |

### Lab Orders
**Base Path:** `/api/v1/lab-orders`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Doctor | Create lab order from consultation |
| GET | `/` | Doctor, Lab Technician, Admin | List lab orders (filterable) |
| GET | `/:id` | All (role-based) | Get lab order details |
| PATCH | `/:id/collect-sample` | Lab Technician, Nurse | Mark sample collected |
| PATCH | `/:id/start-processing` | Lab Technician | Mark as processing |
| POST | `/:id/results` | Lab Technician | Upload results |
| PATCH | `/:id/review` | Doctor | Mark as reviewed |
| PATCH | `/:id/cancel` | Doctor, Admin | Cancel lab order |
| GET | `/patient/:patientId` | Doctor, Patient (own) | Patient's lab history |
| GET | `/:id/report` | Doctor, Nurse, Patient (own) | Download report |

---

## 6. Request / Response Contracts

### POST `/api/v1/lab-orders` — Order Lab Tests

**Request Body:**
```json
{
  "patientId": "01HXY...",
  "consultationId": "01HXY...",
  "priority": "ROUTINE",
  "clinicalNotes": "Rule out anemia. Patient has fatigue for 2 weeks.",
  "tests": [
    { "testCatalogId": "01HXY...", "testCode": "CBC" },
    { "testCatalogId": "01HXY...", "testCode": "IRON" },
    { "testCatalogId": "01HXY...", "testCode": "VITB12" }
  ]
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "labOrder": {
      "id": "01HXY...",
      "orderNumber": "LAB-2026-001234",
      "patient": { "name": "Ananya Kapoor" },
      "doctor": { "name": "Dr. Priya Nair" },
      "tests": [
        { "testCode": "CBC", "testName": "Complete Blood Count", "price": 350 },
        { "testCode": "IRON", "testName": "Serum Iron", "price": 200 },
        { "testCode": "VITB12", "testName": "Vitamin B12", "price": 500 }
      ],
      "totalAmount": 1050,
      "status": "PENDING",
      "priority": "ROUTINE",
      "preparationInstructions": [
        "CBC: No specific preparation required",
        "IRON: 8-12 hours fasting required",
        "VITB12: No specific preparation required"
      ]
    }
  }
}
```

---

### POST `/api/v1/lab-orders/:id/results` — Upload Results

**Request (multipart/form-data or JSON):**
```json
{
  "items": [
    {
      "labOrderItemId": "01HXY...",
      "resultValues": {
        "WBC": "7.2",
        "RBC": "3.8",
        "Hemoglobin": "9.8",
        "MCV": "72",
        "MCH": "24"
      },
      "resultInterpretation": "ABNORMAL",
      "technicianNotes": "Low hemoglobin. Possible iron deficiency anemia.",
      "results": [
        { "parameterName": "WBC", "resultValue": "7.2", "unit": "x10³/μL", "referenceMin": "4.0", "referenceMax": "11.0", "isAbnormal": false },
        { "parameterName": "Hemoglobin", "resultValue": "9.8", "unit": "g/dL", "referenceMin": "12.0", "referenceMax": "16.0", "isAbnormal": true, "isCritical": false }
      ]
    }
  ],
  "reportFileKey": "hospitals/01HXY.../patients/01HXY.../lab/LAB-2026-001234.pdf"
}
```

**On upload:**
1. Results saved to `lab_results` table
2. Abnormal results highlighted
3. If any `isCritical: true` → immediate notification to doctor + nurse
4. Lab order status → `COMPLETED`
5. Patient notified: "Your lab report is ready"
6. EMR record auto-created from lab report

---

## 7. Critical Value Alerts

If any test result is marked `isCritical: true`:

```typescript
// Immediately fire Socket.IO event to doctor
socket.to(`doctor:${doctorId}`).emit('lab:critical_value', {
  patientName: 'Ananya Kapoor',
  testName: 'Hemoglobin',
  value: '6.2 g/dL',
  referenceRange: '12.0 - 16.0',
  labOrderId: '01HXY...'
});

// Send push notification + SMS to doctor
```

---

## 8. Lab Order Priority Queue

The lab dashboard shows a prioritized queue:
1. `STAT` (life-threatening) — top priority, red badge
2. `URGENT` — orange badge
3. `ROUTINE` — normal order

---

## 9. Frontend Pages & Components

### Lab Technician Pages

| Route | Component | Description |
|---|---|---|
| `/lab/orders` | `LabOrderQueuePage` | All pending lab orders, priority-sorted |
| `/lab/orders/:id` | `LabOrderDetailPage` | Order detail + result entry form |
| `/lab/results/entry/:orderId` | `ResultEntryPage` | Form to enter per-parameter results |

### Doctor Pages (within consultation)

- Embedded `LabOrderBuilder` in consultation workspace
- `LabResultsViewer` — shows results with normal/abnormal color coding

### Patient Pages

| Route | Component | Description |
|---|---|---|
| `/my-labs` | `MyLabReportsPage` | All lab orders and results |
| `/my-labs/:id` | `LabReportDetailPage` | Individual report with reference ranges |

### Components

- `LabOrderBuilder` — Test catalog browser + multi-select for ordering
- `ResultEntryForm` — Per-parameter input with reference range display
- `AbnormalBadge` — Red/orange badge for out-of-range results
- `LabReportViewer` — Formatted result display with trend graphs
- `PriorityBadge` — STAT | URGENT | ROUTINE color-coded chip
- `LabStatusTimeline` — Shows lifecycle stages with timestamps

---

## 10. Implementation Checklist

### Backend
- [ ] Create `lab_test_catalog`, `lab_orders`, `lab_order_items`, `lab_results` tables
- [ ] Seed default lab test catalog (common tests)
- [ ] Implement lab order creation from consultation
- [ ] Implement lab order queue with priority sorting
- [ ] Implement sample collection tracking
- [ ] Implement result entry with per-parameter storage
- [ ] Implement critical value alert system (Socket.IO + SMS)
- [ ] Implement auto EMR record creation from lab results
- [ ] Implement lab order billing integration (add charges to invoice)
- [ ] Implement report download (signed S3 URL)
- [ ] Add Swagger docs

### Frontend
- [ ] Lab order queue page with priority filtering
- [ ] Lab order detail page
- [ ] Result entry form (dynamic per test)
- [ ] Abnormal result highlighting
- [ ] Critical value toast notification
- [ ] Lab order builder (for doctor consultation)
- [ ] Patient lab reports page with reference ranges
- [ ] Lab report PDF viewer
