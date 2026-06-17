# Module 2 Verification & Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the build-breaking `@repo/types` import, verify the entire workspace builds and tests pass, and perform verification of the DB seeding, permissions matrix, and frontend-backend flows for Module 2.

**Architecture:** Use monorepo dependency references correctly. The `@repo/types` package imports must not use `.js` extension when referenced from Next.js/Turbopack via typescript source entries. Ensure Express castings are handled cleanly without generic type bypasses.

**Tech Stack:** Next.js 16 (Turbopack), Node 22, Express, Prisma, Vitest, Turborepo.

## Global Constraints
- Do not use generic types or hardcode bypass checks.
- Adhere to the clean-designed UI system without placeholders.
- Treat this as a Turborepo — run commands scoped to packages where appropriate.

---

### Task 1: Fix Type Imports in `@repo/types`

**Files:**
- Modify: [index.ts](file:///home/blackknight05/Desktop/hospital-management-system/packages/types/src/index.ts)

**Interfaces:**
- Consumes: `packages/types/src/permissions.ts`
- Produces: Correctly exported `Permission` and `RolePermissions` types without extension suffix errors.

- [ ] **Step 1: Modify packages/types/src/index.ts to use extension-less relative import**
  Change:
  ```typescript
  export * from './permissions.js';
  ```
  To:
  ```typescript
  export * from './permissions';
  ```

- [ ] **Step 2: Run typecheck to verify typescript is happy**
  Run: `pnpm run check-types`
  Expected: Command succeeds with no typescript compiler errors.

---

### Task 2: Verify and Run Backend/Frontend Test Suites

**Files:**
- Test: All backend and frontend test suites (`apps/api` and `apps/web`)

- [ ] **Step 1: Run Vitest tests for the API**
  Run: `pnpm --filter api test run`
  Expected: All 26 test suites compile and pass.

- [ ] **Step 2: Run Vitest tests for the Web app**
  Run: `pnpm --filter web test run`
  Expected: All 34 test suites compile and pass.

---

### Task 3: Database Seeding & Production Build Validation

**Files:**
- Verify: Database seed and complete project build.

- [ ] **Step 1: Check Database seeding status**
  Run: `pnpm --filter api exec prisma db seed` or `pnpm --filter api seed`
  Expected: Seed runs successfully, generating the default `SUPER_ADMIN` (`admin@hms.com` / `Password@123`).

- [ ] **Step 2: Run production Turborepo build**
  Run: `pnpm run build`
  Expected: Full build completes successfully across all apps and packages.

---

### Task 4: Flow Verification (Manual Verification Instructions)

- [ ] **Step 1: Start dev server**
  Run: `pnpm run dev` in a terminal.
- [ ] **Step 2: Check Super Admin Login**
  - Navigate to login page.
  - Log in with `admin@hms.com` / `Password@123`.
  - Verify redirection to Super Admin Dashboard at `/super-admin/hospitals`.
- [ ] **Step 3: Create Hospital**
  - Create a new hospital and admin (e.g. `Hospital: City Hospital`, `Admin: admin@cityhosp.com`).
  - Verify Welcome email simulated output.
- [ ] **Step 4: Verify Hospital Admin forced reset**
  - Attempt login with `admin@cityhosp.com`.
  - Verify redirection to `/reset-password` page is enforced, and other navigation is blocked.
  - Set a new password.
  - Verify access is then permitted to `/admin/departments` and `/admin/settings`.
