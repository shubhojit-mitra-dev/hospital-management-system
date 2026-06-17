# Module 1: Authentication & Authorization

> **Build Order**: First — all other modules depend on this.
> **Estimated Effort**: 3–4 days

---

## 1. Module Overview

This module is the security foundation of the entire HMS. It handles:
- User registration (patients only via self-service; staff only via Hospital Admin)
- Login via email + password
- JWT-based stateless authentication with access + refresh token rotation
- Role-Based Access Control (RBAC) enforcement on every API endpoint
- Session management and secure logout
- Password reset via email OTP
- Audit logging for all auth events

Every other module's API routes are protected by the middleware built in this module.

---

## 2. Roles & Permissions Matrix

| Role | Code | Created By | Self-Register |
|---|---|---|---|
| Super Admin | `SUPER_ADMIN` | System seed | No |
| Hospital Admin | `HOSPITAL_ADMIN` | Super Admin | No |
| Doctor | `DOCTOR` | Hospital Admin | No |
| Nurse | `NURSE` | Hospital Admin | No |
| Receptionist | `RECEPTIONIST` | Hospital Admin | No |
| Lab Technician | `LAB_TECHNICIAN` | Hospital Admin | No |
| Pharmacist | `PHARMACIST` | Hospital Admin | No |
| Billing Executive | `BILLING_EXECUTIVE` | Hospital Admin | No |
| Patient | `PATIENT` | Self-register | Yes |

---

## 3. Database Schema

### `users` Table

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,           -- ULID
  hospital_id   TEXT REFERENCES hospitals(id),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL,              -- enum: roles above
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  phone         TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  is_verified   BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ                 -- soft delete
);
```

### `refresh_tokens` Table

```sql
CREATE TABLE refresh_tokens (
  id         TEXT PRIMARY KEY,              -- ULID
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,                 -- SHA-256 of the token
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `otp_codes` Table

```sql
CREATE TABLE otp_codes (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash  TEXT NOT NULL,                 -- SHA-256 of 6-digit OTP
  purpose    TEXT NOT NULL,                 -- 'EMAIL_VERIFY' | 'PASSWORD_RESET'
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `audit_logs` Table (shared across all modules)

```sql
CREATE TABLE audit_logs (
  id           TEXT PRIMARY KEY,
  hospital_id  TEXT REFERENCES hospitals(id),
  actor_id     TEXT REFERENCES users(id),
  actor_role   TEXT,
  action       TEXT NOT NULL,               -- e.g. 'USER_LOGIN', 'PATIENT_CREATED'
  entity_type  TEXT,                        -- e.g. 'user', 'appointment'
  entity_id    TEXT,
  description  TEXT,
  ip_address   TEXT,
  user_agent   TEXT,
  metadata     JSONB,                        -- any extra context
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. API Endpoints

### Base Path: `/api/v1/auth`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/register` | Public | Patient self-registration |
| POST | `/login` | Public | Login for all roles |
| POST | `/logout` | Authenticated | Revoke refresh token |
| POST | `/refresh` | Public (refresh token in cookie) | Get new access token |
| POST | `/forgot-password` | Public | Send OTP to email |
| POST | `/reset-password` | Public | Reset password using OTP |
| POST | `/verify-email` | Public | Verify email using OTP |
| GET | `/me` | Authenticated | Get current user profile |
| PATCH | `/me/password` | Authenticated | Change own password |

### Admin-Only Endpoints: `/api/v1/admin/users`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Hospital Admin, Super Admin | Create staff accounts |
| GET | `/` | Hospital Admin, Super Admin | List all staff for hospital |
| GET | `/:id` | Hospital Admin, Super Admin | Get staff member details |
| PATCH | `/:id` | Hospital Admin, Super Admin | Update staff details |
| PATCH | `/:id/activate` | Hospital Admin, Super Admin | Activate/deactivate account |
| DELETE | `/:id` | Hospital Admin, Super Admin | Soft delete staff account |

---

## 5. Request / Response Contracts

### POST `/api/v1/auth/register`

**Request Body:**
```json
{
  "firstName": "Rahul",
  "lastName": "Sharma",
  "email": "rahul@example.com",
  "password": "Str0ng@Pass!",
  "phone": "+919876543210",
  "hospitalId": "01HXY..."
}
```

**Password rules (Zod schema):**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 digit
- At least 1 special character (`@$!%*?&`)

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "message": "Registration successful. Please verify your email.",
    "userId": "01HXY..."
  }
}
```

**Error Responses:**
- `409` — Email already registered
- `422` — Validation error with field-level messages
- `400` — Invalid hospitalId

---

### POST `/api/v1/auth/login`

**Request Body:**
```json
{
  "email": "doctor@hospital.com",
  "password": "Str0ng@Pass!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI...",
    "user": {
      "id": "01HXY...",
      "email": "doctor@hospital.com",
      "role": "DOCTOR",
      "firstName": "Dr. Arun",
      "lastName": "Mehta",
      "hospitalId": "01HXY..."
    }
  }
}
```

> **Note:** Refresh token is set as an `httpOnly`, `Secure`, `SameSite=Strict` cookie — never in the response body.

**Error Responses:**
- `401` — Invalid credentials
- `403` — Account deactivated
- `403` — Email not verified
- `429` — Too many failed attempts (rate limited)

---

### POST `/api/v1/auth/refresh`

**Cookie:** `refresh_token=<token>`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI..."
  }
}
```

---

## 6. JWT Token Design

### Access Token Payload
```json
{
  "sub": "01HXY...",
  "email": "doctor@hospital.com",
  "role": "DOCTOR",
  "hospitalId": "01HXY...",
  "iat": 1700000000,
  "exp": 1700000900
}
```

- Algorithm: `HS256` (use `RS256` for production multi-service environments)
- Access token TTL: **15 minutes**
- Refresh token TTL: **7 days**

### Token Rotation Strategy
1. Client sends refresh token cookie to `/auth/refresh`
2. Server validates: token exists, not expired, not revoked
3. Server issues new access token + **new refresh token** (old one revoked)
4. If refresh token is used after revocation → revoke entire family (breach detection)

---

## 7. RBAC Middleware

### `authenticate` Middleware
```typescript
// Verifies JWT in Authorization header
// Attaches req.user = { id, email, role, hospitalId }
// Returns 401 if token missing or invalid
```

### `authorize(...roles)` Middleware
```typescript
// Usage: router.get('/patients', authenticate, authorize('DOCTOR', 'NURSE'), handler)
// Returns 403 if user role not in allowed list
```

### `requireHospital` Middleware
```typescript
// Ensures the resource being accessed belongs to the user's hospitalId
// Prevents cross-hospital data access
```

### `requireSelf` Middleware
```typescript
// For routes like PATCH /me — ensures user can only edit their own profile
```

---

## 8. Password Reset Flow

```
1. User submits email to POST /auth/forgot-password
2. System generates 6-digit OTP, hashes it (SHA-256), stores in otp_codes
3. OTP sent via email (AWS SES) — expires in 15 minutes
4. User submits OTP + new password to POST /auth/reset-password
5. System verifies OTP hash, checks expiry, marks as used
6. Password updated, all existing refresh tokens revoked
7. Audit log entry created
```

---

## 9. Email Verification Flow

```
1. After registration, system generates OTP → sends to email
2. User submits OTP to POST /auth/verify-email
3. is_verified = true set on users table
4. User can now login
```

---

## 10. Rate Limiting Rules

| Endpoint | Limit | Window |
|---|---|---|
| POST /login | 5 attempts | 15 minutes per IP |
| POST /forgot-password | 3 attempts | 1 hour per IP |
| POST /register | 10 attempts | 1 hour per IP |
| All other auth endpoints | 30 requests | 1 minute per IP |

Implementation: **express-rate-limit** + **rate-limit-redis** store.

---

## 11. Security Checklist

- [x] Passwords hashed with **bcrypt** (cost factor 12)
- [x] Refresh tokens stored as **SHA-256 hash** (not plaintext)
- [x] OTP codes stored as **SHA-256 hash**
- [x] Access tokens expire in **15 minutes**
- [x] Refresh tokens rotated on every use
- [x] Compromised refresh token → full session family revocation
- [x] httpOnly + Secure + SameSite=Strict cookies
- [x] CORS whitelist only
- [x] Audit log on every login/logout/failure
- [x] Brute force protection via rate limiting
- [x] Inactive accounts blocked from login

---

## 12. Frontend Pages & Components

### Pages (Next.js App Router)

| Route | Component | Description |
|---|---|---|
| `/login` | `LoginPage` | Email + password login form |
| `/register` | `RegisterPage` | Patient self-registration (multi-step) |
| `/forgot-password` | `ForgotPasswordPage` | Enter email to receive OTP |
| `/reset-password` | `ResetPasswordPage` | Enter OTP + new password |
| `/verify-email` | `VerifyEmailPage` | Enter OTP to verify email |

### Global Auth State (Zustand Store)
```typescript
interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (credentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  setUser: (user: User) => void;
}
```

### Axios Interceptor
- Attach `Authorization: Bearer <accessToken>` to every request
- On 401 → automatically call `/auth/refresh` → retry original request
- On refresh failure → redirect to `/login`

### Protected Route Wrapper
```typescript
// <ProtectedRoute roles={['DOCTOR', 'NURSE']}>
//   <ConsultationPage />
// </ProtectedRoute>
// Redirects to /login if not authenticated
// Shows 403 page if wrong role
```

---

## 13. Staff Account Creation by Admin

When Hospital Admin creates a staff account:
1. Admin fills form: name, email, role, department assignment
2. System creates user with temporary password
3. System sends welcome email with login credentials + forced password change on first login
4. `force_password_change` flag set on users table
5. On first login, user is redirected to change password before accessing any feature

---

## 14. Audit Events to Log

| Event | Trigger |
|---|---|
| `USER_REGISTERED` | Patient self-registers |
| `USER_LOGIN_SUCCESS` | Successful login |
| `USER_LOGIN_FAILED` | Failed login attempt |
| `USER_LOGOUT` | User logs out |
| `TOKEN_REFRESHED` | Access token refreshed |
| `PASSWORD_RESET_REQUESTED` | Forgot password submitted |
| `PASSWORD_RESET_COMPLETED` | Password reset successful |
| `EMAIL_VERIFIED` | Email OTP verified |
| `STAFF_ACCOUNT_CREATED` | Admin creates staff account |
| `STAFF_ACCOUNT_DEACTIVATED` | Admin deactivates account |
| `SUSPICIOUS_TOKEN_USE` | Revoked refresh token reused |

---

## 15. Implementation Checklist

### Backend
- [ ] Initialize Express app with TypeScript
- [ ] Set up Prisma schema with `users`, `refresh_tokens`, `otp_codes`, `audit_logs`
- [ ] Implement `authenticate` middleware
- [ ] Implement `authorize` RBAC middleware
- [ ] Implement registration endpoint with Zod validation
- [ ] Implement login endpoint with bcrypt comparison
- [ ] Implement JWT access + refresh token issuance
- [ ] Implement refresh token rotation endpoint
- [ ] Implement logout with token revocation
- [ ] Implement forgot/reset password OTP flow
- [ ] Implement email verification OTP flow
- [ ] Set up rate limiting with Redis
- [ ] Write audit log service
- [ ] Write email service (AWS SES / Nodemailer)
- [ ] Write unit tests for all auth flows
- [ ] Add Swagger documentation for all endpoints

### Frontend
- [ ] Create Login page with form validation
- [ ] Create Register page (multi-step for patient)
- [ ] Create Forgot Password page
- [ ] Create Reset Password page with OTP input
- [ ] Create Verify Email page
- [ ] Set up Zustand auth store
- [ ] Set up Axios interceptor with token refresh
- [ ] Create `ProtectedRoute` component
- [ ] Create `RoleGate` component for conditional rendering
- [ ] Test all auth flows end-to-end
