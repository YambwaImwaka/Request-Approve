# Beneficial Ownership Change Request Workflow System

A production-quality full-stack web application that simulates a beneficial ownership information update workflow for compliance review.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/web run dev` — run the frontend (port 22333)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + JWT auth (jsonwebtoken + bcryptjs)
- DB: PostgreSQL + Drizzle ORM
- Frontend: React + Vite + Tailwind CSS + React Query + React Hook Form
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all contracts)
- `lib/db/src/schema/` — Drizzle DB schema (users, applications, audit_logs)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, applications)
- `artifacts/api-server/src/lib/workflow.ts` — Workflow state machine
- `artifacts/api-server/src/lib/auth.ts` — JWT auth helpers and middleware
- `artifacts/web/src/` — React frontend (pages, hooks, components)

## Architecture decisions

- **OpenAPI-first**: All API contracts defined in `lib/api-spec/openapi.yaml`, generating typed React Query hooks and Zod validators. No handwritten types.
- **Workflow state machine**: Centralized in `workflow.ts` — a pure function with a transition table. All status transitions go through `validateTransition()` which enforces role rules, comment requirements, and allowed state paths.
- **Audit trail**: Every workflow transition creates an immutable audit log entry with userId, role, from/to status, comment, and timestamp. Displayed chronologically on the application detail page.
- **Role enforcement**: Server-side only. JWT payload carries the role; middleware enforces it before reaching business logic. The frontend adapts UI based on role but never trusts it for authorization.
- **Generic transition handlers**: `transitionHandler()` factory avoids code duplication across 5 workflow endpoints while keeping type safety.

## Product

- **Applicant**: Creates, edits, and submits ownership change requests. Views status and reviewer comments.
- **Reviewer**: Reviews the submitted queue, starts review, approves, rejects (with comment), or requests changes (with comment).
- Seeded demo users: `applicant@example.com` / `password123` and `reviewer@example.com` / `password123`

## Workflow States

```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED
                                 → REJECTED (comment required)
                                 → CHANGES_REQUESTED (comment required) → DRAFT
```

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The `/applications/stats` route must be registered BEFORE `/applications/:id` in Express to prevent the path param from matching "stats"
- `ownershipPercentage` is stored as `numeric` in Postgres and returned as a string — must be `parseFloat()`'d for API responses
- DB enum types (`user_role`, `application_status`) are defined in Drizzle schema and created via `pnpm --filter @workspace/db run push`
- Always run `pnpm run typecheck:libs` after changing `lib/*` before checking artifact packages

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
