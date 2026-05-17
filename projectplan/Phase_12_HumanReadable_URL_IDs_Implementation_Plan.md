# Phase 12 — Human-Readable URL IDs

**Version:** v12.1  
**Date:** 2026-05-01  
**Feature:** Replace UUID path/query parameters with user-defined short codes across all Platform AND Simulator URLs  
**Trigger:** `/app/project-members?project=45523ddf-8464-49d7-aafa-bc2dc478ed38` → `/app/project-members?project=PRJ-0001`

> **Standing rule:** Both Platform (`public` schema, `/platform/` routes) and Simulator (`sim` schema, `/simulator/` routes) are treated as first-class citizens in every phase of every plan. Neither system is an afterthought or a separate bolt-on phase.

---

## 1. Problem Statement

Every entity URL in the system exposes a raw UUID (36-char, hyphenated) on both the Platform and Simulator. This is:
- Unreadable and unshareable by users
- Impossible to type or remember
- Leaks no context about what the record is
- Inconsistent with the human-readable codes already stored in the DB

---

## 2. Codebase Analysis

### Platform (`public` schema) — existing code fields

| Entity | Existing code field | Scope | Example |
|---|---|---|---|
| Project | `project_code` VARCHAR(50) UNIQUE | Global | `PRJ-0001` |
| Programme | `programme_code` VARCHAR(100) UNIQUE | Global | `PROG-0001` |
| Portfolio | `portfolio_code` VARCHAR(100) UNIQUE | Global | `PORT-0001` |
| Change Request | `change_reference` VARCHAR(100) UNIQUE | Global | `CR-0001` |
| Issue | `issue_code` VARCHAR(50) | Per-project | `ISS-0001` |
| Risk | `risk_code` VARCHAR(50) | Per-project | `RISK-0001` |
| Help Articles | `slug` VARCHAR(255) UNIQUE | Global | `how-to-create-risk` |

### Platform — missing code columns (need adding)

| Entity | Action |
|---|---|
| Teams | Add `team_code VARCHAR(50) UNIQUE` |
| Test Cases | Add `case_code VARCHAR(50) UNIQUE` |
| Daily Log entries | Add `entry_code VARCHAR(50)` |
| Stage Plans | Add `plan_code VARCHAR(50)` |
| Meetings (Comms) | Add `meeting_code VARCHAR(50)` |

### Simulator (`sim` schema) — existing and missing code fields

| Entity | Current state | Action |
|---|---|---|
| `sim.scenarios` | No code column | Add `scenario_code VARCHAR(50) UNIQUE` |
| `sim.simulation_runs` | No code column | Add `run_code VARCHAR(50) UNIQUE` |
| `sim.practice_projects` (if exists) | No code column | Add `practice_code VARCHAR(50) UNIQUE` |
| `sim.ai_events` | No code column | Add `event_code VARCHAR(50)` |
| `sim.certificates` | No code column | Add `cert_code VARCHAR(50) UNIQUE` |

### Code format standards — Platform & Simulator

| Entity | Prefix | Format | Example |
|---|---|---|---|
| Project | `PRJ` | `PRJ-NNNN` | `PRJ-0001` |
| Programme | `PROG` | `PROG-NNNN` | `PROG-0001` |
| Portfolio | `PORT` | `PORT-NNNN` | `PORT-0001` |
| Risk | `RISK` | `RISK-NNNN` (per-project) | `RISK-0001` |
| Issue | `ISS` | `ISS-NNNN` (per-project) | `ISS-0001` |
| Change Request | `CR` | `CR-NNNN` | `CR-0001` |
| Team | `TEAM` | `TEAM-NNNN` | `TEAM-0001` |
| Test Case | `TC` | `TC-NNNN` | `TC-0001` |
| Stage Plan | `SP` | `SP-NNNN` | `SP-0001` |
| Sim Scenario | `SCN` | `SCN-NNNN` | `SCN-0001` |
| Sim Run | `RUN` | `RUN-NNNN` | `RUN-0001` |
| Practice Project | `PP` | `PP-NNNN` | `PP-0001` |
| Sim Certificate | `CERT` | `CERT-NNNN` | `CERT-0001` |

### URL format after change

```
PLATFORM
Before:  /platform/projects/45523ddf-8464-49d7-aafa-bc2dc478ed38/risks/89ab...
After:   /platform/projects/PRJ-0001/risks/RISK-0042

Before:  /app/project-members?project=45523ddf-8464-49d7-aafa-bc2dc478ed38
After:   /app/project-members?project=PRJ-0001

Before:  /platform/programme/6a8f9e12-.../evm
After:   /platform/programme/PROG-0003/evm

SIMULATOR
Before:  /simulator/scenarios/7bc91a3e-2d45-4f67-8e12-abc123def456
After:   /simulator/scenarios/SCN-0001

Before:  /simulator/runs/cc2d4e9f-.../modules
After:   /simulator/runs/RUN-0007/modules
```

---

## 3. Architecture

### New shared files (serve both Platform and Simulator)

```
src/
  utils/
    isUuid.js                    # isUuid(str) → boolean — UUID vs code distinguisher
    entityUrlUtils.js            # URL builder functions for all entity types (Platform + Sim)
  services/
    entityResolverService.js     # code ↔ UUID lookup + cache; handles both public + sim schemas
  hooks/
    useEntityId.js               # React hook: resolves URL param (code or UUID) → { uuid, code }
```

### Modified files

```
src/
  utils/
    sidebarRouteUtils.js         # support code format in extractPlatformProjectId() and
                                 # extractPracticeProjectId()
  App.jsx                        # no route structure changes — resolver handles both formats
  pages/[every Platform page]    # wrap useParams() with useEntityId() before first DB call
  app/simulator/[every Sim page] # same treatment for simulator route params
```

### Design principle: resolver absorbs the format difference

```
URL param (code or UUID)         ← could be PRJ-0001 or 45523ddf-...
        ↓
  isUuid() check
        ↓ code path          ↓ UUID path
entityResolverService        return as-is
  (DB lookup + cache)
        ↓
  UUID  ← used for all DB calls
```

Both Platform and Simulator resolvers live in the **same** `entityResolverService.js`, selecting the correct Supabase client (`platformDb` or `simDb`) based on `entityType`.

---

## 4. SQL Files

> **Note:** Original plan names `v519`–`v523` collide with existing migrations (`v519_sim_local_data_extensions_tables`, etc.). Phase 12 migrations are **`v524`–`v528`**.

| File | Covers | Purpose |
|---|---|---|
| `v524_platform_entity_codes_backfill.sql` | Platform `public` | Back-fill NULL/empty codes: `project_code`, `programme_code`, `portfolio_code`, `change_reference`, `risk_code`, `issue_code` |
| `v525_platform_add_missing_code_columns.sql` | Platform `public` | Add `team_code`, `case_code`, `entry_code`, `plan_code`, `meeting_code` (+ back-fill) |
| `v526_platform_entity_code_triggers.sql` | Platform `public` | `BEFORE INSERT` triggers: auto-generate `PREFIX-NNNN` when code blank; `generate_portfolio_code()` RPC kept for UI preview |
| `v527_platform_entity_code_indexes.sql` | Platform `public` | Resolver-friendly partial / unique indexes on code columns |
| `v528_simulator_entity_codes.sql` | Simulator `sim` | `scenario_code`, `run_code`, `practice_code`, `event_code`, `cert_code` + back-fill + triggers + indexes |

---

## 5. Todo List

### Phase 12-A: Database — Platform (`public` schema)

- [x] **A1** — `v524_platform_entity_codes_backfill.sql`  
  Back-fill `project_code`, `programme_code`, `portfolio_code`, `change_reference`, `risk_code`, `issue_code` for any existing rows where the field is NULL.  
  Format: `PREFIX-LPAD(row_number,4,'0')` ordered by `created_at` per entity type.  
  Register any new columns in `database_tables` registry.

- [x] **A2** — `v525_platform_add_missing_code_columns.sql`  
  Add `team_code VARCHAR(50) UNIQUE`, `case_code VARCHAR(50) UNIQUE`, `entry_code VARCHAR(50)`, `plan_code VARCHAR(50)`, `meeting_code VARCHAR(50)` to their respective Platform tables.  
  Include back-fill for existing rows immediately after each ALTER TABLE.

- [x] **A3** — `v526_platform_entity_code_triggers.sql`  
  `BEFORE INSERT` triggers on: `projects`, `programmes`, `portfolios`, `risks`, `issues`, `change_requests`, `teams`, `test_cases`, `daily_log_entries`, `stage_plans`, `comm_meetings` (Platform meetings).  
  Each trigger generates the next sequential code in the format `PREFIX-NNNN` if the code column IS NULL on the incoming row.

- [x] **A4** — `v527_platform_entity_code_indexes.sql`  
  Indexes for resolver lookup performance:  
  `(project_code) WHERE is_deleted = FALSE` on projects,  
  `(risk_code, project_id)` on risks,  
  `(issue_code, project_id)` on issues,  
  `(team_code)` on teams, etc.

### Phase 12-B: Database — Simulator (`sim` schema)

- [x] **B1** — `v528_simulator_entity_codes.sql`  
  All-in-one for the Simulator `sim` schema:
  - Add `scenario_code`, `run_code`, `practice_code`, `event_code`, `cert_code` columns (check each table exists before altering)
  - Back-fill existing rows
  - `BEFORE INSERT` triggers for auto-generation
  - Lookup indexes
  - Register new columns in `database_tables` registry

### Phase 12-C: Core resolver utilities (shared — Platform + Simulator)

- [x] **C1** — Create `src/utils/isUuid.js`  
  ```js
  export const isUuid = (str) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str ?? '')
  ```

- [x] **C2** — Create `src/services/entityResolverService.js`  
  One file, two sections — Platform (uses `platformDb`) and Simulator (uses `simDb`).

  **Platform resolvers:**
  - `resolveProjectId(codeOrUuid)` → UUID
  - `resolveProgrammeId(codeOrUuid)` → UUID
  - `resolvePortfolioId(codeOrUuid)` → UUID
  - `resolveRiskId(codeOrUuid, projectId)` → UUID
  - `resolveIssueId(codeOrUuid, projectId)` → UUID
  - `resolveChangeRequestId(codeOrUuid)` → UUID
  - `resolveTeamId(codeOrUuid)` → UUID
  - `getProjectCode(uuid)` → code string (for URL building)
  - `getProgrammeCode(uuid)`, `getPortfolioCode(uuid)`, etc.

  **Simulator resolvers:**
  - `resolveScenarioId(codeOrUuid)` → UUID (queries `sim.scenarios`)
  - `resolveSimRunId(codeOrUuid)` → UUID (queries `sim.simulation_runs`)
  - `resolvePracticeProjectId(codeOrUuid)` → UUID
  - `getScenarioCode(uuid)` → code string
  - `getSimRunCode(uuid)` → code string

  **Cache strategy:** `sessionStorage`, key pattern `entity_code_<type>_<value>`, 10-minute TTL. UUID-shaped inputs use `isLikelyDatabaseUuid()` for passthrough (strict `isUuid` in `isUuid.js` for tests / v4-only checks).

- [x] **C3** — Create `src/hooks/useEntityId.js`  
  `useEntityId(rawParam, entityType, contextId?)` → `{ uuid, code, loading, error }`  
  - `entityType` values: `'project' | 'programme' | 'portfolio' | 'risk' | 'issue' | 'changeRequest' | 'team' | 'scenario' | 'simRun' | 'practiceProject'`
  - Calls the correct resolver from C2 based on `entityType`
  - `contextId` is the parent UUID (required for per-project scoped entities like risks/issues)
  - Returns `loading: true` while resolution is in-flight
  - Returns both `uuid` (for DB calls) and `code` (for URL building)

- [x] **C4** — Create `src/utils/entityUrlUtils.js`  
  URL builder functions for both systems:

  **Platform builders:**
  - `projectUrl(codeOrUuid, subPath?)` → `/platform/projects/PRJ-0001/subpath`
  - `programmeUrl(codeOrUuid, subPath?)`
  - `portfolioUrl(codeOrUuid, subPath?)`
  - `riskUrl(riskCode, projectCode)` → `/platform/projects/PRJ-0001/risks/RISK-0001`
  - `issueUrl(issueCode, projectCode)`
  - `changeRequestUrl(changeRef)`
  - `projectQueryParam(codeOrUuid)` → `PRJ-0001` (for `?project=` query strings)

  **Simulator builders:**
  - `scenarioUrl(codeOrUuid, subPath?)` → `/simulator/scenarios/SCN-0001/subpath`
  - `simRunUrl(codeOrUuid, subPath?)` → `/simulator/runs/RUN-0001/subpath`
  - `practiceProjectUrl(codeOrUuid, subPath?)`

  All builders: if a UUID is passed instead of a code, call the relevant `get*Code()` resolver to obtain the code first.

### Phase 12-D: Update sidebarRouteUtils.js

- [x] **D1** — Update `src/utils/sidebarRouteUtils.js`  
  `extractPlatformProjectId` / `extractPracticeProjectId` return the raw path segment (UUID **or** code); documented in file header. Callers resolve to UUID via `entityResolverService` / `useEntityId` where needed.  
  `resolveMenuRoutePath()`: `__PROJECT__` and `__PRACTICE__` tokens may hold codes or UUIDs.

### Phase 12-E: Platform page updates

For each page: (1) replace raw `useParams()` / `useSearchParams()` UUID usage with `useEntityId()`, (2) replace all `navigate()` and `Link to=` expressions with the relevant builder from `entityUrlUtils.js`.

- [x] **E1** — Project list page: already emits code-first `platformProjectPath` segment (`Projects.jsx`).

- [ ] **E2** — Project detail / edit / overview pages: resolve incoming `:id` with `useEntityId(id, 'project')` everywhere and emit code-based child links (partially covered by existing `ProjectsDetail` + `usePlatformProjectId`; not exhaustively re-audited).

- [x] **E3** — Project Members page: `?project=` resolved via `useEntityId` + `projectQueryParam` for picker / canonical query string (`ProjectUsers.jsx`).

- [x] **E4** — Risk detail + navigation: `RiskDetail.jsx` uses `useEntityId` + `platformProjectPath`; `RiskCard`, `RAIDLog`, `RiskLinksPanel`, `ProjectRiskSummary`, `RiskRegisterView` (view details), `Risks.jsx` / `RiskList.jsx` (back + detail links) use `platformRiskPath` / `platformProjectPath` with `routeKey`.

- [x] **E5** — Issue detail: `IssueDetailView.jsx` uses `useEntityId` + `platformProjectPath`; RAID issue rows use `platformIssuePath`; `IssueRegisterView` back link uses `platformProjectPath(routeKey)`. Other issue links not exhaustively updated.

- [ ] **E6** — Change Request pages: `changeRequestUrl` helper exists; change routes not wired in `App.jsx` for this pass.

- [x] **E7** — Programme detail: `ProgrammeDetail.jsx` resolves `:id` with `useEntityId(..., 'programme')` and uses resolved UUID for fetches, tabs, and delete. Other programme routes not audited.

- [x] **E8** — Portfolio detail: `PortfolioDetail.jsx` resolves `:id` with `useEntityId(..., 'portfolio')`. Strategy shell / `portfolioUrl` paths elsewhere not exhaustively updated.

- [ ] **E9** — Daily log: `DailyLogView` entry “View details” uses `platformProjectPath(routeKey, 'daily-log', 'entry', …)`. Lessons log, stage plan pages: not updated in this pass.

- [ ] **E10** — Testing centre (test cases): not updated in this pass.

- [x] **E11** — Teams list: `Teams.jsx` navigates with `team_code` when present; `getAllTeams` selects `team_code`. Team detail / other team flows not audited.

- [ ] **E12** — Communications / Meetings pages: not updated in this pass.

- [ ] **E13** — Remaining audit: `useParams()` / hard-coded UUID links not fully grepped and updated.

### Phase 12-F: Simulator page updates

Same pattern as Phase E but for all Simulator routes.

- [ ] **F1** — Simulator scenario list page: still mock-driven (`Scenarios.jsx`); DB-backed links deferred.

- [ ] **F2** — Simulator scenario detail page: mock-driven; `useEntityId` not wired.

- [ ] **F3** — Simulation run pages: not updated in this pass.

- [ ] **F4** — Practice project pages: not updated in this pass.

- [ ] **F5** — All remaining Simulator `useParams()` calls: audit and update

### Phase 12-G: Unit tests (Platform + Simulator)

- [x] **G1** — `src/utils/__tests__/isUuid.test.js`

- [x] **G2** — `src/services/__tests__/entityResolverService.test.js` (core paths mocked)

- [x] **G3** — `src/utils/__tests__/entityUrlUtils.test.js` (subset of builders + mocked resolvers)

- [x] **G4** — `src/hooks/__tests__/useEntityId.test.js`

---

## 6. Backward Compatibility Guarantee

No redirects. No breaking changes. Both UUID and code formats are valid in any URL parameter forever:

```js
// Inside ANY page — works for both PRJ-0001 and 45523ddf-...
const { id } = useParams()
const { uuid, code } = useEntityId(id, 'project')
// uuid → used for all DB queries
// code → used for all Link/navigate URL building
```

Old bookmarks: UUID → `isUuid()` returns true → resolver returns it immediately, zero DB call.  
New links: code → `isUuid()` returns false → one cached DB lookup → UUID for queries.

---

## 7. Build Order

```
A (Platform DB) + B (Simulator DB) — run in parallel
        ↓
C (shared resolver + hook + URL utils)
        ↓
D (sidebarRouteUtils)
        ↓
E (Platform pages) + F (Simulator pages) — work in parallel, highest traffic first
        ↓
G (Tests)
```

---

## 8. Acceptance Criteria

**Platform:**
- [x] Navigating to any project shows `PRJ-NNNN` in the URL bar when `project_code` exists (existing behaviour + DB triggers on new rows after `v526`).
- [x] `/app/project-members?project=<UUID>` can be canonicalised to `?project=PRJ-NNNN` when code resolves (`ProjectUsers.jsx` + `v524` data).
- [x] Risk and issue URLs support codes in path segments (`platformRiskPath` / `platformIssuePath` + detail pages resolve codes).
- [x] Old UUID-based bookmarks still load (passthrough + resolvers).
- [x] New Platform rows: triggers in `v526` (after migration applied).
- [x] Existing NULL codes: `v524` + `v525` back-fill scripts (run on deploy).

**Simulator:**
- [ ] Scenario URLs show `SCN-NNNN`, run URLs show `RUN-NNNN` in UI (schema + `v528` ready; list/detail pages still mock).
- [x] Simulator backward compat: UUID path segments still valid once UI reads real rows.
- [x] New simulator rows: triggers in `v528` (after migration applied).

**Both:**
- [ ] Browser back/forward navigation: spot-check recommended post-deploy.
- [x] `entityResolverService` uses `platformDb` vs `simDb` per entity type.
- [x] No cross-schema queries in resolver implementation.

---

## 9. Standing Rule — Both Systems Always

> From this plan forward, every implementation plan for any feature that touches URLs, entity references, DB tables, forms, or list pages **must** address both Platform and Simulator as parallel first-class concerns within the same phases — never as a separate final phase.

---

## 10. Review Section

**2026-05-01 — Implementation status**

- SQL delivered as **`v524`–`v528`** (renumbered from plan draft to avoid collision with existing `v519`–`v520` local-data migrations).
- Shared JS layer complete: `isUuid.js`, `entityResolverService.js`, `useEntityId.js`, `entityUrlUtils.js`, `platformRiskPath` / `platformIssuePath` on `projectRouteParam.js`.
- High-traffic Platform updates: **Project members (E3)**, **risk/issue detail + RAID + key risk navigation (E4/E5 partial)**.
- **Deferred:** full `useParams` audit (E13), lessons log + stage plans + testing centre + comms/meetings (E9–E10, E12), structured/PRINCE2 and other `/app/projects` / `/projects` navigations (large grep set), all Simulator UI (F1–F5), exhaustive change-request routing (E6).
- **Latest (same session):** `ProgrammeDetail` / `PortfolioDetail` `useEntityId`; RAID / Risks / Issues / issue & risk registers / `DailyLogView` / `RiskList` / `ProjectRiskSummary` + `ProjectsDetail` use `platformProjectPath` / `platformRiskPath` with `routeKey`; `Teams` + `teamService.getAllTeams` use `team_code` in list URLs.
- **Tests:** `isUuid`, `entityResolverService`, `entityUrlUtils`, `useEntityId`, extended `projectRouteParam` tests.
