# AgroTrace — Implementation & Deployment Plan

## Executive Summary

AgroTrace is today a **frontend-only React/TanStack Start application** whose data lives entirely in `src/lib/mock-data.ts` and four `useSyncExternalStore` stores (`batches-store.ts`, `packaging-store.ts`, `recipes-store.ts`, `workflows.ts`). There is no backend, no database, no authentication, and the repository is not yet under git.

This plan turns it into a **full-stack, multi-user, audited, traceable food-production system** on the confirmed stack:

| Layer | Technology |
|---|---|
| Frontend | React 19 + TanStack Start/Router + shadcn/ui + Tailwind + RHF + Zod + TanStack Query |
| Auth | better-auth (DB sessions, TOTP MFA, RBAC via admin + accessControl plugins) |
| Backend | Bun + Hono HTTP API (system of record) |
| ORM / DB | Drizzle ORM + PostgreSQL 16 (Docker locally, DO Managed PG in prod) |
| Hosting | Cloudflare Workers (web/SSR edge) + DigitalOcean App Platform (Bun API) + DO Managed Postgres |

The work is delivered as a **monorepo** (`apps/web`, `apps/api`, `packages/db`, `packages/shared`) and sequenced into six phases so the app **compiles and runs at every checkpoint**. Migration is one domain at a time: stores stay in place until their last consumer is cut over.

### Current State vs Target

| Concern | Current | Target |
|---|---|---|
| Data | In-memory mock arrays + stores | PostgreSQL 16, Drizzle ORM, ~50 tables |
| IDs/codes | Client-generated (`nextBatchId()`, `nextRunNumber()`) | Server-generated via `code_sequence` table, in-transaction |
| Auth | None | better-auth sessions + TOTP MFA + RBAC |
| Persistence of step data | `stepState` discarded on reload; workflow step data dropped | `batch_step_result`, `workflow_step_data` tables |
| Traceability | Implicit / none | Explicit FK edge tables, recursive-CTE forward/backward trace |
| Audit | None | Append-only `audit_log`, written in-tx on every mutation |
| Recipe / ProductionOrder shapes | Two divergent shapes each | Unified, versioned models |
| Deployment | Single Worker, mocks | Cloudflare Worker (web) + DO App Platform (API) + Managed PG |
| Repo | Not git | Git monorepo with committed migrations |

---

## Phased Roadmap

> Legend: **DoD** = Definition of Done. Phases are sequential except where noted; within a phase, tasks are roughly ordered.

### Phase 0 — Monorepo & Local Infrastructure

Establish the repo structure, git, Docker Postgres, and Bun workspace so everything downstream has a home and a running database.

**Tasks**
- [ ] `git init`; add `.gitignore` (ignore `.env`, `apps/*/.env`, `node_modules`, `apps/web/.output`; **keep** `packages/db/drizzle/`).
- [ ] Restructure to monorepo: move current app into `apps/web` (including `wrangler.jsonc`); create `apps/api`, `packages/db`, `packages/shared`.
- [ ] Root `package.json`: `workspaces: ["apps/*","packages/*"]` + infra scripts (see §Local-Dev reference).
- [ ] `docker-compose.yml`: `postgres:16-alpine`, named volume `agrotrace-pgdata`, healthcheck (`pg_isready`), `${POSTGRES_HOST_PORT:-5432}:5432`.
- [ ] `.env.example` (committed) + `.env` (gitignored). **Pin ports: web=3000, api=8787.**
- [ ] `bunfig.toml`: add backend deps to `minimumReleaseAgeExcludes` (`drizzle-orm`, `drizzle-kit`, `pg`, `@types/pg`, `better-auth`, `hono`) **after user confirmation**, or accept the 24h guard.
- [ ] Validate the Lovable Vite wrapper still works after the `apps/web` move (`wrangler deploy --dry-run`).

**Files created:** `docker-compose.yml`, `.env.example`, `.gitignore`, root `package.json` (modified), `packages/db/package.json`, `packages/shared/package.json`, `apps/api/package.json`.

**DoD:** `bun install` succeeds; `bun run db:start` brings up a healthy Postgres; `apps/web` still runs unchanged via `bun run dev:web`; repo committed.

---

### Phase 1 — Data Model, Migrations & Seed

Build the shared Drizzle schema (the system's backbone), generate the first migration, and seed it from the *existing* mock fixtures so the migrated UI has immediate data parity.

**Tasks**
- [ ] `packages/db/src/schema/*.ts` — one module per domain group (auth, company, suppliers, raw-materials, recipes, production, packaging, finished-goods, qc, dispatch, recalls/waste/returns, workflows, audit, lineage), re-exported from `index.ts`. (Full spec in §Data Model.)
- [ ] Define all `pgEnum`s once; export enum constants so `packages/shared` Zod enums derive from the same source (no drift).
- [ ] Unify the two Recipe shapes (`recipe` + `recipe_version` + `recipe_ingredient` + `recipe_step`) and the two ProductionOrder shapes (single `production_order`).
- [ ] Explicit lineage edge tables (`batch_input_lot`, `dispatch_line`, `recall_affected_lot`, …) + the `trace_edge` view.
- [ ] `audit_log` with a Postgres trigger that raises on `UPDATE`/`DELETE` (append-only).
- [ ] `code_sequence` table + `nextCode()` design (locked row, in-tx).
- [ ] `packages/db/src/client.ts` (Drizzle + `pg` Pool singleton); `packages/db/drizzle.config.ts` (`dialect: postgresql`, `casing: snake_case`, `out: ./drizzle`, `strict`, `verbose`).
- [ ] `packages/shared`: per-entity `insertX`/`updateX`/`selectX` Zod schemas + inferred TS types + Zod enums.
- [ ] `bun run db:generate` → review SQL → commit `drizzle/`. `bun run db:migrate`.
- [ ] Seed: `packages/db/src/seed/{seed.ts,fixtures.ts,reset.ts}`. Fixtures import live from `apps/web/src/lib/*`. FK-safe insert order; preserve human codes; advance `code_sequence` afterward; localhost-only guardrail. (Seeded users created **after** Phase 2 auth exists — see ordering note.)

**Files created:** `packages/db/src/schema/*.ts`, `index.ts`, `client.ts`, `drizzle.config.ts`, `packages/db/src/seed/*`, `packages/db/drizzle/*` (generated), `packages/shared/src/*`.

**DoD:** `bun run db:migrate` creates the full schema on a fresh DB (`\dt` confirms ~50 tables); `bun run db:seed` (re-runnable) loads parity data and aligns sequences; audit-log mutation is rejected by the trigger.

> **Ordering note:** the seed's user-mapping step (fixture `assignee`/`inspector`/`user` strings → real user IDs) depends on better-auth tables existing. Schema + non-user seed can land in Phase 1; the **user/auth seed block runs at the end of Phase 2**.

---

### Phase 2 — Authentication & RBAC (better-auth)

Stand up identity, sessions, MFA, and the RBAC enforcement layer inside the Bun API. All auth lives in `apps/api` — never in the Worker.

**Tasks**
- [ ] `apps/api/src/auth.ts`: better-auth with `drizzleAdapter(db,{provider:"pg"})`, `emailAndPassword` (self-signup **off**), `twoFactor` (TOTP + backup codes), `admin` plugin with `createAccessControl` statements.
- [ ] `npx @better-auth/cli generate` → emit `user/session/account/verification/twoFactor` into `packages/db/src/schema/auth.ts`; commit; migrate alongside domain tables.
- [ ] Define `accessControl` resources × verbs (supplier, rawMaterialLot, qcCheck, recipe, batch, packagingRun, finishedGoods, dispatch, recall, waste, return, audit, report, company, user, workflow, verify). (Full matrix in §Auth.)
- [ ] Session config: DB sessions; `expiresIn` 8h, `updateAge` 1h, `freshAge` ~10 min; `cookieCache` ~5 min; `trustedOrigins` = web origin(s).
- [ ] Cookie strategy: **dev** `SameSite=Lax; Secure=false; domain=localhost`; **prod** `SameSite=Lax` with `Domain=.agrotrace.co.ke` (shared parent — see resolved contradiction below).
- [ ] Map the **8 Company-Setup role profiles** (editable master data in `role` table) onto the **7 enforced better-auth roles** stored in `user.role` (+ public consumer). MFA mandatory for `administrator, production_supervisor, qc_officer, dispatch_sales, auditor`.
- [ ] Seed dev users (admin = `samuelmabonga256@gmail.com` + one per role) via better-auth signup API, then run the remainder of the Phase-1 seed user mapping.

**Files created:** `apps/api/src/auth.ts`, `packages/db/src/schema/auth.ts`.

**DoD:** sign-in/out + session work against the API; TOTP enroll + verify works; `auth.api.userHasPermission` returns correct verdicts for each role; privileged role without MFA is forced into enrollment; seeded users log in.

---

### Phase 3 — Backend API (Bun + Hono)

Build the system of record: typed routes, middleware (auth → RBAC → MFA-gate → transaction+audit → error), the sequence/trace/dashboard services, and the public verify surface.

**Tasks**
- [ ] `apps/api/src/index.ts` (`Bun.serve` + Hono), `src/db.ts`, mount `ALL /api/auth/* → auth.handler`.
- [ ] Middleware (`src/middleware/`): `auth.ts` (session load, 401), `rbac.ts` (`requirePermission(resource,action)`), MFA-enrollment gate, `requireFresh()` step-up, `audit-tx.ts` (`withTx(audit)` wrapper: opens Drizzle tx, runs handler, writes `audit_log` in same tx, rolls back together), `error.ts` (Hono `onError` → uniform `{error:{code,message,details?,traceId}}`).
- [ ] Conventions: base `/api/v1`; accept uuid-or-code in `:id`; responses carry both `id` + `code`; Zod-validate every body/query (422 on fail); list envelope `{data,page,pageSize,total}`; optimistic concurrency via `version` + `If-Match` (409); `Idempotency-Key` on code-generating POSTs.
- [ ] Services: `sequences.ts` (`nextCode()` with `SELECT … FOR UPDATE`), `trace.ts` (recursive CTE backward/forward, reused by recalls), `reports.ts` (10 parameterized reports), `dashboard.ts` (8 KPIs + 5 series, server aggregation).
- [ ] Routes per domain (`src/routes/<entity>.ts`) per the §API endpoint table; enforce state-transition guards (`409 STATE_TRANSITION_INVALID`) and approval gating (`403 APPROVAL_REQUIRED`).
- [ ] The 11 atomic transaction boundaries (goods receipt, QC decision, start batch, step update, complete batch, packaging run, FG release, dispatch, confirm receipt, open recall = SERIALIZABLE, workflow advance).
- [ ] Public group **before** auth middleware: `GET /api/v1/public/verify/:code` (increments `verification_scan`, returns `authentic:false` not 404 for bad codes), `POST .../feedback`; rate-limited; open CORS.
- [ ] `GET /healthz` (no DB) + `GET /readyz` (`SELECT 1`).

**Files created:** `apps/api/src/{index,db}.ts`, `apps/api/src/middleware/*`, `apps/api/src/routes/*`, `apps/api/src/services/*`, `apps/api/tsconfig.json`.

**DoD:** all endpoints respond with correct RBAC verdicts; every mutation writes an audit row in-tx (rollback proven); concurrent batch starts never duplicate `PB-` codes; public verify works with no session; `curl /healthz` + `/readyz` green; trace backward/forward returns correct lineage on seeded data.

---

### Phase 4 — Frontend Migration (Stores → TanStack Query)

Replace the four stores and mock reads with Query hooks against the API, wire auth/session into router context, and convert toast-only forms to real RHF + shared-Zod mutations. One domain at a time; app runs at every step.

**Tasks (sequenced)**
- [ ] **Infra (no behavior change):** `apps/web/src/lib/{api-client.ts,query-keys.ts,auth-client.ts,auth-context.ts}`, `src/components/QueryStates.tsx`, `src/hooks/api/*`. Move store interfaces to import from `packages/db`/`packages/shared`; set `QueryClient` defaults (`staleTime` 30s reference / 0 live; no retry on 4xx).
- [ ] **Auth foundation:** extend router context to `{queryClient,session,user}` (`router.tsx`, `__root.tsx`); add session-fetch request middleware in `src/start.ts` (forward `Cookie` → `GET /api/auth/get-session`); `routes/login.tsx`, `routes/mfa.tsx`; `beforeLoad` guards via `requireAuth`/`requireRole`; feature-flag `VITE_AUTH_ENABLED` to keep app runnable pre-API.
- [ ] **Recipes** (first full vertical, validates the pattern) → **Batches** (optimistic `useUpdateBatchStep`) → **Packaging** (server codes, QR render) → **Workflows**.
- [ ] **Toast-only modules in trace order:** suppliers → raw-materials → storage (goods receipt) → quality-control (build out) → finished-goods → dispatch → customer-receiving → recalls → waste → returns → company.
- [ ] **Aggregates last:** dashboard, reports, traceability, audit.
- [ ] **Public verify** anytime after infra (not guarded).
- [ ] Forms: import request schema from `packages/shared`, `zodResolver`, `mutateAsync`, map `ApiError.fieldErrors → form.setError`, spinner via `isPending`, server-generated codes read-only.
- [ ] Centralized invalidation (esp. cross-entity: complete batch → dashboard + fg.releaseQueue; recall → trace.* + fg + batches; any write → audit.list via `useAuditedMutation`).
- [ ] `AppSidebar.tsx` gate nav by `user.role`; `StatusBadge.tsx` import enums from shared.
- [ ] **Cleanup:** delete the five store files once last consumer migrated; flip `VITE_AUTH_ENABLED` on.

**Files created:** `apps/web/src/lib/{api-client,query-keys,auth-client,auth-context}.ts`, `src/components/QueryStates.tsx`, `src/hooks/api/*.ts`, `src/routes/{login,mfa}.tsx`. **Changed:** `router.tsx`, `__root.tsx`, `start.ts`, all 27 route files, `AppSidebar.tsx`, `StatusBadge.tsx`. **Deleted:** `src/lib/{batches-store,packaging-store,recipes-store,workflows,mock-data}.ts`.

**DoD:** every route reads from the API with loading/error/empty states; no client code generation remains; auth guards redirect correctly; optimistic step updates feel instant and roll back on error; the five store files are gone; app builds clean.

---

### Phase 5 — Production Deployment

Ship web to Cloudflare and API to DigitalOcean App Platform against Managed Postgres. This phase is the **user-executed runbook** (credentials required — see §Blocked/Needs You).

**Tasks (plan artifacts to land before the live run)**
- [ ] `apps/api/Dockerfile` (multi-stage, `oven/bun:1.1-slim`, monorepo-aware, frozen lockfile, non-root, `EXPOSE 8080`, `CMD bun run apps/api/src/index.ts`) + `.dockerignore`.
- [ ] `.do/app.yaml`: `agrotrace-api` service (Dockerfile, build context `/`, `http_port:8080`, healthcheck `/healthz`, domain `api.agrotrace.co.ke`), **`db-migrate` PRE_DEPLOY job** (`run_command: bun run db:migrate`), reference to the separately-created Managed PG with trusted-sources = app only.
- [ ] `apps/web/wrangler.jsonc` (moved from root): keep `main`, `compatibility_date`, `compatibility_flags:["nodejs_compat"]`; add custom domains `app.` + `verify.agrotrace.co.ke`; `VITE_API_BASE_URL` at build; **no DB bindings/Hyperdrive**; secrets via `wrangler secret put`.
- [ ] Expand/contract migration discipline for zero-downtime once `instance_count ≥ 2`.
- [ ] PITR restore test before go-live; optional `pg_dump → DO Spaces` off-platform backup.

**Files created:** `apps/api/Dockerfile`, `apps/api/.dockerignore`, `.do/app.yaml`. **Changed/moved:** `wrangler.jsonc` → `apps/web/wrangler.jsonc`.

**DoD:** `api.agrotrace.co.ke/healthz` + `/readyz` green; login on `app.agrotrace.co.ke` sets a cookie on `.agrotrace.co.ke` and authenticated API calls succeed with no CORS errors; SSR hydrates session with no logged-out flash; public verify works unauthenticated and increments scan count; PITR test restore proven; rollback paths confirmed.

---

## Reference Section A — PostgreSQL Data Model (Drizzle)

> Conventions, enums, and ~50 tables. This is the authoritative schema spec.

**Global conventions:** uuid PK `gen_random_uuid()`; human `code text not null` unique per `(companyId, code)`, server-generated; `createdAt`/`updatedAt timestamptz`; domain calendar dates as `date`, event instants as `timestamptz`; quantities split into `qty numeric(14,3)` + `uom` enum (optional `qtyLabel` for exact UI formatting); soft delete (`deletedAt`) on master data only, never on transactional/lineage; multi-tenant `companyId` on every business table; mutations write `audit_log`.

**pgEnums:** `inventory_status, batch_status, production_order_status, packaging_run_status, dispatch_status, recall_status, qc_status, waste_status, return_decision, recipe_status, supplier_risk, cert_status, workflow_instance_status, workflow_category, workflow_step_key, recipe_step_kind, uom, material_category, priority, config_status, approval_state, customer_receipt_status` (values exactly as listed in the source draft §1).

**Table groups:**

| Group | Tables |
|---|---|
| Auth (better-auth) | `user, session, account, verification, twoFactor` (generated) |
| Org & RBAC | `company, role, user_role, approval_level, approval_request` |
| Company master | `site, storage_location, department, product_category, product, label_format, batch_numbering_rule, company_config` |
| Suppliers | `supplier, supplier_material, supplier_activity` |
| Raw materials | `raw_material_catalog, raw_material_lot, goods_receipt` |
| Recipes (versioned) | `recipe, recipe_version, recipe_ingredient, recipe_step` |
| Production | `production_order, production_batch, batch_step_result, batch_input_lot` |
| Packaging | `packaging_run, packaged_box, packaged_unit` |
| Finished goods | `finished_goods_lot, finished_goods_release` |
| QC & commercial | `qc_check, customer, sales_order, dispatch, dispatch_line, customer_receipt, return_record, waste_record` |
| Recalls & verify | `recall, recall_affected_lot, verification_scan, consumer_feedback` |
| Workflows | `workflow_template, workflow_template_step, workflow_instance, workflow_step_data` |
| Cross-cutting | `audit_log, code_sequence, report_run` |

**Lineage / trace graph (§11):** directed FK edges — `batch_input_lot` (RM lot→batch), `packaging_run.productionBatchId` (batch→run), box/unit FK chain (run→box→unit), `finished_goods_lot` FKs (batch/run→FG), `dispatch_line` (FG/unit→dispatch), `customer_receipt` (dispatch→customer), `qc_check` polymorphic `(subjectType,subjectId)`, `verification_scan.resolvedUnitId` (unit→consumer scan), `recall_affected_lot` (recall→any lot). A `trace_edge` UNION view normalizes these to `(fromType,fromId,toType,toId,edgeKind,qty,at)` for a single recursive-CTE walk. Every FK column indexed; composite indexes on `(subjectType,subjectId)`, `(sourceType,sourceId)`, `(lotType,lotId)`, `(resolvedUnitId)`.

**Audit (§12):** `audit_log` (bigserial pk, companyId, userId nullable, action, entityType, entityId, recordCode, oldValue/newValue jsonb, occurredAt, device). Append-only via trigger raising on UPDATE/DELETE + revoke at DB role. Indexes `(entityType,entityId)`, `(companyId, occurredAt desc)`, `(userId)`.

**Sequences (§13):** `code_sequence(companyId, entityType, year, line nullable, lastValue)` unique `(companyId,entityType,year,line)`; transactional `nextCode()` locks the row, formats per `batch_numbering_rule.pattern`. Box/unit codes derived deterministically from run number + indices, unique-constrained.

**Dashboard/reports (§15):** computed aggregates, no base tables; optional `report_run` audit table; materialized views (`mv_expiry_risk`, `mv_dispatch_by_customer`) as later optimization.

---

## Reference Section B — Authentication & Authorization

**Placement:** better-auth lives only in `apps/api` (Drizzle adapter, same Postgres). Mount `ALL /api/auth/*`. The Worker treats auth as a remote service: SSR forwards the `Cookie` header to `GET /api/auth/get-session`; no DB on the edge.

**Sessions:** server-side DB sessions (not stateless JWT) — required for audit, MFA step-up, admin revocation. `expiresIn` 8h, `updateAge` 1h, `freshAge` ~10 min, `cookieCache` ~5 min.

**MFA:** TOTP + backup codes; **mandatory** for `administrator, production_supervisor, qc_officer, dispatch_sales, auditor`; optional for `floor_operator, storekeeper`. Step-up (fresh session) for FG release, recall open/close, waste write-off, user/role changes.

**Roles — two layers (resolved):**
- **8 Company-Setup profiles** (Admin, Plant Manager, QA Manager, QA Officer, Production Supervisor, Stores Clerk, Operator, Viewer) = **editable descriptive master data** in the `role` table for the Company Setup UI + approval-chain SLA.
- **7 enforced better-auth roles** in `user.role` drive RBAC: `administrator, production_supervisor, qc_officer, floor_operator, storekeeper, dispatch_sales, auditor` (+ unauthenticated public consumer). Profile→role mapping per the §Auth table.

**RBAC enforcement (server-authoritative):** base auth middleware (401) → MFA-enrollment gate → `requirePermission(resource,action)` via `auth.api.userHasPermission` → `requireFresh()` step-up → handler-level row-level/ownership checks (e.g. operators act only on their own batches). Frontend guards are UX-only. Full **role × action permissions matrix** is in the source draft §9 (administrator = super-user; auditor = strictly read/export everywhere; ✓† = step-up, ✓‡ = ownership check, L#=approval level).

**Public path:** `/api/v1/public/verify/*` mounted before auth, minimal-disclosure DTO (no supplier/cost/internal-lot/QC/user data), rate-limited, `authentic:false` for recalled/bad codes (never 404).

**Failure semantics:** `401 UNAUTHENTICATED`, `403 forbidden`, `403 reauth_required`, `403 mfa_enrollment_required`.

---

## Reference Section C — Backend API (Bun + Hono)

**Topology decision:** standalone Bun + Hono API (`apps/api`) is the single system of record. TanStack Start server functions act **only** as a thin SSR cookie-forwarding proxy (workerd can't run `pg`/better-auth's Node adapter reliably). One HTTP boundary = one place to enforce RBAC + approval chain + mandatory audit-on-write.

**Conventions:** `/api/v1`; uuid-or-code path params; both `id`+`code` in responses; server-generated codes; Zod validation (422); list envelope; `version`+`If-Match` (409); `withTx(audit)` on every mutation; `Idempotency-Key` on code-generating POSTs; uniform error body with `traceId`.

**Endpoint surface** (full table in source draft §4): auth, `/me`, company/master-data CRUD, users, suppliers (+approve/reject), raw-material catalog + lots + goods-receipts, **quality-control (built, not skipped)**, recipes (versioned, code-immutable), production-orders, **batches** (start/steps/complete/quarantine), packaging (run→boxes→units + labels + advance), finished-goods (release), dispatch (+status), customer-receiving (confirm), recalls (open/recovery/close, L3), waste (record/approve L3), returns, workflows (templates/instances/claim/advance), audit (read/export only), traceability (`/trace/:code` + backward/forward/export), dashboard/reports, and public verify/feedback.

**11 atomic transactions (each audited in-tx):** goods receipt; QC decision; start batch (per-line/year sequence + consumption links + order status); step update (+conditional auto-QC); complete batch (derive yield/waste, L2 if deviation); packaging run (PR + N boxes + N×M units, one write); FG release (L1); dispatch (resolve scans + decrement FG + unit state); confirm receipt; **open recall (SERIALIZABLE, lineage snapshot, mass status→Recalled)**; workflow advance (step data + underlying module mutation, all-or-nothing).

**Traceability engine:** recursive CTEs over the FK edge tables; resolve by code prefix; the same backward+forward resolver powers both `/trace` and recall lot resolution.

**Safety:** explicit state-transition maps (`409 STATE_TRANSITION_INVALID {from,to,allowed}`); approval gating (`403 APPROVAL_REQUIRED {requiredLevel,currentLevel,escalateTo}`); `FOR UPDATE` sequence locking; public surface rate-limited + non-enumerable; audit immutable at DB role.

---

## Reference Section D — Frontend Migration

**Principles:** one domain at a time; adapter-shaped hooks return the same TS shapes routes already consume; shared schemas (`packages/db` types + `packages/shared` Zod) are the contract; server owns all IDs/codes/derived values.

**New infra files:** `api-client.ts` (typed fetch, `credentials:"include"`, structured `ApiError`, server-side cookie forwarding), `query-keys.ts` (hierarchical factory), `auth-client.ts` (`better-auth/react` + twoFactor/admin plugins), `auth-context.ts` (`requireAuth`/`requireRole`), `QueryStates.tsx` (Loading/Error/Empty), `src/hooks/api/*`.

**Cache keys + invalidation:** centralized factory; domain-root cascade; cross-entity invalidation matters (complete batch → dashboard + fg.releaseQueue; QC → qc + subject detail + dashboard + audit; recall → recalls + fg + batches + trace.* + dashboard; any write → audit.list via `useAuditedMutation`). Defaults: `staleTime` 30s reference / 0 live; `retry` only on 5xx.

**Forms:** RHF + `zodResolver(sharedSchema)` → `mutateAsync` → toast/reset/close on success, `fieldErrors → setError` on failure, spinner via `isPending`, server codes read-only.

**Optimistic updates** only for `useUpdateBatchStep` (run checklist), `useAdvanceWorkflowStep`, and toggle-like approve actions. **Never** optimistic for start/complete batch, create packaging run, recall open, dispatch confirm (need server codes/derived values/RBAC verdict).

**Auth wiring:** widen router context to `{queryClient,session,user}`; SSR session read in `src/start.ts` `createStart` middleware; `beforeLoad` guards; `verify`/`login`/`mfa` public; global 401 → redirect `/login`; `signOut()` clears query cache. Cross-origin handled by `credentials:"include"` + API CORS allowlist.

---

## Reference Section E — Local Development

**Repo layout (infra files):** `docker-compose.yml`, `.env.example`/`.env`, `.gitignore`, root `package.json`, `bunfig.toml`, `packages/db/{drizzle.config.ts, src/schema/, src/client.ts, src/seed/*, drizzle/, package.json}`, `apps/api/*`, `apps/web/*`.

**Docker:** `postgres:16-alpine`, container `agrotrace-postgres`, `${POSTGRES_HOST_PORT:-5432}:5432`, creds `agrotrace/agrotrace/agrotrace` (dev-only), named volume, healthcheck, `restart: unless-stopped`. Optional commented `adminer`.

**Migration workflow:** `generate` + `migrate` is canonical (commit `drizzle/`); `push` for throwaway local spiking only, never CI/prod; **API does not auto-migrate on boot** (avoid replica races). `casing: snake_case`.

**Seed:** loads existing mock fixtures (imported live from `apps/web/src/lib/*`) into Postgres in FK-safe order; localhost guardrail; preserves human codes then advances `code_sequence`; dashboard series are *derived*, not seeded (`--verify` compares computed vs fixture). Users created via better-auth signup API.

**Env (`.env.example`):** `DATABASE_URL`, `POSTGRES_*`, `POSTGRES_HOST_PORT=5432`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=http://localhost:8787`, `AUTH_COOKIE_DOMAIN=localhost`, `CORS_ORIGIN=http://localhost:3000`, `API_PORT=8787`, `VITE_API_URL=http://localhost:8787`, `VITE_VERIFY_BASE_URL=http://localhost:3000/verify`. **Resolved port choice: web=3000, api=8787.**

**Root scripts:** `dev`/`dev:web`/`dev:api`; `db:start`(`--wait`)/`stop`/`nuke`/`logs`; `db:generate`/`migrate`/`push`/`studio`/`seed`; `db:reset` (nuke→start→migrate→seed); `setup` (cp env→install→start→migrate→seed).

**Clone → running:**
```bash
git init                       # repo not git yet
cp .env.example .env           # set BETTER_AUTH_SECRET via: openssl rand -base64 32
bun install
bun run db:start
bun run db:migrate
bun run db:seed
bun run dev                    # web:3000  api:8787  /verify public
```

---

## Reference Section F — Production Deployment

**Topology:** `app.agrotrace.co.ke` + `verify.agrotrace.co.ke` → Cloudflare Worker (`apps/web`); `api.agrotrace.co.ke` → DO App Platform (`apps/api`); → DO Managed Postgres 16 (private, trusted-sources = app, never `0.0.0.0/0`).

**Hosting choice:** App Platform (managed TLS, rolling deploys, health checks, secrets, PRE_DEPLOY jobs, private PG link). Droplet+LB is the only-if-needed fallback; same Dockerfile works.

**Dockerfile:** multi-stage `oven/bun:1.1-slim`, monorepo-aware (`apps/api` + `packages/db`), `bun install --frozen-lockfile`, non-root `USER bun`, `EXPOSE 8080`, `/healthz`+`/readyz`. **Migrations run as a PRE_DEPLOY job, not container start.** `.dockerignore` excludes `apps/web`, `node_modules`, `.git`, `.env*`.

**`.do/app.yaml`:** `agrotrace-api` service (Dockerfile, context `/`, port 8080, healthcheck `/healthz`, `instance_count:1` → ≥2 once migrations decoupled), `db-migrate` PRE_DEPLOY job, reference to separately-created Managed PG, domain `api.agrotrace.co.ke`.

**Secrets (DO, type SECRET):** `DATABASE_URL` (`?sslmode=require`), `DATABASE_CA_CERT`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=https://api.agrotrace.co.ke`, `COOKIE_DOMAIN=.agrotrace.co.ke`, `CORS_ORIGINS=https://app...,https://verify...`, `NODE_ENV=production`. Web: `VITE_API_BASE_URL` (public, build-time).

**Migrations in prod:** `generate`(dev, committed) + `migrate`(PRE_DEPLOY); never `push`; expand/contract for destructive changes at `instance_count ≥ 2`; roll forward (no auto-down); snapshot before destructive migration.

**CORS + cookies (RESOLVED — see below):** shared parent domain `.agrotrace.co.ke` ⇒ `app.`→`api.` is same-site cross-origin ⇒ **`SameSite=Lax; Secure; HttpOnly`** (CSRF-safer); custom web domain mandatory. CORS echoes the specific origin (not `*`), `Allow-Credentials: true`. SSR forwards the cookie manually in `src/start.ts`.

**TLS/backups:** Cloudflare edge TLS (Full strict); App Platform Let's Encrypt for API; `sslmode=require`/`verify-full` to PG; DO daily backups + 7-day PITR (restore into new cluster); optional `pg_dump → DO Spaces`; **test PITR before go-live**.

---

## Consolidated New / Changed Files

```
agro-flow-trace-main/
├─ .gitignore                              NEW
├─ .env.example                            NEW   (committed)  .env  NEW (gitignored)
├─ docker-compose.yml                      NEW   postgres:16-alpine
├─ package.json                            MOD   workspaces + infra scripts
├─ bunfig.toml                             MOD   minimumReleaseAgeExcludes
├─ .do/app.yaml                            NEW   API service + PRE_DEPLOY migrate job
│
├─ packages/db/                            NEW PACKAGE  @agrotrace/db
│  ├─ package.json · drizzle.config.ts
│  ├─ src/schema/*.ts (incl. auth.ts) · index.ts · client.ts
│  ├─ src/seed/{seed,fixtures,reset}.ts
│  └─ drizzle/*  (generated SQL migrations — committed)
│
├─ packages/shared/                        NEW PACKAGE  @agrotrace/shared
│  └─ src/*  (insertX/updateX/selectX Zod + enums + inferred types)
│
├─ apps/api/                               NEW APP  @agrotrace/api
│  ├─ package.json · tsconfig.json · drizzle.config.ts
│  ├─ Dockerfile · .dockerignore
│  └─ src/
│     ├─ index.ts · db.ts · auth.ts
│     ├─ middleware/{auth,rbac,audit-tx,error}.ts
│     ├─ routes/<entity>.ts
│     └─ services/{sequences,trace,reports,dashboard}.ts
│
└─ apps/web/                               MOVED from repo root
   ├─ wrangler.jsonc                       MOD   custom domains; keep nodejs_compat
   ├─ package.json                         MOD   add better-auth (client)
   └─ src/
      ├─ router.tsx · routes/__root.tsx · start.ts          MOD (context + SSR session)
      ├─ lib/{api-client,query-keys,auth-client,auth-context}.ts   NEW
      ├─ components/QueryStates.tsx                          NEW
      ├─ components/{AppSidebar,StatusBadge}.tsx             MOD
      ├─ hooks/api/*.ts                                      NEW (one per domain)
      ├─ routes/{login,mfa}.tsx                              NEW
      ├─ routes/*.tsx  (27 route files)                      MOD (store→hook + states + guards)
      └─ lib/{batches-store,packaging-store,recipes-store,
              workflows,mock-data}.ts                        DELETED (after migration)
```

---

## Blocked / Needs You (credentials & irreversible steps)

These cannot be done without your accounts/secrets, or are irreversible. They are the live Phase-5 runbook plus a few Phase-0/2 prerequisites.

| # | Action | Flags |
|---|---|---|
| 1 | Confirm adding backend deps to `bunfig.toml` excludes (or wait 24h) | decision |
| 2 | Generate `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) — rotating later logs everyone out | secret |
| 3 | Authenticate `doctl` and `wrangler` (`doctl auth init`, `wrangler login`) | USER-CRED |
| 4 | Confirm GitHub repo exists + monorepo pushed; enable `deploy_on_push` | USER-CRED |
| 5 | Confirm `agrotrace.co.ke` DNS managed in Cloudflare (nameserver delegation) | USER-CRED · IRREVERSIBLE-ish |
| 6 | Create DO Managed Postgres 16 (same region as app) + least-priv app user + download CA cert | USER-CRED · OUTWARD |
| 7 | Run **first prod migration** against empty DB; verify `\dt` (creates schema) | USER-CRED · IRREVERSIBLE |
| 8 | Set DO trusted sources (app only; temp-allow your IP for first migrate, then remove) | USER-CRED |
| 9 | Put real secrets into App spec as SECRET; `doctl apps create --spec .do/app.yaml` | USER-CRED · OUTWARD |
| 10 | Add `api.agrotrace.co.ke` (DNS-only / **grey-cloud**); wait for cert | USER-CRED · OUTWARD |
| 11 | `wrangler deploy`; add `app.` + `verify.` custom domains (**orange-cloud / proxied**); SSL = Full (strict) | USER-CRED · OUTWARD |
| 12 | End-to-end verify (login, cookie on `.agrotrace.co.ke`, no CORS errors, SSR hydration, public verify) | verification |
| 13 | **Test PITR restore** into throwaway cluster, then destroy | USER-CRED |
| 14 | Go-live announce; set DO + Cloudflare alerting; confirm rollback procedures | OUTWARD |

---

## Resolved Contradictions (between section drafts)

| Topic | Conflict | Resolution |
|---|---|---|
| Prod cookie `SameSite` | Auth draft assumed cross-**site** (`SameSite=None`); Deploy draft argued same-**site** | **`SameSite=Lax` with `Domain=.agrotrace.co.ke`** (shared registrable parent ⇒ same-site). Custom web domain is therefore mandatory. `None; Secure` only if web ever stays on `*.workers.dev`. |
| Dev API port | Infra draft wavered 8787 vs 3000 | **web=3000, api=8787** everywhere (`API_PORT`, `BETTER_AUTH_URL`, `VITE_API_URL`, `CORS_ORIGIN`). |
| Zod schema location | Data-model said `packages/db`; API/frontend said `packages/shared` | **`packages/db`** = Drizzle tables + `pgEnum`s + inferred row types; **`packages/shared`** = request/response Zod (`insert/update/select`) + Zod enums derived from the same enum constants. Frontend imports both. |
| Roles count | Data-model = 8 profiles; Auth = 7 enforced roles | **Both:** 8 profiles = editable `role` master data; 7 `user.role` strings = enforced RBAC. Mapping documented. |
| Migration at boot | One Dockerfile note said entrypoint migrates | **No** — migrations run as a **PRE_DEPLOY job** only (avoids replica races). |

---

## Risks & Open Questions

**Risks**
- **bunfig 24h supply-chain guard** will fail the first `bun install`/Docker build for fresh backend deps unless excluded or aged — resolve before Phases 0 and 5.
- **Lovable Vite wrapper** (`@lovable.dev/vite-tanstack-config`) assumes a single-package layout; validate after the `apps/web` move (`wrangler deploy --dry-run`) before relying on it.
- **DNS cloud-color**: API must be grey-cloud (DNS-only) for App Platform cert validation; web must be orange-cloud (proxied). Swapping breaks TLS or bypasses the edge.
- **SSR cookie forwarding is manual** — the Worker has no cookie jar; missing this causes logged-out-flash / failed SSR auth.
- **Open recall transaction** is the largest multi-table write (SERIALIZABLE) — watch for serialization failures under concurrent dispatch; needs retry handling.
- **Per-unit packaging rows** could explode for very large runs; model supports it but consider lazy generation / `unit_count` if a run produces tens of thousands of units.
- **Seed ↔ schema ↔ auth ordering** — user-mapping in the seed depends on better-auth tables; enforce the Phase 1 → Phase 2 dependency.

**Open Questions**
1. Confirm ownership of `agrotrace.co.ke` and Cloudflare zone delegation (assumed throughout).
2. Outbound **email provider** for password reset + user invitations — not yet chosen (infra dependency).
3. DO **region** for Managed PG + App Platform (plan assumes `fra1`; pick for latency/compliance).
4. Single-tenant confirmed? RBAC uses the `admin` plugin (single org). If multi-site tenancy is ever needed, switch to the `organization` plugin (schema already carries `companyId`).
5. Approve adding backend deps to `bunfig.toml` excludes vs waiting 24h.
6. Reports/exports: required formats (CSV confirmed; PDF for full-trace?) and whether `report_run` audit table is in-scope for v1.
7. Materialized views (`mv_expiry_risk`, etc.) — defer to post-launch optimization (assumed yes).

This document is ready for review; on approval, implementation proceeds Phase 0 → 5 with the app runnable at every checkpoint.