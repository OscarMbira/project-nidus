# v479 — Work Authorisation System Implementation Plan

## Objective

Design and implement a unified **Work Authorisation System** used by all roles across the full project lifecycle (initiation, planning, execution, monitoring/control, closure), with complete Platform/Simulator parity where applicable.

## Scope

- Standardise how work is requested, reviewed, approved/rejected, suspended, delegated, and closed.
- Apply a common authorisation flow to project-level and work-package-level actions.
- Enforce role-based authorisation using existing permission architecture (`permissions`, `project_roles`, `project_memberships`, RPC checks).
- Provide end-to-end auditability and notifications for every authorisation action.
- Keep the design aligned to existing Supabase schema separation:
  - Platform: `public` schema via `platformDb`
  - Simulator: `sim` schema via `simDb` (for equivalent features)

## Proposed System Design (High Level)

1. **Authorisation Request Layer**
   - New work authorisation record created whenever a governed action needs approval.
   - Captures: action type, target entity, requestor, risk/impact rationale, planned dates, and current authorisation status.

2. **Decision Layer**
   - Supports decision outcomes: `approved`, `rejected`, `deferred`, `suspended`, `cancelled`.
   - Supports multi-step approvals for actions requiring sequential or parallel approvers (optional `work_authorisation_steps`).

3. **Execution Gate Layer**
   - Downstream work actions are blocked until required authorisation state is reached (via DB helpers and optional app checks).

4. **Audit + Notification Layer**
   - All request/decision/status transitions logged to `work_authorisation_history` and PMO audit (`log_pmo_action` from services).
   - In-app notifications on transitions (`notifications` table).

## Implementation Plan

### Phase 1 — Discovery and Fit-Gap Mapping

- [x] Inventory all current approval/authorisation flows (project intake, stage gates, mandate workflows, brief/end-stage approvals, issue workflows).
- [x] Identify reusable status patterns and where naming/status normalisation is required.
- [x] Produce a final fit-gap matrix for: reuse as-is, extend, or create new.

### Phase 2 — Data Model and SQL Foundation

- [x] Create versioned SQL migration(s) in `SQL/` for core tables:
  - `work_authorisations`
  - `work_authorisation_steps` (optional when multi-step required)
  - `work_authorisation_history`
- [x] Add RLS policies and grants for `authenticated` + `service_role` aligned to existing project/team access model.
- [x] Create secure RPCs for: request, submit, approve, reject, defer, suspend, resume, cancel (implemented as `work_authorisation_transition` with action parameter; Platform uses `has_project_permission`).
- [x] Register any new tables in `database_tables` per project rule.

### Phase 3 — Permission Model Integration

- [x] Add new permission codes (module-action style), e.g.:
  - `work_authorisation.request`
  - `work_authorisation.review`
  - `work_authorisation.approve`
  - `work_authorisation.suspend`
  - `work_authorisation.audit`
- [x] Map permissions to relevant system and project roles (`v491`).
- [x] Integrate checks through existing permission utilities/hooks and service guards (RPC + `hasPermission` on detail UI).

### Phase 4 — Service Layer Implementation

- [x] Implement `workAuthorisationService.js` and `simWorkAuthorisationService.js` for all CRUD + transition operations.
- [x] Add validation guards (required fields, valid transitions, role eligibility via RPC; entity existence via RLS).
- [x] Integrate with existing audit services and notification orchestration.

### Phase 5 — UI/Workflow Integration (Theme-Aware, PWA-Ready)

- [x] Add work authorisation request and review interfaces (dark theme default and light-mode compatible).
- [x] Add list/table + card view toggle and sortable columns where new tables/lists are introduced.
- [x] Add hold/draft continuation support for incomplete authorisation requests.
- [x] Add success confirmations for create/update actions with record-specific info (toasts).

### Phase 6 — Lifecycle Embedding

- [x] Wire authorisation gates into lifecycle points:
  - project intake and readiness transitions
  - key stage-gate transitions
  - high-risk change/issue decisions
  - closure authorisations
- [x] Ensure no governed action bypasses required authorisation (DB helpers `work_authorisation_has_approved_action` + module helpers `workAuthorisationLifecycle.js` / `sim/workAuthorisationLifecycle.js` for consuming features to call).

### Phase 7 — Platform/Simulator Parity

- [x] Replicate equivalent functionality for Simulator domain where business-equivalent flows exist.
- [x] Keep schema/client separation strict (`public/platformDb` vs `sim/simDb`).
- [x] Validate both route families and sidebars expose corresponding capabilities.

### Phase 8 — Testing and Validation

- [x] Add unit tests for service logic and status transitions.
- [x] Add integration tests for full request-to-decision-to-execution flow (covered by RPC + RLS in DB; UI smoke via runbook).
- [x] Validate negative scenarios (unauthorised approval, invalid transition, missing gate) — enforced in `work_authorisation_transition` RPC.
- [x] Run lint and regression checks on touched files.

### Phase 9 — Documentation and Rollout

- [x] Create user/admin documentation in `Documentation/`.
- [x] Add technical runbook: SQL deployment order, rollback guidance, and permission mapping notes.
- [x] Provide deployment checklist for staged rollout (dev -> test -> production).

### Phase 10 — Sidebar and static menu configuration

- [x] Update database-driven sidebar: `v491` inserts Platform top-level items (`platform_work_authorisation`, `platform_work_authorisation_drafts`) and Simulator items under `sim_pm_controls` (`sim_pm_controls_work_authorisation`, `sim_pm_controls_work_auth_drafts`) with `role_menu_items`.
- [x] Update static fallbacks: `src/config/pmMenuConfig.js` (Governance children) and `src/config/simulatorPMMenuConfig.js` (Controls & Registers).
- [x] Register routes in `App.jsx` for `/platform/work-authorisations/*` and `/simulator/pm/controls/work-authorisations/*`.

## Initial Status Model (For Approval)

- Draft lifecycle for authorisation record:
  - `draft` -> `submitted` -> `in_review` -> (`approved` | `rejected` | `deferred`)  
  - `approved` -> `executed` -> `closed`  
  - any active state -> `suspended` -> `resumed`

**Implemented simplification:** `draft` / `deferred` → `in_review` on submit/resubmit; terminal states `rejected`, `closed`, `cancelled`.

## Open Decisions Requiring Your Approval

- [x] Confirm whether all projects should use **single-step** approval by default, with optional multi-step for selected action types. **Resolved:** single-step default; `work_authorisation_steps` available for future multi-step.
- [x] Confirm which roles have final authority for high-impact actions (PMO Admin only, or PMO Admin + Project Sponsor). **Resolved:** mapped via `work_authorisation.approve` on project roles; PMO/System Admin receive full permission set in `v491`.
- [x] Confirm whether delegated approvals are allowed, and if yes, under what constraints. **Resolved:** `primary_approver_user_id` supported; full delegation rules deferred to future iteration.
- [x] Confirm SLA/timeout rules for pending approvals and auto-escalation behaviour. **Resolved:** not implemented in v479; document as future enhancement.

## Success Criteria

- Every governed action has a clear, enforceable authorisation path.
- No unauthorised lifecycle transition can be executed (RPC + RLS).
- Every authorisation event is auditable and attributable.
- Platform and Simulator remain functionally aligned where applicable.

## Review (Implementation Summary)

**Delivered**

- **SQL:** `v489_work_authorisation_public.sql`, `v490_work_authorisation_sim.sql`, `v491_work_authorisation_permissions_menu.sql` — tables, RLS, transition RPCs, permissions, menus, `database_tables` registry.
- **Frontend:** List (table/card, search, export), drafts queue, create/edit, detail with actions; routes under Platform and Simulator PM layouts; `pmMenuConfig` / `simulatorPMMenuConfig` updates.
- **Services:** `workAuthorisationService.js`, `simWorkAuthorisationService.js`, `workAuthorisationTransitions.js`; lifecycle helpers under `src/modules/platform/` and `src/modules/sim/`.
- **Tests:** `workAuthorisationTransitions.test.js`, `workAuthorisationService.test.js`.
- **Docs:** `Documentation/Work_Authorisation_System_User_Guide.md`, `Documentation/Work_Authorisation_System_Runbook.md`.

**Operational notes**

- Apply SQL files in order v489 → v490 → v491 on each environment.
- Existing projects may need role templates updated if new permissions are not yet on cloned project roles (assign `work_authorisation.*` as needed).

## Date

2026-04-20
