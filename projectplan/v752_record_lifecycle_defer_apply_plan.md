# v752 — Record Lifecycle Defer-Apply Plan (Platform + Simulator)

**Created:** 2026-07-06  
**Status:** Complete  
**Builds on:** `v751_approval_justification_and_field_lock_plan.md` (Complete), `v639_Record_Lifecycle_Management_Plan.md`  
**Companion (admin):** `project-nidus-admin/projectplans/v18.0_record_lifecycle_defer_apply_plan.md`

---

## 0. Problem statement

v751 shipped mandatory authoriser justification and field lock, but Platform/Simulator still suffered the same **immediate-apply defect** admin fixed in v18.0: governed edits wrote new values onto the live row before approval, so authorisers saw unapproved data and reject could not restore prior values.

## 1. Investigation findings (Category A `_history` / `_archive`)

| Area | Finding |
|------|---------|
| `public.submit_for_authorisation` (v654) | Only flipped `record_status = 'unauthorised'` — never staged or restored field values |
| `public.transition_record_status` (v654) | No `reject` operation; `validate` did not merge pending field changes |
| `public.process_authoriser_decision` (v654) | Reject updated request rows only — did not revert live data |
| Category A `_history` / `_archive` tables (v652) | Used for archive workflow; **not** populated on amend/submit |
| Live row mutations | `updateRisk`, `updateIssue`, `updateProject`, etc. wrote directly to live tables before any lifecycle gate |

**Conclusion:** Category A physical table split does **not** fix immediate-apply. A defer-apply `record_pending_changes` staging table (admin v123–v124 pattern) is required for `public` and `sim` schemas.

## 2. Design

Mirror admin defer-apply:

- `record_pending_changes` — one row per in-flight edit; `proposed_changes` JSONB holds **new** values only; live row keeps last-approved values until `validate` merges
- `submit_for_authorisation` — accepts `p_proposed_changes`; upserts pending row; sets `unauthorised` without touching other columns
- `transition_record_status` — `validate` merges pending; `reject` deletes pending and restores `previous_status`
- `process_authoriser_decision` — reject path calls `transition_record_status(..., 'reject')`
- `get_pending_changes` — returns proposed + current (approved) values for diff UI

## 3. Implementation checklist

- [x] **SQL v750** — `public.record_pending_changes` + `sim.record_pending_changes` infrastructure and RLS
- [x] **SQL v751** — public defer-apply functions (merge, get, enhanced submit/transition/process)
- [x] **SQL v752** — sim schema mirror functions + physical table name resolution
- [x] **Frontend** — `PendingChangesDiff` in `@nidus/ui`; `fetchPendingChanges` in lifecycle services
- [x] **Authorisation queue** — diff shown in `AuthorisationRequestModal` decide mode (platform + simulator)
- [x] **Governed update gate** — `@nidus/shared/utils/lifecycleGovernedUpdate` (`tryGovernedLifecycleUpdate`)
- [x] **Pilot wiring** — platform `updateRisk`, `updateIssue`, `updateProject`; simulator `updatePracticeRisk`
- [x] **Docs** — `Documentation/Record_Lifecycle_Management_Guide.md` defer-apply section
- [x] **Tests** — unit tests for governed update helper and PendingChangesDiff
- [ ] **Follow-up:** wire remaining governed tables (change_requests, tasks, defects, Category B reports, etc.) to `tryGovernedLifecycleUpdate`

## 4. SQL apply order

After v651–v659 lifecycle baseline:

1. `SQL/v750_record_pending_changes_infrastructure.sql`
2. `SQL/v751_record_lifecycle_defer_apply_functions.sql`
3. `SQL/v752_sim_record_lifecycle_defer_apply_functions.sql`

## 5. Manual test checklist

1. Configure lifecycle approval + authorisers for `risks` on a project.
2. Edit a live risk field → save → row stays at **approved** values; status becomes `unauthorised`.
3. Open **Pending Approvals** → Review → diff shows Current vs Proposed.
4. Approve → proposed values merge; status `live`.
5. Repeat edit → Reject → live values unchanged; status restored to `live`.
6. Repeat on `issues` and `projects` (platform) and `practice_risks` (simulator).

## 6. Review

| Area | Change |
|------|--------|
| SQL v750–v752 | Pending changes tables + defer-apply RPCs (`public` + `sim`) |
| `@nidus/shared/utils/lifecycleGovernedUpdate` | Build proposed diff; route governed saves through submit RPC |
| `@nidus/ui/PendingChangesDiff` | Original vs proposed table in authorisation modal |
| Platform services | Risk, issue, project update gates |
| Simulator | `simRecordLifecycleService` RPC wiring; `practiceRiskService` gate |
| v751 plan | Investigation marked complete; defer-apply follow-up closed |

**Deferred:** bulk wiring of all registry tables; Phase 3 `RecordLifecycleToolbar` per-record integration (v751).
