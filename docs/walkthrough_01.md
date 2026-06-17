# Authentication and Axios Interceptors Implementation Walkthrough

We have configured the Next.js frontend application (`apps/web`) to support authenticated state, Axios client token injection and token refresh interceptors, and route protection guards.

## Changes Made

### 1. Project Dependencies Setup
- Updated [package.json](file:///home/blackknight05/.gemini/antigravity/brain/ed67b49a-b3c3-40f2-a559-33d6cfbdd01a/.system_generated/worktrees/subagent-Next-js-Frontend-Engineer-engineering-agent-0bb6c524/apps/web/package.json) to add required runtime libraries: `zustand`, `axios`, `lucide-react`, `zod`, `react-hook-form`, and `@hookform/resolvers`.
- Configured testing dependencies `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, and `@testing-library/jest-dom` under devDependencies.
- Created [vitest.config.ts](file:///home/blackknight05/.gemini/antigravity/brain/ed67b49a-b3c3-40f2-a559-33d6cfbdd01a/.system_generated/worktrees/subagent-Next-js-Frontend-Engineer-engineering-agent-0bb6c524/apps/web/vitest.config.ts) configured with the `jsdom` testing environment.

### 2. Zustand Auth Store
- Implemented the global state store in [authStore.ts](file:///home/blackknight05/.gemini/antigravity/brain/ed67b49a-b3c3-40f2-a559-33d6cfbdd01a/.system_generated/worktrees/subagent-Next-js-Frontend-Engineer-engineering-agent-0bb6c524/apps/web/store/authStore.ts) managing:
  - `user` profile data (id, email, role, names, hospitalId)
  - `accessToken`
  - `isAuthenticated` state
  - `login`, `logout`, and `refresh` token actions.
- Covered with 4 unit tests in [authStore.test.ts](file:///home/blackknight05/.gemini/antigravity/brain/ed67b49a-b3c3-40f2-a559-33d6cfbdd01a/.system_generated/worktrees/subagent-Next-js-Frontend-Engineer-engineering-agent-0bb6c524/apps/web/store/authStore.test.ts).

### 3. Axios Interceptor Client
- Configured Axios client in [axios.ts](file:///home/blackknight05/.gemini/antigravity/brain/ed67b49a-b3c3-40f2-a559-33d6cfbdd01a/.system_generated/worktrees/subagent-Next-js-Frontend-Engineer-engineering-agent-0bb6c524/apps/web/lib/axios.ts) to:
  - Add request interceptor to inject `Authorization: Bearer <accessToken>` if present in store.
  - Add response interceptor to intercept `401 Unauthorized` responses.
  - Perform automatic token refresh using a separate Axios instance (`refreshInstance`) hitting POST `/api/v1/auth/refresh`.
  - Update store, update original request authorization header, and retry original request.
  - On refresh failure: log out the user, redirect to `/login` via `window.location.href`, and reject the promise.
- Covered with 4 unit tests in [axios.test.ts](file:///home/blackknight05/.gemini/antigravity/brain/ed67b49a-b3c3-40f2-a559-33d6cfbdd01a/.system_generated/worktrees/subagent-Next-js-Frontend-Engineer-engineering-agent-0bb6c524/apps/web/lib/axios.test.ts).

### 4. Router Protection Guards
- Created [ProtectedRoute.tsx](file:///home/blackknight05/.gemini/antigravity/brain/ed67b49a-b3c3-40f2-a559-33d6cfbdd01a/.system_generated/worktrees/subagent-Next-js-Frontend-Engineer-engineering-agent-0bb6c524/apps/web/components/auth/ProtectedRoute.tsx) to protect pages from unauthenticated access, with optional check for roles and redirecting to `/login` or `/unauthorized`.
- Created [RoleGate.tsx](file:///home/blackknight05/.gemini/antigravity/brain/ed67b49a-b3c3-40f2-a559-33d6cfbdd01a/.system_generated/worktrees/subagent-Next-js-Frontend-Engineer-engineering-agent-0bb6c524/apps/web/components/auth/RoleGate.tsx) to conditionally render components or fallbacks based on authorized user roles.
- Covered with unit tests in [ProtectedRoute.test.tsx](file:///home/blackknight05/.gemini/antigravity/brain/ed67b49a-b3c3-40f2-a559-33d6cfbdd01a/.system_generated/worktrees/subagent-Next-js-Frontend-Engineer-engineering-agent-0bb6c524/apps/web/components/auth/ProtectedRoute.test.tsx) and [RoleGate.test.tsx](file:///home/blackknight05/.gemini/antigravity/brain/ed67b49a-b3c3-40f2-a559-33d6cfbdd01a/.system_generated/worktrees/subagent-Next-js-Frontend-Engineer-engineering-agent-0bb6c524/apps/web/components/auth/RoleGate.test.tsx).

---

## Verification Results

### 1. Automated Unit Tests
Executed the test suite inside the `apps/web` package:
```bash
pnpm --filter web test
```
Result: **All 16 unit tests passed successfully**.
- `authStore.test.ts`: 4/4 passed.
- `axios.test.ts`: 4/4 passed.
- `ProtectedRoute.test.tsx`: 4/4 passed.
- `RoleGate.test.tsx`: 4/4 passed.

### 2. TypeScript Type Check
Executed the workspace check-types script:
```bash
pnpm --filter web check-types
```
Result: **Types generated and verified successfully without errors**.

