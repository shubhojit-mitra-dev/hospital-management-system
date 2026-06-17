# Walkthrough — Module 1: Authentication & Authorization

All implementation tasks for **Module 1: Authentication & Authorization** have been completed, merged into `main`, and fully verified. 

## Summary of Accomplishments

### 1. Backend Infrastructure & Database
- Created a PostgreSQL database schema using Prisma, establishing robust models for:
  - `hospitals` (multi-tenant structure)
  - `users` (with password credentials, status indicators, and roles)
  - `refresh_tokens` (for session rotation)
  - `otp_codes` (for registration & password resets)
  - `audit_logs` (capturing all security-critical operations)
  - `departments` (hospital division mapping)
- Set up Docker Compose for local development containing PostgreSQL, Redis (sessions & rate-limiting), and Maildev (local SMTP mock).
- Implemented a database seed script to initialize Superadmin, Hospital Admin, and Doctor records.

### 2. Express Backend API (`apps/api`)
- Configured Express with standard security middleware (Helmet, CORS, Cookie Parser).
- Implemented core services:
  - `JwtService`: Handles signing/verification for short-lived access tokens (HS256) and refresh tokens.
  - `EmailService`: Sends verification OTPs and password reset links via Maildev.
  - `AuditService`: Automatically logs logins, signups, password changes, and admin operations.
- Developed the following controllers and routes under `/api/v1/auth/`:
  - `/register` (Patient self-signup with OTP generation)
  - `/login` (Credential check, JWT issue, secure HttpOnly cookie storage)
  - `/logout` (Revocation of session tokens)
  - `/refresh` (Silent token refresh with rotation validation and reuse detection)
  - `/forgot-password` / `/reset-password` (OTP verification and password updates)
  - `/verify-email` (OTP account validation)
  - `/me` & `/me/password` (Active profile details and secure password change)
- Developed Staff Management controllers and routes under `/api/v1/admin/users/` (accessible only to authorized roles) to create and manage hospital staff.
- Implemented middleware for rate-limiting (using `rate-limit-redis`) and role gates.

### 3. Next.js Frontend (`apps/web`)
- Installed and set up Tailwind CSS v4, custom premium styling (`globals.css`), and the Outfit/Geist fonts.
- Built a global authentication state store using `Zustand` (`authStore.ts`).
- Configured an Axios client (`axios.ts`) with request/response interceptors to:
  - Inject the active Bearer token in headers.
  - Quietly handle 401 Unauthorized responses by fetching a new access token via `/api/v1/auth/refresh` and retrying the request.
  - Redirect to `/login` if session refresh fails.
- Created routing guards (`ProtectedRoute.tsx` and `RoleGate.tsx`).
- Created five beautiful, responsive pages with form validations via React Hook Form and Zod:
  - `/login`: Sleek glassmorphism login.
  - `/register`: Multi-step wizard to guide patient signup.
  - `/forgot-password`: Email entry page for password reset requests.
  - `/reset-password`: Form to enter new password and OTP code.
  - `/verify-email`: Verification code entry screen.

---

## Verification & Test Results

### 1. Backend API Tests
Running the backend test suite:
```bash
pnpm --filter api test
```
**Result**: All **15/15 tests passed** successfully.
- Tests cover JWT generation, environment parsing, rate limiting, and all registration/login/verification flow integration.

### 2. Frontend Web Tests
Running the frontend test suite:
```bash
pnpm --filter web test
```
**Result**: All **33/33 tests passed** successfully.
- Tests cover Zustand auth state management, silent token refresh interceptors, routing gates, and validation behaviors on login/register/reset forms.

### 3. Type Checking
Running the type checker:
```bash
pnpm run check-types
```
**Result**: Workspace checks completed with **0 errors**.
