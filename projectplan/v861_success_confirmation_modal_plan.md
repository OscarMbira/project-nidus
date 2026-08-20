# v861 — Success Confirmation Modal (Platform + Simulator) — Implementation Plan

**PRD:** `projectprd/v861_success_confirmation_modal_PRD.md` — read that first for the "why" behind every decision below.
**Admin companion plan:** `E:\project-nidus-admin\projectplans\v202_success_confirmation_modal_plan.md` (separate implementation, same design intent — cross-codebase import ban means no shared code).
**Repo:** `E:\project-nidus` only.
**Status:** ⚙️ Implemented (Phases 1–3 + 4.5 complete); manual browser/theme verification (4.1–4.4) and push (4.6) still pending — see Review section.

---

## Guiding constraints (from CLAUDE.md + PRD)

- Local per-page hook (`useSuccessModal()`), not a global provider — matches Admin's existing `useConfirmAction()` precedent, simpler than `ToastContext`.
- OK always closes; navigation is opt-in per call site via `onOk` (PRD D3) — never a hook-level default.
- Reuse the existing `Modal.jsx` — do not build new modal chrome from scratch (rule 38.7 reuse principle, same as v853's `RecordPreviewModal`).
- Theme-aware (rule 28.1), keyboard-first (PRD D7).
- Shadow-copy convention: every new/changed file in `packages/ui`/`packages/shared` gets byte-identical copies in `apps/platform/src/...` and `apps/simulator/src/...`.
- This plan does NOT attempt the full ~773-call-site toast sweep — only the PRD D5 starting batch. CLAUDE.md rule 16 update makes the rest opportunistic.

---

## Phase 1 — Shared hook + component

- [x] **1.1** `packages/ui/src/SuccessConfirmationModal.jsx` — built on `Modal.jsx` (`size="sm"`, `closeOnOverlayClick={false}`, `closeOnEscape`). Props: `{ isOpen, onClose, operation, recordId, message, okLabel = 'OK' }`. Icon/color by operation (green `CheckCircle2` for created/updated/unknown-fallback, amber `Trash2` for deleted). Copy-ID action next to the displayed `recordId` (clipboard) — implemented as a non-button `<span role="button" tabIndex={-1}>` specifically so it's excluded from `Modal.jsx`'s auto-focus query, letting the primary OK `Button` (`variant="success"`) get focused instead. `showCloseButton={false}` — no separate header X, since Escape already provides an equivalent no-navigation dismissal.
- [x] **1.2** `packages/shared/src/hooks/useSuccessModal.jsx` (note: `.jsx` not `.js` — it returns JSX; no JSX-in-`.js` precedent exists in this package). Mirrors Admin's `useConfirmAction()` shape: `showSuccess({ recordId, operation, message, onOk, okLabel })` sets state; `handleOk` calls `onOk?.()` then closes; returns `{ showSuccess, modal }`.
- [x] **1.3** Did **not** modify `Modal.jsx`'s screen-reader announcement logic (**deviation, smaller blast radius**) — instead `SuccessConfirmationModal` passes a `title` to `Modal` that already includes the record ID + operation (e.g. `"RISK-2026-014 created successfully"`), so the existing "Modal opened: {title}" announcement automatically includes everything PRD D7 asked for, with zero risk to `Modal.jsx`'s other ~15+ consumers.
- [x] **1.4** Tests: `packages/shared/src/hooks/__tests__/useSuccessModal.test.jsx` (4 tests, registered in `vitest.config.js`'s include list — required adding `@vitejs/plugin-react` to that config, see Deviations) and `packages/ui/src/__tests__/SuccessConfirmationModal.test.jsx` (7 tests, auto-discovered via glob) — both passing.
- [x] **1.5** Synced to `apps/platform/src/{components/ui,hooks}/` and `apps/simulator/src/{components/ui,hooks}/` — the hooks shadow dirs already existed and already followed this exact convention (confirmed before creating).

## Phase 2 — Fix the starting retrofit batch (PRD D5)

- [x] **2.1** `RiskForm.jsx` (Platform + Simulator, byte-identical files) — wired `useSuccessModal()`; create path now also does `.select('risk_code').single()` on insert (previously discarded the response) so the new risk's display code is available for the modal; update path uses the existing `risk.risk_code`. Baseline snapshot reset before showing the modal (unsaved-changes guard). No `onOk` navigation — `onSave` now fires from `onOk` instead of immediately, preserving the caller's existing post-save behavior once acknowledged.
- [x] **2.2** `IssueForm.jsx` (Platform + Simulator, byte-identical) — both `alert()` success calls replaced with `showSuccess(...)`; `onSave` moved into `onOk`. The unrelated validation-error `alert()` calls (rule 16 doesn't cover those) were deliberately left untouched.
- [x] **2.3** `FormTemplateBuilder.jsx` (Platform + Simulator) — both success sites (main save + `handleSaveDefaults`) migrated off the removed `success`/`setSuccess` state onto `showSuccess(...)`; no `onOk` (stays on page, matching prior behavior — the pre-existing immediate `navigate(...)` on create-mode save is unrelated to the modal and was left exactly as-is, firing independently of OK per the original code).
- [x] **2.4** All 3 logical pages × 2 apps confirmed and migrated: `StakeholderAssessmentMatrixPage.jsx` and `PracticeStakeholderAssessmentMatrixPage.jsx` actually exist as **4 files** in `platform-app/`-tree + **2 files** in `simulator/`-tree, each duplicated once more into the other app's own source tree (byte-identical shadow copies, not just Platform/Simulator pairs) — all 4 (+2 `FormTemplateBuilder.jsx`) = the "6 files" the PRD counted. Operation labels normalized from `'create'/'update'/'delete'` to `'created'/'updated'/'deleted'` so the modal's icon/color mapping resolves correctly (the old strings would have silently fallen through to the default green icon even for deletes).
- [x] **2.5** Deleted `apps/platform/src/components/stakeholders/CrudSuccessBanner.jsx` and the Simulator copy — confirmed zero remaining source references first (only stale `.turbo`/`dist` build artifacts referenced it, which don't matter).
- [x] **2.6** Regression tests written for `RiskForm.jsx` and `IssueForm.jsx` (the two files with genuine behavior changes worth guarding: "was silent" → "shows modal", "was `alert()`" → "shows styled modal, `onSave` deferred to OK"). **Deviation/scope-down:** did not write dedicated tests for `FormTemplateBuilder.jsx` or the 4 Stakeholder Assessment Matrix files — the `useSuccessModal()`/`{modal}` wiring pattern is already proven twice in real production components plus thoroughly unit-tested in isolation (Phase 1.4); a third and fourth near-duplicate integration test would have added test-suite weight without meaningfully new coverage. Compensating checks: `grep` confirmed zero dangling `success`/`setSuccess`/`CrudSuccessBanner` references in all 6 files, and the full `apps/platform`/`apps/simulator` suites (1,316 / 1,229 tests) ran clean of any error mentioning these filenames.

## Phase 3 — CLAUDE.md rule update (opportunistic migration trigger)

- [x] **3.1** CLAUDE.md rule 16 updated in place with an "Implementation (mandatory for NEW and AMENDED...)" clause — names `useSuccessModal()`, explains `onOk` is per-flow/never a default, explicitly states this is NOT a retroactive sweep, and links to the PRD/plan.
- [x] **3.2** `Documentation/Success_Confirmation_Modal_v861_Guide.md` written.

## Phase 4 — Verification & rollout

- [ ] **4.1** Manual browser test (Platform) — **not performed this session**: no browser-automation tool or authenticated test credentials available, same limitation already surfaced earlier in this conversation for v852/v853.
- [ ] **4.2** Manual browser test (Simulator) — same blocker, not performed.
- [ ] **4.3** Dark/light theme toggle — not performed live; every new component uses paired `dark:` classes throughout (rule 28.1), reviewed for completeness but not visually confirmed in a running browser.
- [ ] **4.4** Unsaved-changes-guard double-prompt check — not performed live. Mitigated at the code level: `RiskForm.jsx` resets its baseline snapshot before calling `showSuccess`, so `isDirty` is already `false` by the time any subsequent navigation could trigger the guard; this was reasoned through, not empirically observed in a browser.
- [x] **4.5** Full retest suite: `packages/shared` (40 files / 330 tests), `packages/ui` (15 files / 88 tests) — all passing, zero regressions. `apps/platform` (245 files / 1,316 tests) and `apps/simulator` (252 files / 1,229 tests) — both have a large **pre-existing, unrelated** failure baseline (61 and 63 failing files respectively — e.g. `InviteUserForm.test.jsx` failing on a missing mock export for `resolveInvitationRoleIdForInsert`, `SimulationSetup.test.jsx` — nothing to do with this feature). Confirmed via full untruncated logs that **zero** of the 8 touched files (or their new test files) appear anywhere in either failure list. This pre-existing baseline is a separate, real issue worth your attention but is out of scope for this plan to fix.
- [ ] **4.6** Push to GitHub — not done; deferred until explicitly requested, per this session's established practice for this repo.

## Review section

### Summary
Added a blocking "OK to acknowledge" success-confirmation modal, replacing five inconsistent CRUD-success patterns (nothing, `alert()`, toast+auto-navigate, toast-only, one duplicated inline banner) with one shared component + hook. Fixed the starting batch named in the PRD (`RiskForm`, `IssueForm`, `FormTemplateBuilder`, both Stakeholder Assessment Matrix pages) and updated CLAUDE.md rule 16 to make adoption elsewhere opportunistic rather than a forced sweep.

### Files touched
- **New:** `packages/ui/src/SuccessConfirmationModal.jsx`, `packages/shared/src/hooks/useSuccessModal.jsx` (+ 4 shadow copies), 2 new test files, `Documentation/Success_Confirmation_Modal_v861_Guide.md`.
- **Modified:** `packages/ui/src/Modal.jsx` (+ 2 shadow copies) — unrelated pre-existing bug fix, see Deviations; `packages/shared/vitest.config.js` — added `@vitejs/plugin-react`; `RiskForm.jsx`, `IssueForm.jsx`, `FormTemplateBuilder.jsx` (Platform + Simulator, 6 files), `StakeholderAssessmentMatrixPage.jsx` × 2 copies, `PracticeStakeholderAssessmentMatrixPage.jsx` × 2 copies; `CLAUDE.md` rule 16.
- **Deleted:** `CrudSuccessBanner.jsx` (both app copies).
- **New tests:** `RiskForm.test.jsx`, `IssueForm.test.jsx` (`apps/platform/src/components/__tests__/`).

### Deviations from plan
- **1.2:** file is `.jsx` not `.js` (contains JSX; no precedent for JSX-in-`.js` in `packages/shared`).
- **1.3:** did not touch `Modal.jsx`'s announcement internals — passed a richer `title` instead, avoiding any risk to Modal's other consumers.
- **Unplanned fix:** `Modal.jsx` had a pre-existing bug — its screen-reader-announcement cleanup `setTimeout` called `removeChild` unconditionally, throwing `NotFoundError` if the node was already removed (e.g. by rapid open/close in a test). Fixed with `clearTimeout` + a `contains()` guard, matching the existing cleanup's own pattern. Two-line fix to existing logic, not a refactor; synced to both shadow copies.
- **Unplanned config change:** `packages/shared/vitest.config.js` had no JSX/React plugin (unlike `packages/ui`'s) — needed for the new hook's test to render JSX. Added `@vitejs/plugin-react`, scoped via a `/** @vitest-environment jsdom */` docblock in the one test file that needs it; the other 39 (`environment: 'node'`) test files are unaffected — full suite re-run confirmed this.
- **2.6:** scoped down to 2 of 8 files getting dedicated regression tests, per the reasoning above.
- **Concurrent work:** another session was actively iterating on the unrelated v853 (Record View Document Preview) feature throughout this work, touching `Modal.jsx`, `exportUtils.js`, `RecordPreviewModal.jsx`, and others. Their changes were preserved and re-synced where they overlapped with files I also touched (`Modal.jsx`).

### Not done — needs your input
- **4.1–4.4 (manual browser/theme verification):** not performed, same tooling/credential limitation as v852/v853 earlier this session.
- **4.6 (push):** left uncommitted/unpushed pending your explicit request.
- **The pre-existing test-suite failure baseline** (61 files in Platform, 63 in Simulator, unrelated to this feature) is a separate, real issue surfaced during this work — flagging it for your awareness, not attempting to fix it here.

### Follow-ups
- Admin companion (`E:\project-nidus-admin\projectplans\v202_success_confirmation_modal_plan.md`) — not started this session; PRD D6 called for it to be "built now," but this session's time went to the Platform/Simulator half plus the checkpoint I suggested earlier. Ready to pick up on request.
- Opportunistic migration of the remaining ~1,000 existing `toast.success()`/`showSuccess()` CRUD call sites, per CLAUDE.md rule 16's updated text — no tracking mechanism beyond "next touch," by design (PRD D2).
