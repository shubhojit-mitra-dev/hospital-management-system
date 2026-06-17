# Technical Implementation Plan: Module 1 — Authentication & Authorization

This document outlines the architecture, database schema, API design, security mechanics, and frontend flow for **Module 1: Authentication & Authorization (JWT + RBAC)**. 

---

## User Review Required

> [!IMPORTANT]
> **Database Key Choice (ULID)**
> We are using **ULID** (Universally Unique Lexicographically Sortable Identifier) for primary keys. ULIDs are 128-bit sortable identifiers that prevent indexing fragmentation in PostgreSQL, unlike random UUIDv4. We will generate ULIDs in the application layer (e.g., using a JS helper library).
>
> **Token Storage Strategy**
> Access tokens are returned in the response body. Refresh tokens are stored in an `httpOnly`, `Secure`, `SameSite=Strict` cookie to protect them from XSS. Refresh token rotation is enforced, and any reuse of a revoked refresh token will trigger breach detection (revoking the entire token family/all active sessions for the user).

---

## Open Questions

No blocker open questions. We will use `nodemailer` configured for a local SMTP server (such as `Maildev` or console logs in dev) for transactional email flows (OTP email verification/password reset), which is easily configurable for AWS SES in production.

---

## Proposed Changes

### Component 1: Monorepo & Infrastructure Setup

#### [NEW] [docker-compose.yml](file:///home/blackknight05/Desktop/hospital-management-system/docker-compose.yml)
Define local services:
- **PostgreSQL 16**: Primary relational database.
- **Redis 7**: For rate-limiting store, session cache, and BullMQ queue backend.
- **Maildev** (or console logger): Local SMTP sandbox for previewing sent emails (activation, password reset).

#### [NEW] [schema.prisma](file:///home/blackknight05/Desktop/hospital-management-system/prisma/schema.prisma)
Create the database schema including:
- `Hospital`: Multi-tenant foundation (required for foreign keys in Module 1).
- `User`: Storing profile, password hash, role (`SUPER_ADMIN`, `HOSPITAL_ADMIN`, `DOCTOR`, `NURSE`, `RECEPTIONIST`, `LAB_TECHNICIAN`, `PHARMACIST`, `BILLING_EXECUTIVE`, `PATIENT`), active states, and verification flags.
- `RefreshToken`: Storing token family lineage via cryptographically hashed tokens, expiration, and user agent info.
- `OtpCode`: Storing hashes of 6-digit OTP codes for email verification and password reset.
- `AuditLog`: General logging for authentication events (`USER_LOGIN_SUCCESS`, `USER_LOGIN_FAILED`, etc.) and system mutations.

#### [MODIFY] [pnpm-workspace.yaml](file:///home/blackknight05/Desktop/hospital-management-system/pnpm-workspace.yaml)
Ensure `apps/*` and `packages/*` are registered.

---

### Component 2: Shared Schema & Types Package

#### [NEW] [packages/types](file:///home/blackknight05/Desktop/hospital-management-system/packages/types)
Create a shared package containing:
- TypeScript type definitions for JWT payloads, Auth state, and User objects.
- Zod schemas for request validation (Register, Login, Password Reset, Password Change). These schemas will be imported in both the frontend (Next.js) and the backend (Express).

---

### Component 3: Express Backend API (`apps/api`)

#### [NEW] [apps/api](file:///home/blackknight05/Desktop/hospital-management-system/apps/api)
Create the Express backend REST API using TypeScript.
- **Core Server Config**: Configure CORS, security headers via `helmet`, request logging via `morgan`, cookie parser, and standard body parsing.
- **Database Helper**: Simple wrapper over Prisma Client with automatic connection pooling and soft-delete middleware.
- **Security Middlewares**:
  - `authenticate`: Validates access token JWT in `Authorization` header. Attaches `req.user`.
  - `authorize(...roles)`: Verifies role-based permissions (RBAC).
  - `requireHospital`: Ensures staff user can only access resources matching their `hospitalId`.
  - `requireSelf`: Ensures user can only change their own profile.
  - **Rate Limiting**: Enforce specific limits per route using `express-rate-limit` (and `rate-limit-redis`).
- **Auth Routes (`/api/v1/auth`)**:
  - `POST /register`: Zod-validated registration for patients.
  - `POST /login`: Credential validation, issues tokens, returns cookie.
  - `POST /logout`: Revokes token, clears cookie.
  - `POST /refresh`: Rotates refresh token, issues new tokens.
  - `POST /forgot-password` & `POST /reset-password`: OTP verification flows.
  - `POST /verify-email`: Validates registration OTP.
  - `GET /me`: Returns own profile details.
  - `PATCH /me/password`: Own password rotation.
- **Admin Staff Routes (`/api/v1/admin/users`)**:
  - `POST /`: Hospital Admin creates a staff member (generates temp password, sends credentials).
  - `GET /`: List staff members belonging to same hospital (paginated).
  - `GET /:id` / `PATCH /:id`: View and update staff details.
  - `PATCH /:id/activate`: Toggle user status.
  - `DELETE /:id`: Soft delete staff user (setting `deletedAt`).

---

### Component 4: Next.js Frontend Auth Setup (`apps/web`)

#### [MODIFY] [apps/web/package.json](file:///home/blackknight05/Desktop/hospital-management-system/apps/web/package.json)
Install Zustand, Axios, Zod, React Hook Form, Tailwind components, and any other required UI libraries.

#### [NEW] Zustand Store & Axios Interceptor
- **Zustand Auth Store**: Manage authenticated state, access token, current user metadata, and handle logout redirection.
- **Axios client**: Setup interceptor to attach bearer token. Automatically handle `401 Unauthorized` by invoking `/auth/refresh` to refresh the access token silently in the background, retrying the original request. Redirect to `/login` if token refresh fails.

#### [NEW] Auth Components & Pages
- **Middleware / Protectors**:
  - `ProtectedRoute`: Wraps pages, redirecting unauthenticated users to `/login`.
  - `RoleGate`: Conditionally renders elements based on user roles.
- **Pages**:
  - `LoginPage` (`/login`): Minimalistic, premium form utilizing clean typography and glassmorphic inputs.
  - `RegisterPage` (`/register`): Multi-step clean wizard for patient registration.
  - `ForgotPasswordPage` (`/forgot-password`) & `ResetPasswordPage` (`/reset-password`): Secure password reset form with OTP fields.
  - `VerifyEmailPage` (`/verify-email`): Clean view prompting for OTP code.

---

## Verification Plan

### Automated Tests
We will write a comprehensive unit and integration test suite using **Jest** and **Supertest** to cover:
1. Registration & Zod schema validation (correct format, password requirements).
2. Login validation, token issuance, and HTTP-only cookie parameters.
3. Refresh token rotation, revocation, and breach detection (re-using a revoked token).
4. RBAC Authorization middleware behavior (Super Admin vs. Patient vs. Doctor).
5. Staff account creation, temporary password generation, and activation/deactivation.
6. Rate limiting blocks on multiple failed login attempts.

### Manual Verification
1. Run `docker-compose up` to boot services.
2. Run migrations `npx prisma migrate dev`.
3. Run the database seeding command (`npm run db:seed`) to create default hospitals and Super Admin/Hospital Admin users.
4. Execute `npm run dev` to launch the dev servers for backend and frontend.
5. Manually register a patient, verify email with OTP, log in, perform logout, and trigger password reset flows in a web browser.
6. Admin dashboard check: Log in as Hospital Admin, create a staff user (Doctor), verify doctor login requires forced password change on first access (if applicable).
