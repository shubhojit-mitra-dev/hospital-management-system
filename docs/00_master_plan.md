# AI-Powered Hospital Management System (HMS) — Master Execution Plan

> **Enterprise Edition** | Inspired by Apollo Hospitals, Fortis Healthcare, Max Healthcare

---

## 1. Project Vision

Build a centralized, AI-powered digital platform for modern hospitals to manage every aspect of their operations — from patient registration and appointments to billing, pharmacy, lab management, and AI-assisted clinical decisions. The system supports 10,000+ concurrent patients and maintains 99.9% uptime.

---

## 2. Tech Stack Decision

### Frontend
| Layer | Technology | Reason |
|---|---|---|
| Framework | **Next.js 14** (App Router) | SSR/SSG, file-based routing, API Routes, optimized performance |
| Language | **TypeScript** | Type safety, maintainability across a large codebase |
| State Management | **Zustand** | Lightweight, easy async, avoids Redux boilerplate |
| Server State | **TanStack Query (React Query v5)** | Caching, background sync, optimistic updates |
| UI Components | **shadcn/ui** + **Radix UI** | Accessible, unstyled primitives; fully customizable |
| Styling | **Tailwind CSS** | Utility-first, consistent design tokens |
| Forms | **React Hook Form** + **Zod** | Performant, schema-validated forms |
| Charts | **Recharts** | React-native charts for dashboards |
| Tables | **TanStack Table v8** | Powerful, virtualized data tables |
| Calendar | **FullCalendar.io** (React) | Feature-rich appointment calendar |
| Real-Time UI | **Socket.IO Client** | WebSocket for notifications, emergency alerts |
| Date/Time | **date-fns** | Lightweight, tree-shakeable date utils |
| PDF | **react-pdf / @react-pdf/renderer** | Invoice & report PDF generation |

### Backend
| Layer | Technology | Reason |
|---|---|---|
| Runtime | **Node.js 20 LTS** | Mature, high performance, vast ecosystem |
| Framework | **Express.js** (with TypeScript) | Lightweight, highly customizable REST API |
| Language | **TypeScript** | Shared types with frontend, safer APIs |
| ORM | **Prisma** | Type-safe queries, migrations, Prisma Studio |
| Real-Time | **Socket.IO** | WebSocket server for push notifications |
| Job Queue | **BullMQ** + **Redis** | Background jobs (email, reminders, report gen) |
| File Storage | **AWS S3** (or MinIO for local dev) | Store lab reports, MRI, X-Rays, prescriptions |
| Caching | **Redis** | Session cache, rate limiting, queue |
| Auth | **JWT** (access + refresh token pattern) | Stateless, scalable authentication |
| Validation | **Zod** | Runtime validation, shared with frontend |
| API Docs | **Swagger / OpenAPI 3.0** | Auto-generated REST API docs |

### Database
| Purpose | Technology | Reason |
|---|---|---|
| Primary DB | **PostgreSQL 16** | ACID compliance, complex relations, audit logs |
| Cache / Queue | **Redis 7** | Fast in-memory, BullMQ backend |
| Search | **PostgreSQL Full-Text Search** | Native FTS for patient/doctor search |

### AI Layer
| Feature | Technology | Reason |
|---|---|---|
| LLM Provider | **Google Gemini 1.5 Pro API** | Latest model, multimodal, cost-effective |
| AI SDK | **Vercel AI SDK** | Streaming responses, tool calling, React hooks |
| Embeddings | **Google text-embedding-004** | For semantic medical record search |
| Vector DB | **pgvector** (PostgreSQL extension) | Store embeddings alongside relational data |

### DevOps & Infrastructure
| Layer | Technology | Reason |
|---|---|---|
| Containerization | **Docker** + **Docker Compose** | Local dev parity, easy deployment |
| Orchestration | **Docker Compose** (dev) / **Kubernetes** (prod) | Scalable production deployment |
| CI/CD | **GitHub Actions** | Automated testing, linting, deployment |
| Monitoring | **Prometheus** + **Grafana** | Metrics, alerting, dashboards |
| Logging | **Winston** + **Loki** | Structured logging with Grafana Loki |
| Cloud | **AWS** (EC2, RDS, S3, ElastiCache, SES) | Production-ready managed services |
| Email | **AWS SES** / **Nodemailer** | Transactional emails (OTP, reminders) |
| SMS | **Twilio** | Appointment SMS reminders |

### Developer Tooling
| Tool | Purpose |
|---|---|
| **pnpm** | Fast, disk-efficient monorepo package manager |
| **Turborepo** | Monorepo build system with smart caching |
| **ESLint** + **Prettier** | Code quality and formatting |
| **Husky** + **lint-staged** | Pre-commit hooks |
| **Jest** + **Supertest** | Unit & integration testing (backend) |
| **Playwright** | End-to-end testing |
| **Prisma Studio** | Visual DB browser for development |
| **Swagger UI** | Interactive API documentation |

---

## 3. Monorepo Architecture

```
hospital-management-system/
├── apps/
│   ├── web/                    # Next.js Frontend (Patient + Staff portal)
│   └── api/                    # Express.js Backend (REST API)
├── packages/
│   ├── ui/                     # Shared shadcn/ui component library
│   ├── types/                  # Shared TypeScript types & Zod schemas
│   ├── config/                 # Shared ESLint, Tailwind, TS configs
│   └── ai/                     # AI SDK utilities & prompt templates
├── prisma/
│   ├── schema.prisma           # Single source of truth for DB schema
│   └── migrations/             # Prisma migration history
├── docs/                       # This folder — module execution plans
├── docker-compose.yml          # Local dev services (Postgres, Redis, MinIO)
├── turbo.json                  # Turborepo pipeline config
├── pnpm-workspace.yaml
└── package.json
```

---

## 4. Database Design Overview

### Core Tables
- `hospitals` — Multi-hospital support (Super Admin creates)
- `users` — All user accounts (polymorphic via `role` enum)
- `patients` — Patient profiles, linked to `users`
- `doctors` — Doctor profiles with specializations
- `staff` — Nurses, receptionists, lab techs, pharmacists, billing
- `departments` — Hospital departments
- `appointments` — Appointment scheduling
- `consultations` — Doctor consultation records
- `prescriptions` + `prescription_items` — Medicine prescriptions
- `emr_records` — Electronic medical records (files)
- `lab_orders` + `lab_results` — Lab test lifecycle
- `medicines` + `medicine_inventory` — Pharmacy stock
- `invoices` + `invoice_items` — Billing
- `payments` — Payment records
- `admissions` + `rooms` + `beds` — Inpatient management
- `emergency_cases` — Emergency workflow
- `notifications` — System notifications
- `audit_logs` — Complete audit trail
- `ai_interactions` — AI assistant session logs

### Key Design Patterns
- **Soft deletes** on all critical tables (`deleted_at` timestamp)
- **Audit columns** on every table (`created_at`, `updated_at`, `created_by`, `updated_by`)
- **Multi-tenancy** via `hospital_id` on every table
- **ULID** as primary keys (sortable, URL-safe, avoids UUID fragmentation)

---

## 5. API Architecture

- **REST API** following OpenAPI 3.0 specification
- **Base URL**: `/api/v1`
- **Authentication**: Bearer JWT in `Authorization` header
- **Rate Limiting**: Per-role, per-endpoint via Redis
- **Error Format**:
```json
{
  "success": false,
  "error": {
    "code": "APPOINTMENT_CONFLICT",
    "message": "The selected time slot is already booked",
    "details": {}
  }
}
```
- **Success Format**:
```json
{
  "success": true,
  "data": {},
  "meta": { "page": 1, "total": 100 }
}
```

---

## 6. Security Architecture

| Layer | Mechanism |
|---|---|
| Authentication | JWT access (15 min) + refresh token (7 days) in httpOnly cookie |
| Authorization | Role-Based Access Control (RBAC) middleware on every route |
| Password | bcrypt (cost factor 12) |
| Rate Limiting | Redis-backed, per IP + per user |
| Input Validation | Zod on all API inputs |
| SQL Injection | Prisma parameterized queries (no raw SQL unless necessary) |
| XSS | Next.js built-in + DOMPurify on rich text |
| CORS | Whitelist-only origins |
| File Uploads | Type + size validation; virus scan hook |
| Audit Logs | Every write operation logged to `audit_logs` table |
| HTTPS | Enforced via reverse proxy (Nginx/ALB) |

---

## 7. Module Index & Build Order

Build order follows dependency graph (auth first, then core data, then workflows):

| # | Module | Doc File | Depends On |
|---|---|---|---|
| 1 | Authentication & Authorization | `01_auth_module.md` | — |
| 2 | Hospital & Department Setup | `02_hospital_department_module.md` | Module 1 |
| 3 | Patient Management | `03_patient_management_module.md` | Module 1, 2 |
| 4 | Doctor & Staff Management | `04_doctor_staff_module.md` | Module 1, 2 |
| 5 | Appointment Management | `05_appointment_module.md` | Module 3, 4 |
| 6 | Doctor Consultation & EMR | `06_consultation_emr_module.md` | Module 5 |
| 7 | Laboratory Management | `07_laboratory_module.md` | Module 6 |
| 8 | Pharmacy Management | `08_pharmacy_module.md` | Module 6 |
| 9 | Billing & Payments | `09_billing_payments_module.md` | Module 7, 8 |
| 10 | Inpatient Admission Management | `10_inpatient_module.md` | Module 3, 4 |
| 11 | Emergency Management | `11_emergency_module.md` | Module 3, 4, 10 |
| 12 | Notifications System | `12_notifications_module.md` | All above |
| 13 | Reports & Analytics | `13_reports_analytics_module.md` | All above |
| 14 | AI Healthcare Assistant | `14_ai_assistant_module.md` | All above |

---

## 8. Non-Functional Requirements

| Requirement | Target | Implementation |
|---|---|---|
| Response Time | < 2 seconds | Redis caching, DB indexing, query optimization |
| Scalability | 10,000+ patients | Horizontal scaling via Docker/K8s, connection pooling |
| Availability | 99.9% uptime | Multi-AZ deployment, health checks, auto-restart |
| Security | Enterprise-grade | See Security Architecture section |
| Audit | 100% traceability | Every action logged with actor, timestamp, delta |

---

## 9. Development Phases

### Phase 1 — Foundation (Week 1–2)
- Monorepo setup with Turborepo + pnpm
- Docker Compose for local services
- Database schema design + Prisma setup
- Authentication module
- Hospital & Department setup

### Phase 2 — Core Clinical (Week 3–5)
- Patient Management
- Doctor & Staff Management
- Appointment Management
- Doctor Consultation & EMR

### Phase 3 — Clinical Operations (Week 6–8)
- Laboratory Management
- Pharmacy Management
- Billing & Payments
- Inpatient Admission

### Phase 4 — Advanced Features (Week 9–11)
- Emergency Management
- Notifications System
- Reports & Analytics Dashboard

### Phase 5 — AI Integration (Week 12–14)
- AI Symptom Analyzer
- AI Medical Record Summarizer
- AI Prescription Explanation Bot
- AI Appointment Assistant
- AI Operations Dashboard

### Phase 6 — Polish & Launch (Week 15–16)
- End-to-end testing (Playwright)
- Performance optimization
- Security audit
- Documentation
- Deployment to AWS

---

## 10. Environment Configuration

```env
# App
NODE_ENV=development
APP_URL=http://localhost:3000
API_URL=http://localhost:4000

# Database
DATABASE_URL=postgresql://hms_user:hms_pass@localhost:5432/hms_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=<secret>
JWT_REFRESH_SECRET=<secret>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AWS
AWS_REGION=ap-south-1
AWS_S3_BUCKET=hms-medical-files
AWS_SES_FROM=no-reply@hospital.com

# AI
GOOGLE_AI_API_KEY=<gemini-api-key>

# Twilio
TWILIO_ACCOUNT_SID=<sid>
TWILIO_AUTH_TOKEN=<token>
TWILIO_FROM_NUMBER=+1234567890
```
