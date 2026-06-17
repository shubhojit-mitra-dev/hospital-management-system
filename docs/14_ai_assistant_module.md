# Module 14: AI Healthcare Assistant

> **Build Order**: Fourteenth — final module, sits on top of all other data.
> **Estimated Effort**: 5–6 days
> **Technology**: Google Gemini 1.5 Pro + Vercel AI SDK + pgvector

---

## 1. Module Overview

The AI Healthcare Assistant is a mandatory, cross-cutting AI layer that integrates throughout the HMS. It is powered by **Google Gemini 1.5 Pro** and provides:

1. **AI Symptom Analyzer** — Helps patients understand their symptoms before booking
2. **AI Medical Record Summarizer** — Summarizes patient history for doctors
3. **AI Prescription Explanation Bot** — Explains prescriptions in simple language to patients
4. **AI Appointment Assistant** — Conversational appointment booking helper
5. **AI Operations Dashboard** — Business intelligence chatbot for hospital admins

All AI features are clearly labeled with appropriate disclaimers. No AI output should be presented as a definitive medical diagnosis.

---

## 2. AI Architecture

```
User Input
    ↓
Frontend (Vercel AI SDK hooks)
    ↓
Next.js API Route (streaming)
    ↓
AI Service Layer (prompt engineering + context injection)
    ├── Fetch relevant context from DB (patient data, appointments, etc.)
    ├── Fetch relevant EMR embeddings from pgvector
    └── Call Google Gemini 1.5 Pro API
    ↓
Streaming Response → Frontend (token-by-token)
    ↓
AI Interaction logged in DB
```

---

## 3. Tech Stack for AI

| Component | Technology |
|---|---|
| LLM | Google Gemini 1.5 Pro |
| AI SDK | Vercel AI SDK (`ai` package) |
| Streaming | `streamText` from Vercel AI SDK |
| Embeddings | Google `text-embedding-004` |
| Vector Search | pgvector extension on PostgreSQL |
| Text Extraction | `pdf-parse` (for PDF EMR docs) |
| Context Window | ~1M tokens (Gemini 1.5 Pro) |

---

## 4. Database Schema

### `ai_interactions` Table

```sql
CREATE TABLE ai_interactions (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT REFERENCES hospitals(id),
  user_id         TEXT REFERENCES users(id),
  
  feature         TEXT NOT NULL,             -- SYMPTOM_ANALYZER | RECORD_SUMMARIZER | PRESCRIPTION_BOT | APPOINTMENT_ASSISTANT | OPERATIONS_DASHBOARD
  
  -- Conversation (for multi-turn features)
  session_id      TEXT,                      -- Groups messages in a session
  messages        JSONB NOT NULL DEFAULT '[]',
  -- [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }]
  
  -- Context used
  patient_id      TEXT REFERENCES patients(id),
  context_summary TEXT,                      -- what DB data was fetched
  
  -- Token usage (cost tracking)
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  total_tokens    INTEGER,
  model_used      TEXT DEFAULT 'gemini-1.5-pro',
  
  -- Feedback
  user_rating     INTEGER,                   -- 1-5 stars
  user_feedback   TEXT,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Feature 1: AI Symptom Analyzer

### User: Patient
### Context: No patient data needed — pure LLM reasoning

### Behavior

The patient enters their symptoms in natural language on the booking page. The AI:
1. Analyzes the symptoms
2. Lists possible conditions (NOT a diagnosis)
3. Recommends the most relevant hospital department
4. Assigns an urgency level: LOW | MEDIUM | HIGH | EMERGENCY
5. If urgency is EMERGENCY → shows red alert and prompts to call emergency number

### System Prompt

```
You are a medical triage assistant for Apollo Hospitals. Your job is to help patients understand which department to visit based on their symptoms.

Rules:
- Never provide a definitive medical diagnosis
- Always recommend consulting a doctor
- Be empathetic and clear
- Use simple, non-medical language
- If symptoms suggest emergency (chest pain, difficulty breathing, stroke signs, severe bleeding), immediately flag as EMERGENCY

When responding, always structure your output as JSON:
{
  "possibleConditions": ["condition1", "condition2"],
  "recommendedDepartment": "Cardiology",
  "urgencyLevel": "HIGH",
  "urgencyReason": "Chest pain with shortness of breath requires urgent evaluation",
  "advice": "Please visit the Cardiology department as soon as possible.",
  "disclaimer": "This is not a medical diagnosis. Please consult a doctor.",
  "isEmergency": false,
  "emergencyMessage": null
}
```

### API Endpoint

```
POST /api/v1/ai/symptom-analyzer
```

**Request:**
```json
{
  "symptoms": "I have been having severe chest pain for the past 2 hours, along with sweating and pain in my left arm."
}
```

**Response (streaming JSON):**
```json
{
  "possibleConditions": [
    "Acute Coronary Syndrome",
    "Myocardial Infarction (Heart Attack)",
    "Angina"
  ],
  "recommendedDepartment": "Emergency / Cardiology",
  "urgencyLevel": "EMERGENCY",
  "urgencyReason": "Chest pain with sweating and left arm pain are classic heart attack symptoms",
  "advice": "These symptoms are serious. Please call emergency services (112) or go to the Emergency department immediately. Do not drive yourself.",
  "disclaimer": "This is not a medical diagnosis. Only a doctor can diagnose your condition.",
  "isEmergency": true,
  "emergencyMessage": "⚠️ EMERGENCY: Please call 112 or go to the ER immediately!"
}
```

### Frontend UI

- Located on: `/book-appointment` page, before department selection
- Optional step: "Tell me your symptoms to get help choosing the right department"
- Symptom input: Multi-line textarea with "Analyze Symptoms" button
- Shows streaming result with animated loading
- Red flash UI for EMERGENCY urgency
- "Book Appointment" pre-fills department based on AI recommendation

---

## 6. Feature 2: AI Medical Record Summarizer

### User: Doctor
### Context: Patient's full medical history, last 5 consultations, allergies, conditions

### Behavior

When a doctor opens the consultation workspace, a "Summarize Patient History" button triggers the AI to:
1. Fetch patient's complete profile
2. Fetch last 5 consultations with diagnoses
3. Fetch all allergies and chronic conditions
4. Fetch recent EMR records
5. Generate a concise, clinically-structured summary

### Context Injection

```typescript
async function buildSummaryContext(patientId: string) {
  const [patient, history, recentConsultations, recentLabs] = await Promise.all([
    getPatientProfile(patientId),
    getPatientMedicalHistory(patientId),
    getRecentConsultations(patientId, 5),
    getRecentLabResults(patientId, 5)
  ]);
  
  return `
PATIENT: ${patient.firstName} ${patient.lastName}, ${patient.age}Y, ${patient.gender}

ALLERGIES: ${history.allergies.map(a => `${a.substance} (${a.reaction})`).join(', ') || 'None known'}

CHRONIC CONDITIONS: ${history.conditions.map(c => `${c.name} since ${c.diagnosedYear}`).join(', ') || 'None'}

CURRENT MEDICATIONS: ${history.medications.map(m => `${m.name} ${m.dosage} ${m.frequency}`).join(', ') || 'None'}

PAST SURGERIES: ${history.surgeries.map(s => `${s.procedure} (${s.date})`).join(', ') || 'None'}

RECENT CONSULTATIONS (last 5):
${recentConsultations.map(c => `- ${formatDate(c.createdAt)}: Dr. ${c.doctor.name} — ${c.diagnosis} — Severity: ${c.severity}`).join('\n')}

RECENT LAB RESULTS:
${recentLabs.map(l => `- ${l.testName} (${formatDate(l.createdAt)}): ${l.interpretation}`).join('\n')}
  `;
}
```

### System Prompt

```
You are a clinical documentation assistant for doctors. Summarize the patient's medical history concisely for a physician preparing for a consultation.

Format your summary with these sections:
1. Patient Overview (1 sentence)
2. Key Allergies & Contraindications (if any - flag prominently)
3. Active Chronic Conditions
4. Recent Medical History (last 6 months)
5. Current Medications
6. Recent Lab Highlights (abnormal values only)
7. Clinical Considerations for This Visit

Be concise, clinical, and accurate. Use medical terminology appropriate for a doctor. Do not include information not provided. Flag any critical allergies with ⚠️.
```

### API Endpoint

```
POST /api/v1/ai/summarize-records
Content-Type: application/json
Authorization: Bearer <doctor-token>
```

**Request:**
```json
{
  "patientId": "01HXY...",
  "consultationId": "01HXY..."  // optional — current consultation context
}
```

**Response: Server-Sent Events (streaming)**

```
data: {"text": "**Patient Overview**\n"}
data: {"text": "Ananya Kapoor, 33-year-old female "}
data: {"text": "with a history of hypothyroidism "}
...
data: [DONE]
```

### Frontend UI

- Embedded in consultation workspace left sidebar
- "✨ Summarize History" button with AI sparkle icon
- Shows streaming markdown output as it generates
- Output is read-only, formatted with markdown
- Copy-to-clipboard button for pasting into SOAP notes

---

## 7. Feature 3: AI Prescription Explanation Bot

### User: Patient
### Context: The patient's prescription with medicine details

### Behavior

Patient asks questions about their prescription:
- "How should I take this medicine?"
- "What is this medicine for?"
- "Are there any side effects?"
- "Can I take Amlodipine with Aspirin?"

### System Prompt

```
You are a friendly pharmacy assistant helping a patient understand their prescription. Explain medicines in simple, non-medical language that any person can understand.

Rules:
- Never tell the patient to stop or change their medicine without doctor approval
- Keep explanations simple and practical
- If asked about drug interactions, provide general info but always recommend asking their pharmacist/doctor
- Be warm, empathetic, and supportive

The patient's prescription:
{{prescription_context}}
```

### Context: Prescription

```typescript
function buildPrescriptionContext(prescription) {
  return `
PRESCRIPTION for: ${prescription.patient.firstName} ${prescription.patient.lastName}
Doctor: Dr. ${prescription.doctor.user.firstName} ${prescription.doctor.user.lastName}
Diagnosis: ${prescription.diagnosis}

MEDICINES:
${prescription.items.map(item => `
- ${item.medicineName} ${item.dosage} (${item.form})
  Take: ${item.frequency}
  Duration: ${item.durationDays} days
  Instructions: ${item.instructions || 'No special instructions'}
`).join('')}
  `;
}
```

### API Endpoint

```
POST /api/v1/ai/explain-prescription (streaming)
```

**Request:**
```json
{
  "prescriptionId": "01HXY...",
  "question": "Can I drink alcohol while taking these medicines?"
}
```

**Response (streaming):**
```
"For the medicines in your prescription, here's what you need to know about alcohol:

**Amlodipine (blood pressure medicine)**: Alcohol can lower your blood pressure further, which may cause dizziness. It's best to avoid or limit alcohol.

**Aspirin**: Drinking alcohol while taking Aspirin increases the risk of stomach bleeding. It's recommended to avoid alcohol.

In general, your doctor has prescribed these for heart health, so a healthy lifestyle — including limiting alcohol — will help your treatment work better.

Please discuss this with your doctor or pharmacist if you have concerns. 😊"
```

### Frontend UI

- Located on `/my-prescriptions/:id` page
- Chat widget: "Ask about your prescription" with chat bubbles
- Shows prescription context summary above chat
- Multi-turn: patient can ask follow-up questions
- Session persists for the prescription context

---

## 8. Feature 4: AI Appointment Assistant

### User: Patient
### Context: Patient's profile, available doctors, hospital departments

### Behavior

Natural language appointment booking assistant:
- Patient: "I need to see a heart specialist next week"
- AI: Shows available cardiologists with their slots
- Patient: "Book me with Dr. Priya Nair on Wednesday morning"
- AI: Confirms booking details and books if patient confirms

### Flow

```
1. AI understands intent: specialty needed, preferred date/time
2. AI searches available doctors in the relevant department
3. AI presents options in conversational format
4. Patient selects
5. AI confirms booking details
6. Patient confirms → API call to book appointment
7. AI confirms booking with token number
```

### System Prompt

```
You are an appointment booking assistant for Apollo Hospitals Delhi. Help patients book appointments in a conversational, friendly way.

Available departments: {{departments}}
Hospital working hours: {{workingHours}}
Today's date: {{today}}

When a patient describes their health need:
1. Identify the appropriate department/specialty
2. Respond with available doctors and slots
3. Help them select a convenient time
4. Confirm the booking details before finalizing

Always ask for confirmation before booking. Never book without explicit patient confirmation.

Format doctor availability responses clearly with: Doctor name, specialty, experience, fee, and available time slots.
```

### API Endpoint

```
POST /api/v1/ai/appointment-assistant (streaming)
```

**Request:**
```json
{
  "sessionId": "session_01HXY...",
  "message": "I need to see a heart specialist next week",
  "patientId": "01HXY..."
}
```

**Example Conversation:**

```
Patient: "I need to see a heart specialist next week"

AI: "I can help you book an appointment with our Cardiology team! 

Here are our available cardiologists next week:

1. **Dr. Priya Nair** — Interventional Cardiology
   Experience: 12 years | Consultation: ₹1,500
   Available: Mon 25 Jun (10:00 AM, 2:30 PM), Wed 27 Jun (9:00 AM, 11:00 AM)

2. **Dr. Rajesh Kumar** — General Cardiology
   Experience: 8 years | Consultation: ₹1,000
   Available: Tue 26 Jun (10:00 AM - 3:00 PM), Thu 28 Jun

Which doctor and time works for you?"

Patient: "Dr. Priya Nair on Wednesday morning"

AI: "Great choice! Let me confirm:

- **Doctor**: Dr. Priya Nair (Interventional Cardiology)
- **Date**: Wednesday, 27 June 2026
- **Time**: 9:00 AM
- **Consultation Fee**: ₹1,500
- **Token**: Will be assigned on confirmation

Shall I confirm this booking? (Yes/No)"

Patient: "Yes"

AI: "✅ Appointment booked successfully!

**Token Number: #7**
**Date**: 27 Jun 2026 at 9:00 AM
**Location**: Cardiology, 3rd Floor, Block A

Please arrive 15 minutes early. A confirmation has been sent to your email and phone.

Is there anything else I can help you with?"
```

### Frontend UI

- Floating chat widget on booking page + patient dashboard
- Chat bubble UI with message history
- AI messages show typing indicator
- Doctor cards rendered inline in chat (not just text)
- "Book Now" button rendered by AI in the conversation
- Confirmation modal before final booking

---

## 9. Feature 5: AI Operations Dashboard

### User: Hospital Admin
### Context: Hospital's aggregated operational data + recent trends

### Behavior

Natural language analytics assistant for hospital admins:
- "Why did revenue decrease this month?"
- "Which departments have the lowest utilization?"
- "How many beds are available right now?"
- "Show me the top performing doctors this quarter"

### Context Injection

```typescript
async function buildOpsContext(hospitalId: string, period: string) {
  const [revenue, patients, beds, doctors, departments] = await Promise.all([
    getRevenueData(hospitalId, period),
    getPatientData(hospitalId, period),
    getBedOccupancy(hospitalId),
    getDoctorUtilization(hospitalId, period),
    getDepartmentPerformance(hospitalId, period)
  ]);
  
  return `
HOSPITAL: Apollo Hospitals Delhi
PERIOD: ${period}
TODAY: ${formatDate(new Date())}

REVENUE SUMMARY:
- This month: ₹${revenue.current.toLocaleString()}
- Last month: ₹${revenue.previous.toLocaleString()}
- Change: ${revenue.change > 0 ? '+' : ''}${revenue.change}%
- By department: ${JSON.stringify(revenue.byDepartment)}

BED OCCUPANCY:
- Overall: ${beds.occupancyRate}% (${beds.occupied}/${beds.total} beds)
- ICU: ${beds.icu.occupancyRate}%
- General: ${beds.general.occupancyRate}%

PATIENT VOLUME:
- This month: ${patients.current} patients
- New patients: ${patients.new}
- Repeat patients: ${patients.repeat}

TOP DEPARTMENTS BY REVENUE:
${departments.map(d => `- ${d.name}: ₹${d.revenue.toLocaleString()} (${d.appointments} appointments)`).join('\n')}
  `;
}
```

### System Prompt

```
You are an AI operations analyst for Apollo Hospitals. Analyze hospital performance data and provide actionable insights to the Hospital Administrator.

Be data-driven, specific, and actionable. When revenue or metrics decline, explain likely causes and suggest improvements. Use Indian healthcare context.

Available data: {{context}}

Always cite specific numbers from the data. Be concise and business-focused.
```

### API Endpoint

```
POST /api/v1/ai/operations-chat (streaming)
```

**Example Interaction:**

```
Admin: "Why did revenue decrease this month?"

AI: "Based on the data, revenue decreased by ₹1.3L (11%) in June compared to May.

**Root Causes Identified:**

1. **Appointment Drop (-18%)**: Cardiology saw a 23% drop in appointments, likely due to Dr. Kumar being on leave June 10-20. 45 appointment slots went unfilled.

2. **Lab Revenue Down (-8%)**: Lab tests decreased from 847 to 781 this month. The Pathology department shows a 12% decrease in test orders.

3. **Pharmacy Revenue Stable**: Pharmacy revenue is actually up 3%, a positive indicator.

**Recommendations:**
- Schedule a substitute doctor coverage plan when senior doctors are on leave
- Promote preventive health checkup packages to increase lab volume
- Consider running a health screening camp in the last week of July

Would you like me to dive deeper into any of these areas?"
```

### Frontend UI

- Sidebar chat panel on admin dashboard
- Floating "AI Assistant" button (bottom right) with AI icon
- Pre-suggested questions as chips: "Revenue this month", "Bed availability", "Top departments"
- AI response renders Markdown (bold, lists, tables)
- "Generate Report" button: exports conversation insights as PDF

---

## 10. AI Safety & Compliance

| Concern | Mitigation |
|---|---|
| Medical advice | Clear disclaimers: "Not a medical diagnosis" |
| Hallucinations | Ground responses in actual DB data (RAG pattern) |
| Prompt injection | Input sanitization, output validation |
| Data privacy | Never include PII in logs; AI interaction logs are encrypted |
| HIPAA-like compliance | AI logs stored separately, role-based access |
| Rate limiting | Max 20 AI requests per user per hour |
| Token cost control | Context length limits per feature |

---

## 11. AI Cost Estimation

| Feature | Avg Input Tokens | Avg Output Tokens | Estimated Cost/Request |
|---|---|---|---|
| Symptom Analyzer | ~200 | ~300 | ~$0.0025 |
| Record Summarizer | ~1,500 | ~500 | ~$0.01 |
| Prescription Bot | ~800 | ~400 | ~$0.006 |
| Appointment Assistant | ~600 | ~400 | ~$0.005 |
| Operations Dashboard | ~2,000 | ~600 | ~$0.013 |

Track costs in `ai_interactions.total_tokens` and alert admin when daily AI cost exceeds threshold.

---

## 12. API Endpoints Summary

| Method | Endpoint | Feature | Access |
|---|---|---|---|
| POST | `/api/v1/ai/symptom-analyzer` | Symptom Analyzer | Patient, Public |
| POST | `/api/v1/ai/summarize-records` | Record Summarizer | Doctor |
| POST | `/api/v1/ai/explain-prescription` | Prescription Bot | Patient |
| POST | `/api/v1/ai/appointment-assistant` | Appointment Assistant | Patient |
| POST | `/api/v1/ai/operations-chat` | Operations Dashboard | Admin |
| GET | `/api/v1/ai/interactions` | Interaction History | Admin |
| POST | `/api/v1/ai/interactions/:id/feedback` | Submit Feedback | All |

All AI endpoints return **Server-Sent Events (SSE)** for streaming responses.

---

## 13. Vercel AI SDK Integration

```typescript
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

// In Next.js API Route (POST /api/v1/ai/symptom-analyzer)
export async function POST(req: Request) {
  const { symptoms } = await req.json();
  
  const result = await streamText({
    model: google('gemini-1.5-pro'),
    system: SYMPTOM_ANALYZER_SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: `My symptoms: ${symptoms}` }
    ],
    maxTokens: 1000,
    temperature: 0.3,  // Lower temperature for medical accuracy
  });
  
  // Log interaction (async)
  logAIInteraction('SYMPTOM_ANALYZER', symptoms, result);
  
  return result.toAIStreamResponse();
}
```

### Frontend (useChat Hook)

```typescript
import { useChat } from 'ai/react';

function SymptomAnalyzer() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/v1/ai/symptom-analyzer',
  });
  
  return (
    <div>
      {messages.map(m => (
        <div key={m.id} className={m.role === 'user' ? 'user' : 'ai'}>
          <ReactMarkdown>{m.content}</ReactMarkdown>
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <textarea value={input} onChange={handleInputChange} />
        <button type="submit" disabled={isLoading}>Analyze</button>
      </form>
    </div>
  );
}
```

---

## 14. Implementation Checklist

### Backend
- [ ] Set up Google Gemini API with Vercel AI SDK
- [ ] Enable pgvector extension for semantic search
- [ ] Implement Symptom Analyzer endpoint (streaming)
- [ ] Implement Record Summarizer with patient context injection
- [ ] Implement Prescription Explanation Bot (multi-turn)
- [ ] Implement Appointment Assistant with booking intent detection
- [ ] Implement Operations Dashboard with data context injection
- [ ] Implement EMR text extraction (pdf-parse) for RAG
- [ ] Implement embedding generation for EMR documents
- [ ] Implement AI interaction logging
- [ ] Implement AI rate limiting per user
- [ ] Implement AI cost monitoring
- [ ] Add Swagger docs for all AI endpoints

### Frontend
- [ ] Symptom Analyzer UI (booking page integration)
- [ ] Emergency alert UI for EMERGENCY urgency
- [ ] Record Summarizer card in consultation workspace
- [ ] Streaming markdown renderer
- [ ] Prescription chat widget
- [ ] Appointment Assistant chat widget with booking action
- [ ] Operations Dashboard chat panel
- [ ] Pre-suggested question chips
- [ ] AI feedback (thumbs up/down) on responses
- [ ] AI loading states with typing indicator
- [ ] Disclaimer banners on all AI features
