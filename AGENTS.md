# AI Agent Onboarding Guide

Welcome to the Hospital Management System (HMS) project. 

To maximize token efficiency and maintain strict architectural standards, this project uses **lazy-loaded AI skills** instead of a massive, monolithic rulebook. 

When you are assigned a task or module, follow this exact workflow:

## The Standard Operating Procedure (SOP)

1. **Understand the Architecture**
   Read `docs/00_master_plan.md`. This is the single source of truth for the Turborepo architecture, the tech stack (Next.js 16, Node 22, Express, Postgres, Prisma), and deployment strategy.

2. **Read Your Module's Prompt**
   Find the specific execution plan for your current module inside the `docs/` directory (e.g., `docs/01_auth_module.md`). This document is highly detailed and serves as your primary prompt for what to build.

3. **Identify Required Skills**
   Cross-reference your module with `docs/skills_map.md`. This map dictates exactly which specialized AI skills you need to successfully execute the module.

4. **Lazy-Load Your Skills**
   **DO NOT** start coding immediately. First, install the required skills using the CLI:
   ```bash
   npx -y skills add <owner/repo@skill>
   ```
   *Skills will be downloaded to `.agents/skills/`. You MUST read the `SKILL.md` files inside these folders to understand the specific rules (e.g., React performance, Drizzle/Prisma schema design, UI polish) before proceeding.*

5. **Execute and Verify**
   Write code applying the rules you just loaded. If you installed `verification-before-completion` or `test-driven-development`, adhere strictly to their processes.
   - Ensure you are treating this as a **Turborepo** — put task logic in individual package `package.json` files, not the root.

6. **Checkpoint Commits**
   Commit your work at logical checkpoints (`git commit -m "feat(module): description"`) so the user can easily roll back if an approach needs to be changed.

## Core Philosophy
- **On-Demand Context**: Only read the files and skills you strictly need for your current module.
- **Evidence Before Assertion**: Always verify your code compiles and tests pass before claiming a task is done. 
- **Premium Aesthetics**: If working on frontend modules, utilize the recommended design skills to ensure a state-of-the-art UI.
