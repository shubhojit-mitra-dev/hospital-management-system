# Hospital Management System — Skills Map
> Skills sourced from [skills.sh](https://skills.sh) — install with `npx skills add <owner/repo/skill-name>`

---

## 🗂️ Available Skills Reference

Before diving into per-module recommendations, here is every relevant skill found on skills.sh:

### Frontend & React
| Install Command | What it does |
|---|---|
| `npx skills add vercel-labs/agent-skills/vercel-react-best-practices` | 69 prioritized React performance rules: waterfalls, bundle size, re-renders, and advanced patterns |
| `npx skills add vercel-labs/agent-skills/vercel-composition-patterns` | Compound components, render props, and context patterns for scalable component APIs |
| `npx skills add shadcn/ui/shadcn` | shadcn/ui component usage, customization, and Tailwind integration |
| `npx skills add wshobson/agents/typescript-advanced-types` | Discriminated unions, conditional types, template literals, and utility type patterns |
| `npx skills add wshobson/agents/tailwind-design-system` | Design system implementation with Tailwind: tokens, variants, and component patterns |
| `npx skills add anthropics/skills/frontend-design` | Frontend design best practices — the #2 most installed skill on skills.sh |

### Next.js
| Install Command | What it does |
|---|---|
| `npx skills add vercel-labs/agent-skills/vercel-react-best-practices` | Also covers Next.js App Router patterns and Server Components |
| `npx skills add vercel-labs/next-skills/next-best-practices` | **Next.js specific** — file conventions, RSC boundaries, data patterns, async APIs, metadata |
| `npx skills add vercel-labs/next-skills/next-cache-components` | PPR, `use cache` directive, cacheLife, cacheTag, and revalidateTag |
| `npx skills add vercel/turborepo/turborepo` | Turborepo task pipelines, caching, remote cache, and CI configuration |
| `npx skills add vercel/ai/ai-sdk` | Vercel AI SDK: generateText, streamText, tool calling, and useChat |
| `npx skills add vercel-labs/agent-browser/agent-browser` | Browser automation for testing and UI verification |

### Databases
| Install Command | What it does |
|---|---|
| `npx skills add supabase/agent-skills/supabase-postgres-best-practices` | Postgres patterns: schema design, RLS, indexing, and query performance |
| `npx skills add bobmatnyc/claude-mpm-skills/drizzle-orm` | Drizzle ORM: type-safe schemas, migrations, and queries |
| `npx skills add neondatabase/agent-skills/neon-postgres` | Neon-specific: branching workflow, serverless driver, connection pooling |

### Testing
| Install Command | What it does |
|---|---|
| `npx skills add obra/superpowers/test-driven-development` | TDD loop: write failing test first, implement minimal change, verify, refactor |
| `npx skills add anthropics/skills/webapp-testing` | Web app testing: unit, integration, and end-to-end approaches |
| `npx skills add obra/superpowers/verification-before-completion` | Force a verification pass before any task is marked done |
| `npx skills add currents-dev/playwright-best-practices-skill/playwright-best-practices` | Playwright: selectors, fixtures, parallelism, CI integration |
| `npx skills add microsoft/playwright-cli/playwright-cli` | Control a live browser via Playwright CLI — record, inspect, replay |

### Agent Workflows (Meta-skills for building this project)
| Install Command | What it does |
|---|---|
| `npx skills add vercel-labs/skills/find-skills` | **#1 most-installed** — helps discover and install relevant skills |
| `npx skills add obra/superpowers/writing-plans` | Write structured implementation plans before starting complex tasks |
| `npx skills add obra/superpowers/executing-plans` | Execute a plan step-by-step with checkpoints at each stage |
| `npx skills add obra/superpowers/verification-before-completion` | Force verification pass before marking any task done |
| `npx skills add obra/superpowers/test-driven-development` | TDD discipline for agents |
| `npx skills add obra/superpowers/systematic-debugging` | Hypothesis-driven debugging loop: observe, hypothesize, test, verify |
| `npx skills add obra/superpowers/requesting-code-review` | Self-review, test coverage, and PR description prep |
| `npx skills add obra/superpowers/dispatching-parallel-agents` | Split work across parallel subagents and coordinate outputs |
| `npx skills add obra/superpowers/using-git-worktrees` | Use git worktrees to run parallel agent sessions on separate branches |
| `npx skills add obra/superpowers/finishing-a-development-branch` | Branch close checklist: tests, commit, PR, and review request |
| `npx skills add obra/superpowers/subagent-driven-development` | Orchestrate specialized subagents for different parts of a task |

---

## 📦 Module-by-Module Skills Mapping

### Module 00 — Project Setup & Master Plan
**Tech involved:** Turborepo, TypeScript, pnpm, project structure

```bash
npx skills add wshobson/agents/typescript-advanced-types
npx skills add supabase/agent-skills/supabase-postgres-best-practices
npx skills add vercel/turborepo/turborepo
npx skills add obra/superpowers/writing-plans
npx skills add obra/superpowers/verification-before-completion
```

**Why:**
- `typescript-advanced-types` → Sets up strong type foundations from day one (shared types, utility types, Zod schemas)
- `supabase-postgres-best-practices` → Postgres schema design principles apply from the first migration
- `turborepo` → The entire project is a Turborepo monorepo — this skill teaches correct `turbo.json` pipeline design, remote caching, and package task ordering
- `writing-plans` → Every module starts with a structured implementation plan
- `verification-before-completion` → Agent must verify builds pass and types compile before completing any task

---

### Module 01 — Authentication & Authorization (JWT + RBAC)
**Tech involved:** JWT, bcrypt, Redis sessions, RBAC middleware, Prisma

```bash
npx skills add supabase/agent-skills/supabase-postgres-best-practices
npx skills add wshobson/agents/typescript-advanced-types
npx skills add anthropics/skills/webapp-testing
npx skills add obra/superpowers/test-driven-development
```

**Why:**
- `supabase-postgres-best-practices` → Teaches Row-Level Security (RLS) and role-scoped query patterns that are directly applicable to JWT+RBAC implementations in any Postgres setup
- `typescript-advanced-types` → RBAC roles, permission sets, and JWT payload types all benefit from discriminated unions and conditional types
- `webapp-testing` → Auth is the most security-critical module — every middleware and token flow needs test coverage
- `test-driven-development` → Write the "invalid token should return 401" test BEFORE implementing the middleware

---

### Module 02 — Hospital & Department Setup (Multi-tenant)
**Tech involved:** Prisma (multi-tenant schemas), PostgreSQL, Express middleware

```bash
npx skills add supabase/agent-skills/supabase-postgres-best-practices
npx skills add bobmatnyc/claude-mpm-skills/drizzle-orm
npx skills add wshobson/agents/typescript-advanced-types
```

**Why:**
- `supabase-postgres-best-practices` → Multi-tenant schema isolation patterns (hospital_id scoping), indexing strategies, and migration safety all covered here
- `drizzle-orm` → Type-safe schema definition for multi-tenant tables with TypeScript inference end-to-end
- `typescript-advanced-types` → Tenant-aware generic types and middleware typing patterns

---

### Module 03 — Patient Management (EMR Profiles)
**Tech involved:** PostgreSQL (pgvector), AWS S3 (file uploads), Prisma, search

```bash
npx skills add supabase/agent-skills/supabase-postgres-best-practices
npx skills add anthropics/skills/webapp-testing
npx skills add obra/superpowers/verification-before-completion
```

**Why:**
- `supabase-postgres-best-practices` → Full-text search with `pg_trgm`, `pgvector` indexing for semantic EMR search, and complex join patterns for medical history
- `webapp-testing` → Patient data is PHI — every read/write path needs test coverage for data isolation
- `verification-before-completion` → No patient CRUD should be merged without verification that `hospital_id` scoping is correct

---

### Module 04 — Doctor & Staff Management
**Tech involved:** PostgreSQL, Prisma, schedule generation algorithms

```bash
npx skills add supabase/agent-skills/supabase-postgres-best-practices
npx skills add wshobson/agents/typescript-advanced-types
npx skills add anthropics/skills/webapp-testing
```

**Why:**
- `supabase-postgres-best-practices` → Recursive availability queries, complex schedule joins, and indexing doctor availability slots efficiently
- `typescript-advanced-types` → Schedule types, availability slot discriminated unions (AVAILABLE | BLOCKED | BOOKED)
- `webapp-testing` → Schedule conflict detection logic needs rigorous unit tests

---

### Module 05 — Appointment Scheduling (Queue Management)
**Tech involved:** PostgreSQL, BullMQ (reminder jobs), Socket.IO (live queue), Redis

```bash
npx skills add supabase/agent-skills/supabase-postgres-best-practices
npx skills add obra/superpowers/test-driven-development
npx skills add anthropics/skills/webapp-testing
npx skills add vercel-labs/agent-skills/vercel-react-best-practices
```

**Why:**
- `supabase-postgres-best-practices` → Concurrent appointment slot booking requires careful transaction design and locking — Postgres patterns are critical
- `test-driven-development` → Booking conflict prevention logic MUST be TDD — write "two patients can't book same slot" test first
- `webapp-testing` → Integration tests for the full booking → confirmation → reminder queue flow
- `vercel-react-best-practices` → Real-time queue board needs optimized React rendering (avoid unnecessary re-renders as token numbers update)

---

### Module 06 — Doctor Consultation & EMR (Clinical Workspace)
**Tech involved:** pgvector (semantic search), AWS S3 (file storage), Socket.IO, Vercel AI SDK

```bash
npx skills add supabase/agent-skills/supabase-postgres-best-practices
npx skills add vercel-labs/agent-skills/vercel-react-best-practices
npx skills add vercel-labs/agent-skills/vercel-composition-patterns
npx skills add shadcn/ui/shadcn
npx skills add anthropics/skills/webapp-testing
```

**Why:**
- `supabase-postgres-best-practices` → pgvector cosine similarity queries for semantic EMR search, efficient JSONB storage for SOAP notes
- `vercel-react-best-practices` → The consultation workspace is the most complex UI — streaming AI responses, live file uploads, SOAP note editor all require waterfall-free rendering
- `vercel-composition-patterns` → SOAP note form, vital signs panel, prescription builder are all complex compound components that need proper composition patterns
- `shadcn/ui/shadcn` → The clinical workspace uses Forms, Dialogs, Comboboxes, Badges — all from shadcn. The skill ensures correct theming and customization
- `webapp-testing` → Medical record writes are irreversible — full test coverage required

---

### Module 07 — Laboratory Management
**Tech involved:** PostgreSQL, file storage (PDF reports), BullMQ, Prisma

```bash
npx skills add supabase/agent-skills/supabase-postgres-best-practices
npx skills add obra/superpowers/test-driven-development
npx skills add anthropics/skills/webapp-testing
npx skills add vercel-labs/agent-skills/vercel-react-best-practices
```

**Why:**
- `supabase-postgres-best-practices` → Lab order status state machine, result range comparison queries, and TAT calculation with window functions
- `test-driven-development` → Critical alert logic (abnormal lab values triggering doctor notification) must be TDD
- `webapp-testing` → Result upload and report generation pipeline needs E2E testing
- `vercel-react-best-practices` → Lab technician dashboard with real-time order updates benefits from optimized re-render patterns

---

### Module 08 — Pharmacy & Inventory Management
**Tech involved:** PostgreSQL, FEFO algorithm, BullMQ (expiry alerts), Prisma

```bash
npx skills add supabase/agent-skills/supabase-postgres-best-practices
npx skills add obra/superpowers/test-driven-development
npx skills add wshobson/agents/typescript-advanced-types
npx skills add anthropics/skills/webapp-testing
```

**Why:**
- `supabase-postgres-best-practices` → Inventory stock aggregation, FEFO (First Expiry First Out) queries using window functions, batch tracking with efficient indexes
- `test-driven-development` → FEFO algorithm and reorder-level alerts are algorithm-heavy — write the algorithm test before the implementation
- `typescript-advanced-types` → Medicine batch types, stock movement discriminated unions (IN | OUT | ADJUSTMENT | EXPIRED)
- `webapp-testing` → Stock dispensing errors in a pharmacy are patient safety issues — thorough integration tests required

---

### Module 09 — Billing & Payments (Razorpay)
**Tech involved:** Razorpay API, PostgreSQL (transactions), Prisma, PDF generation

```bash
npx skills add supabase/agent-skills/supabase-postgres-best-practices
npx skills add obra/superpowers/test-driven-development
npx skills add anthropics/skills/webapp-testing
npx skills add obra/superpowers/verification-before-completion
```

**Why:**
- `supabase-postgres-best-practices` → Financial transaction atomicity — Postgres transaction patterns, pessimistic locking for payment processing, audit trail design
- `test-driven-development` → Payment logic MUST be TDD — invoice calculation, partial payment, insurance deduction all need failing tests first
- `webapp-testing` → Full E2E test for the payment flow (generate invoice → pay → mark paid → send receipt)
- `verification-before-completion` → Financial calculations must be verified with real test data before completion

---

### Module 10 — Inpatient Admission & Ward Management
**Tech involved:** PostgreSQL (bed tracking), Socket.IO (real-time ward board), Prisma

```bash
npx skills add supabase/agent-skills/supabase-postgres-best-practices
npx skills add vercel-labs/agent-skills/vercel-react-best-practices
npx skills add anthropics/skills/webapp-testing
npx skills add obra/superpowers/test-driven-development
```

**Why:**
- `supabase-postgres-best-practices` → Bed availability tracking with concurrent admission prevention (database-level locking), ward census aggregation queries
- `vercel-react-best-practices` → Real-time ward board with live bed status changes — performance-critical React rendering as Socket.IO events trigger updates
- `webapp-testing` → Admission/discharge workflow has complex state transitions that need integration test coverage
- `test-driven-development` → "Two patients cannot be admitted to the same bed simultaneously" — write this test first

---

### Module 11 — Emergency Management (Triage)
**Tech involved:** Socket.IO (real-time alerts), PostgreSQL, BullMQ, Prisma

```bash
npx skills add supabase/agent-skills/supabase-postgres-best-practices
npx skills add vercel-labs/agent-skills/vercel-react-best-practices
npx skills add anthropics/skills/webapp-testing
npx skills add obra/superpowers/verification-before-completion
```

**Why:**
- `supabase-postgres-best-practices` → Emergency case status machine queries, triage level sorting, and efficient indexes for real-time case board
- `vercel-react-best-practices` → Emergency dashboard is the most real-time-intensive UI — live case updates, triage level flashing, doctor assignment all need zero re-render lag
- `webapp-testing` → Emergency alert delivery to doctors must be thoroughly tested — missed notifications are patient safety failures
- `verification-before-completion` → Verify Socket.IO events fire correctly AND doctor notification jobs queue before marking this module complete

---

### Module 12 — Notifications System (Multi-channel)
**Tech involved:** AWS SES, Twilio, Socket.IO, BullMQ, Redis

```bash
npx skills add anthropics/skills/webapp-testing
npx skills add obra/superpowers/test-driven-development
npx skills add vercel-labs/agent-skills/vercel-react-best-practices
npx skills add obra/superpowers/verification-before-completion
```

**Why:**
- `webapp-testing` → Notification delivery pipeline (queue → worker → send) requires integration tests with mocked AWS SES and Twilio
- `test-driven-development` → "Quiet hours should prevent SMS delivery between 10pm-7am" — write this test first
- `vercel-react-best-practices` → Notification bell + toast system are React components that need efficient update patterns (badge count, dropdown, real-time push via Socket.IO)
- `verification-before-completion` → Verify all 8+ email templates render correctly and all notification event triggers work across modules

---

### Module 13 — Reports & Analytics Dashboard
**Tech involved:** PostgreSQL (materialized views), Recharts, exceljs, Redis caching

```bash
npx skills add supabase/agent-skills/supabase-postgres-best-practices
npx skills add vercel-labs/agent-skills/vercel-react-best-practices
npx skills add vercel-labs/agent-skills/vercel-composition-patterns
npx skills add shadcn/ui/shadcn
npx skills add wshobson/agents/tailwind-design-system
```

**Why:**
- `supabase-postgres-best-practices` → Materialized views, window functions for trend analysis, EXPLAIN ANALYZE for optimizing heavy analytics queries
- `vercel-react-best-practices` → Dashboard with multiple charts and KPI cards must avoid unnecessary re-renders and lazy-load heavy chart libraries
- `vercel-composition-patterns` → KPICard, DataTable, DateRangePicker are reusable compound components — right composition patterns prevent prop drilling hell
- `shadcn/ui/shadcn` → Dashboard uses Card, Table, Select, Popover, Badge — all from shadcn; custom theming for hospital brand
- `tailwind-design-system` → Dashboard needs a consistent color system for charts (revenue green, patients blue, etc.) — design token approach

---

### Module 14 — AI Healthcare Assistant (Gemini + RAG)
**Tech involved:** Google Gemini 1.5 Pro, Vercel AI SDK, pgvector, streaming SSE

```bash
npx skills add vercel/ai/ai-sdk
npx skills add vercel-labs/agent-skills/vercel-react-best-practices
npx skills add vercel-labs/agent-skills/vercel-composition-patterns
npx skills add supabase/agent-skills/supabase-postgres-best-practices
npx skills add pbakaus/impeccable/delight
npx skills add obra/superpowers/verification-before-completion
npx skills add anthropics/skills/webapp-testing
```

**Why:**
- `ai-sdk` → **The most important skill for this module** — teaches correct Vercel AI SDK patterns: `streamText`, `useChat`, tool calling with structured output, and streaming SSE responses
- `vercel-react-best-practices` → AI chat interfaces (useChat hook) need optimized streaming rendering — each token appearing without full re-render of the parent component
- `vercel-composition-patterns` → Chat widget, symptom analyzer, operations dashboard chat are all complex components that need compound component patterns to stay maintainable
- `supabase-postgres-best-practices` → pgvector ANN (approximate nearest neighbor) index creation for EMR embeddings — efficient `<=>` cosine distance queries
- `delight` → AI interactions should feel alive — the typing indicator, streaming text appearance, and suggestion chip animations define the quality of this module
- `verification-before-completion` → AI features must be verified: (1) medical disclaimers present, (2) streaming works, (3) rate limiting active, (4) PII not in logs
- `webapp-testing` → Test AI endpoint rate limiting, test that EMERGENCY urgency flag triggers correctly for chest pain symptoms

---

---

## 🎨 Design Polish Skills (Install for UI-Heavy Modules)

For Modules 06, 10, 11, 13, and 14 — the highest visual quality modules:

```bash
# Core design quality
npx skills add vercel-labs/agent-skills/web-design-guidelines    # Vercel's spacing, typography, interaction, a11y
npx skills add anthropics/skills/frontend-design                  # #2 most-installed skill overall

# Polish passes (use at end of each UI module)
npx skills add pbakaus/impeccable/polish    # Tighten spacing, sharpen type, clean edges
npx skills add pbakaus/impeccable/delight   # Micro-interactions and motion
npx skills add pbakaus/impeccable/critique  # Structured design critique with actionable feedback

# For the analytics dashboard specifically
npx skills add emilkowalski/skill/emil-design-eng  # Emil Kowalski's motion and craftsmanship principles
```

---

## 🔧 Universal Skills (Install for ALL modules)

These three skills should be installed at the start of the project and apply to every single module:

```bash
# 1. Project-wide discipline
npx skills add obra/superpowers/verification-before-completion

# 2. Type safety for the entire codebase
npx skills add wshobson/agents/typescript-advanced-types

# 3. Postgres fundamentals for all database work
npx skills add supabase/agent-skills/supabase-postgres-best-practices
```

---

## 🏆 Priority Install Order

Install these skills in this order when starting the project:

```bash
# Phase 1: Project & agent orchestration foundation
npx skills add vercel-labs/skills/find-skills                    # Discover more skills as needed
npx skills add obra/superpowers/writing-plans                    # Plan before coding
npx skills add obra/superpowers/executing-plans                  # Execute with checkpoints
npx skills add obra/superpowers/verification-before-completion   # Verify before marking done
npx skills add obra/superpowers/systematic-debugging             # Debug hypothesis-driven
npx skills add obra/superpowers/finishing-a-development-branch   # Git + PR discipline

# Phase 2: TypeScript + database foundations
npx skills add wshobson/agents/typescript-advanced-types
npx skills add supabase/agent-skills/supabase-postgres-best-practices
npx skills add vercel/turborepo/turborepo

# Phase 3: Frontend & Next.js
npx skills add vercel-labs/next-skills/next-best-practices
npx skills add vercel-labs/agent-skills/vercel-react-best-practices
npx skills add vercel-labs/agent-skills/vercel-composition-patterns
npx skills add shadcn/ui/shadcn
npx skills add wshobson/agents/tailwind-design-system
npx skills add vercel-labs/agent-skills/web-design-guidelines

# Phase 4: Testing discipline
npx skills add obra/superpowers/test-driven-development
npx skills add anthropics/skills/webapp-testing
npx skills add currents-dev/playwright-best-practices-skill/playwright-best-practices
npx skills add microsoft/playwright-cli/playwright-cli

# Phase 5: Specialized tools
npx skills add vercel/ai/ai-sdk                                   # For Module 14
npx skills add anthropics/skills/frontend-design                  # UI polish
npx skills add pbakaus/impeccable/polish                          # Final visual refinement
npx skills add pbakaus/impeccable/delight                         # Micro-interactions
npx skills add bobmatnyc/claude-mpm-skills/drizzle-orm            # ORM patterns
```

---

## 📊 Skills Frequency by Module

| Skill | Modules That Need It | Reason |
|---|---|---|
| `supabase-postgres-best-practices` | 01-14 (all) | PostgreSQL is the database for every module |
| `verification-before-completion` | 01, 02, 03, 09, 11, 12, 14 | High-risk modules where partial completion causes bugs |
| `vercel-react-best-practices` | 05, 06, 07, 10, 11, 12, 13, 14 | Real-time and complex UI modules |
| `webapp-testing` | 01, 03, 05, 06, 07, 08, 09, 10, 11, 12, 14 | All modules with critical business logic |
| `test-driven-development` | 01, 05, 07, 08, 09, 10, 11, 12 | Algorithm-heavy or safety-critical modules |
| `typescript-advanced-types` | 01, 02, 04, 06, 08 | Modules with complex type hierarchies |
| `vercel-composition-patterns` | 06, 13, 14 | Most complex frontend components |
| `shadcn/ui/shadcn` | 06, 13 | Complex dashboard UIs |
| `tailwind-design-system` | 13 | Analytics dashboard design system |
