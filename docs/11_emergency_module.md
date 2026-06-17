# Module 11: Emergency Management

> **Build Order**: Eleventh — depends on Patient (Module 3), Doctor (Module 4), and Admission (Module 10).
> **Estimated Effort**: 2–3 days

---

## 1. Module Overview

The Emergency Management module handles life-critical situations with speed and priority. It provides:
- Immediate patient registration (even without prior profile)
- Emergency triage and priority classification
- Automatic emergency doctor assignment
- Priority queue bypassing normal appointment flow
- Real-time emergency alerts to doctors and nurses on duty
- Integration with inpatient admission for critical cases
- Emergency billing with expedited invoice creation

---

## 2. Emergency Triage Levels (5-Level ESI)

| Level | Code | Description | Color | Response Time |
|---|---|---|---|---|
| 1 | `IMMEDIATE` | Life-threatening: cardiac arrest, trauma | 🔴 Red | Immediate |
| 2 | `EMERGENT` | High risk: chest pain, stroke symptoms | 🟠 Orange | < 10 minutes |
| 3 | `URGENT` | Stable but needs prompt care: fractures | 🟡 Yellow | < 30 minutes |
| 4 | `LESS_URGENT` | Minor illness: earache, minor cuts | 🟢 Green | < 1 hour |
| 5 | `NON_URGENT` | Non-emergency: prescription refill | 🔵 Blue | Can wait |

---

## 3. Emergency Registration Flow

```
Patient Arrives / Ambulance Called
    ↓
Receptionist / Triage Nurse Creates Emergency Case
    (Patient may be unknown — registration optional initially)
    ↓
Triage Assessment → Level Assigned
    ↓
Emergency Doctor Auto-Assigned (from duty roster)
    ↓
Real-Time Alert Fired to Doctor + Duty Nurse
    ↓
Treatment Begins
    ↓
If Admission Required → Inpatient Module
    ↓
If Stable → Outpatient Follow-up Appointment
    ↓
Emergency Case CLOSED + Billing Triggered
```

---

## 4. Database Schema

### `emergency_cases` Table

```sql
CREATE TABLE emergency_cases (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id),
  patient_id      TEXT REFERENCES patients(id),     -- NULL if unregistered/unknown patient
  
  case_number     TEXT UNIQUE NOT NULL,              -- e.g., EMG-2026-001234
  
  -- Patient Info (for unknown patients)
  patient_name    TEXT,                              -- if not registered
  patient_age     INTEGER,
  patient_gender  TEXT,
  patient_phone   TEXT,
  brought_by      TEXT,                              -- bystander/ambulance
  
  -- Triage
  triage_level    TEXT NOT NULL,                     -- IMMEDIATE | EMERGENT | URGENT | LESS_URGENT | NON_URGENT
  chief_complaint TEXT NOT NULL,
  symptoms        TEXT[],
  mechanism_of_injury TEXT,                          -- for trauma cases
  
  -- Vitals at arrival
  bp_systolic     INTEGER,
  bp_diastolic    INTEGER,
  pulse           INTEGER,
  temperature     DECIMAL(4,2),
  spo2            INTEGER,
  gcs_score       INTEGER,                           -- Glasgow Coma Scale (3-15)
  
  -- Assignments
  triage_by       TEXT REFERENCES users(id),         -- nurse who triaged
  attending_doctor_id TEXT REFERENCES users(id),
  assigned_nurse_id   TEXT REFERENCES users(id),
  
  -- Outcome
  disposition     TEXT,         -- ADMITTED | DISCHARGED | TRANSFERRED | DECEASED | LEFT_WITHOUT_TREATMENT
  admission_id    TEXT REFERENCES admissions(id),
  
  -- Timing
  arrival_time    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  triage_time     TIMESTAMPTZ,
  doctor_seen_time TIMESTAMPTZ,
  disposition_time TIMESTAMPTZ,
  
  status          TEXT DEFAULT 'ACTIVE',             -- ACTIVE | CLOSED
  notes           TEXT,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `emergency_actions` Table (Treatment log)

```sql
CREATE TABLE emergency_actions (
  id              TEXT PRIMARY KEY,
  emergency_case_id TEXT NOT NULL REFERENCES emergency_cases(id),
  
  action_type     TEXT NOT NULL,                     -- MEDICATION | PROCEDURE | INVESTIGATION | NOTE
  description     TEXT NOT NULL,
  
  performed_by    TEXT NOT NULL REFERENCES users(id),
  performed_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### `duty_roster` Table (Who's on duty)

```sql
CREATE TABLE duty_roster (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id),
  department_id   TEXT NOT NULL REFERENCES departments(id),
  user_id         TEXT NOT NULL REFERENCES users(id),
  user_role       TEXT NOT NULL,                     -- DOCTOR | NURSE
  
  shift_date      DATE NOT NULL,
  shift_type      TEXT NOT NULL,                     -- MORNING | EVENING | NIGHT
  shift_start     TIME NOT NULL,
  shift_end       TIME NOT NULL,
  
  is_on_call      BOOLEAN DEFAULT FALSE,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, shift_date, shift_type)
);
```

---

## 5. API Endpoints

**Base Path:** `/api/v1/emergency`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Receptionist, Nurse, Doctor | Create emergency case |
| GET | `/` | Doctor, Nurse, Admin | List active emergencies |
| GET | `/:id` | Doctor, Nurse, Admin | Emergency case details |
| PATCH | `/:id/triage` | Nurse, Doctor | Update triage level |
| PATCH | `/:id/assign-doctor` | Admin, Nurse | Assign/change attending doctor |
| POST | `/:id/actions` | Doctor, Nurse | Log treatment action |
| GET | `/:id/actions` | Doctor, Nurse, Admin | Get treatment log |
| PATCH | `/:id/admit` | Doctor | Link to inpatient admission |
| PATCH | `/:id/close` | Doctor, Admin | Close emergency case |
| GET | `/duty-roster/today` | All authenticated | Today's duty doctors + nurses |
| POST | `/duty-roster` | Hospital Admin | Set duty roster |

---

## 6. Request / Response Contracts

### POST `/api/v1/emergency` — Create Emergency Case

**Request:**
```json
{
  "patientId": null,
  "patientName": "Unknown Male",
  "patientAge": 55,
  "patientGender": "MALE",
  "broughtBy": "Ambulance - 108",
  "triageLevel": "IMMEDIATE",
  "chiefComplaint": "Sudden collapse. Unresponsive.",
  "symptoms": ["unconscious", "no_pulse"],
  "mechanismOfInjury": "Cardiac Arrest",
  "vitals": {
    "bpSystolic": 0,
    "bpDiastolic": 0,
    "pulse": 0,
    "temperature": 36.8,
    "spo2": 78,
    "gcsScore": 3
  }
}
```

**On creation:**
1. Emergency case created with unique case number
2. **If `IMMEDIATE` or `EMERGENT`:** Real-time Socket.IO alert fired to ALL online doctors + nurses in emergency department
3. On-call emergency doctor auto-assigned from duty roster
4. SMS sent to on-call doctor
5. Audit log created

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "emergencyCase": {
      "id": "01HXY...",
      "caseNumber": "EMG-2026-001234",
      "triageLevel": "IMMEDIATE",
      "triageLevelDisplay": "Level 1 - Immediate",
      "triageColor": "RED",
      "patientName": "Unknown Male",
      "chiefComplaint": "Sudden collapse. Unresponsive.",
      "attendingDoctor": {
        "id": "01HXY...",
        "name": "Dr. Suresh Iyer",
        "phone": "+919876543210"
      },
      "arrivalTime": "2026-06-25T14:00:00Z",
      "status": "ACTIVE"
    }
  }
}
```

---

### GET `/api/v1/emergency` — Active Emergency Board

**Response (200):**
```json
{
  "success": true,
  "data": {
    "cases": [
      {
        "id": "01HXY...",
        "caseNumber": "EMG-2026-001234",
        "triageLevel": "IMMEDIATE",
        "triageColor": "RED",
        "patientName": "Unknown Male, ~55Y",
        "chiefComplaint": "Cardiac Arrest",
        "attendingDoctor": "Dr. Suresh Iyer",
        "arrivalTime": "2026-06-25T14:00:00Z",
        "waitingMinutes": 0,
        "status": "ACTIVE"
      },
      {
        "id": "01HXY...",
        "caseNumber": "EMG-2026-001235",
        "triageLevel": "URGENT",
        "triageColor": "YELLOW",
        "patientName": "Ananya Kapoor",
        "chiefComplaint": "Road Accident - Fracture",
        "attendingDoctor": null,
        "arrivalTime": "2026-06-25T14:20:00Z",
        "waitingMinutes": 8,
        "status": "ACTIVE"
      }
    ],
    "stats": {
      "totalActive": 5,
      "immediate": 1,
      "emergent": 1,
      "urgent": 3
    }
  }
}
```

---

## 7. Real-Time Emergency Alerts (Socket.IO)

### Alert Types and Channels

```typescript
// On IMMEDIATE/EMERGENT case creation:
// 1. Broadcast to all staff in the hospital on duty
socket.to(`hospital:${hospitalId}:emergency`).emit('emergency:new_case', {
  caseNumber: 'EMG-2026-001234',
  triageLevel: 'IMMEDIATE',
  triageColor: 'RED',
  chiefComplaint: 'Cardiac Arrest',
  location: 'Emergency Reception',
  timestamp: new Date().toISOString()
});

// 2. Direct alert to assigned doctor
socket.to(`user:${doctorId}`).emit('emergency:assigned', {
  caseNumber: 'EMG-2026-001234',
  message: 'You have been assigned to Emergency Case EMG-2026-001234 - IMMEDIATE'
});

// 3. SMS to on-call doctor
await sendSMS(doctorPhone, 
  `EMERGENCY ALERT: You are assigned to Case ${caseNumber}. Patient: ${complaint}. Triage: LEVEL 1. Report to ER immediately.`
);
```

### Emergency Notification Banner

All staff UIs show a persistent red banner when `IMMEDIATE` cases are active:
```
⚠️ EMERGENCY ALERT: Level 1 Case Active — EMG-2026-001234 — Cardiac Arrest — Room ER-1
```

---

## 8. Auto Doctor Assignment Logic

```typescript
async function autoAssignDoctor(emergencyCase: EmergencyCase) {
  const today = new Date();
  const currentHour = today.getHours();
  
  // Determine current shift
  const shift = currentHour < 14 ? 'MORNING' : currentHour < 22 ? 'EVENING' : 'NIGHT';
  
  // Find on-call emergency doctor for current shift
  const dutyDoctor = await prisma.dutyRoster.findFirst({
    where: {
      hospitalId: emergencyCase.hospitalId,
      shiftDate: today,
      shiftType: shift,
      userRole: 'DOCTOR',
      isOnCall: true,
      department: { code: 'EMER' }  // Emergency department
    },
    include: { user: true }
  });
  
  if (dutyDoctor) {
    await prisma.emergencyCase.update({
      where: { id: emergencyCase.id },
      data: { attendingDoctorId: dutyDoctor.userId }
    });
  }
  // If no on-call doctor, alert admin + all available doctors
}
```

---

## 9. Emergency Billing

Emergency cases auto-generate an invoice with:
- Emergency registration fee (configurable)
- Emergency consultation fee (different from regular)
- Any medicines/procedures performed during emergency

If patient is unknown → invoice flagged as `PATIENT_UNKNOWN` until patient is identified.

---

## 10. Emergency Board UI — Real-Time Dashboard

The emergency dashboard is a **live, auto-refreshing board** powered by Socket.IO:

```
╔══════════════════════════════════════════════════════════════╗
║  🏥 EMERGENCY BOARD — Apollo Hospitals Delhi                 ║
║  ⏰ Last Updated: 14:35:22                                   ║
╠═════════╦══════════╦════════════╦══════════╦═════════════════╣
║ CASE NO  ║ PRIORITY ║ PATIENT    ║ WAITING  ║ DOCTOR          ║
╠═════════╬══════════╬════════════╬══════════╬═════════════════╣
║EMG-001  ║🔴 IMMED  ║Unknown M,55║ 0 min    ║Dr. Suresh Iyer ║
║EMG-002  ║🟡 URGENT ║A. Kapoor   ║ 8 min    ║Unassigned ⚠️   ║
║EMG-003  ║🟠 EMERG  ║R. Kumar,67 ║ 4 min    ║Dr. Meena Shah  ║
╚═════════╩══════════╩════════════╩══════════╩═════════════════╝
Active: 5 | 🔴 Immediate: 1 | 🟠 Emergent: 1 | 🟡 Urgent: 3
```

---

## 11. Frontend Pages & Components

| Route | Component | Description |
|---|---|---|
| `/emergency` | `EmergencyBoardPage` | Live emergency dashboard |
| `/emergency/new` | `CreateEmergencyPage` | Rapid registration form |
| `/emergency/:id` | `EmergencyCasePage` | Case detail + treatment log |
| `/emergency/roster` | `DutyRosterPage` | Manage daily duty roster |

### Components

- `EmergencyBoard` — Real-time auto-refreshing grid
- `TriageBadge` — Color-coded triage level badge
- `EmergencyAlert` — Full-screen flash alert for Level 1/2 cases
- `RapidRegistrationForm` — Minimal required fields for fast entry
- `TreatmentLogTimeline` — Chronological action log
- `DutyRosterGrid` — Weekly shift assignment grid
- `WaitingTimer` — Live timer showing minutes since arrival
- `EmergencyStatusBar` — Persistent top banner for active Level 1 cases

---

## 12. Implementation Checklist

### Backend
- [ ] Create `emergency_cases`, `emergency_actions`, `duty_roster` tables
- [ ] Implement emergency case creation with auto-assignment
- [ ] Implement triage level update
- [ ] Implement treatment action logging
- [ ] Implement Socket.IO emergency broadcast channel
- [ ] Implement emergency SMS alerts via Twilio
- [ ] Implement duty roster management
- [ ] Implement auto-assignment from duty roster
- [ ] Integrate with billing for emergency charges
- [ ] Integrate with admission module for case-to-admission
- [ ] Add Swagger docs

### Frontend
- [ ] Live emergency board with Socket.IO updates
- [ ] Emergency level flash alerts
- [ ] Rapid registration form (minimal fields)
- [ ] Emergency case detail with action log
- [ ] Duty roster management
- [ ] Emergency status banner in navigation
