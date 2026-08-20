# v861 — Success Confirmation Modal (System-Wide) — PRD

**Repos:** `E:\project-nidus` (Platform + Simulator) **and** `E:\project-nidus-admin` (companion, separate implementation per the cross-codebase import ban).
**Companion plans:** `projectplan/v861_success_confirmation_modal_plan.md` (Platform/Simulator) and `E:\project-nidus-admin\projectplans\v202_success_confirmation_modal_plan.md` (Admin).
**Status:** ⚙️ Implemented — Platform/Simulator half (see `projectplan/v861_success_confirmation_modal_plan.md`); Admin companion (D6) not yet started, manual browser verification still outstanding.

---

## a) Problem statement

CLAUDE.md rule 16 requires that after any successful create/update, the user sees confirmation with record-specific information (ID, operation performed). In practice this is implemented **five different ways** across Platform/Simulator alone, and a sixth way in Admin:

1. **Nothing at all** — `RiskForm.jsx` gives zero feedback on save; the caller just refetches and closes the form silently.
2. **Native browser `alert()`** — `IssueForm.jsx` uses an unstyled, blocking `alert()` with the record reference and operation embedded in the message string.
3. **Toast + immediate auto-navigate** — e.g. `BusinessCaseCreate.jsx` fires a toast and navigates away in the same tick; the user never has to (or gets to) actually read it.
4. **Toast-only, no navigation** — the dominant idiom, `useToastContext().success(...)`, used 773+ times across 184 Platform/Simulator files.
5. **Inline dismissible banner** — `CrudSuccessBanner.jsx` (duplicated per-app, only used on 3 pages: Form Template Builder, Stakeholder Assessment Matrix ×2) — the pattern in the reference screenshot.
6. **Admin's own toast system** — `AdminToast.jsx`'s `showSuccess()`, used 230 times across 111 files, Admin's own documented standard (its CLAUDE.md rule 13), architecturally separate from Platform/Simulator's toast.

None of these force the user to actually acknowledge the confirmation before continuing, and the inconsistency means the same kind of action (saving a record) looks and behaves differently depending on which page you're on.

## b) Solution

Introduce a **blocking success-confirmation modal** — a small dialog with the record's display ID, the operation performed (created/updated/deleted), and a single **OK** button the user must click to dismiss. Build it once as a shared component/hook for Platform+Simulator (`packages/ui` + `packages/shared`) and once as a parallel, architecturally-separate companion for Admin (its own `packages/ui`, built on its existing `AdminModal`) — per the cross-codebase import ban, these can never share code, only the same design intent.

This **replaces toast as the mechanism for all CRUD (create/update/delete) success confirmations**, system-wide, per an explicit decision in this PRD (see D1). Given the scale (~1,000+ existing call sites across both codebases), the actual migration is **opportunistic**, not a one-shot sweep (see D2): the shared component ships now, CLAUDE.md rule 16 is updated to mandate it for all NEW and AMENDED create/update/delete flows, a small starting batch of the worst-offending existing pages is fixed now, and the remaining ~1,000 existing toast calls migrate naturally as each page is next touched.

OK always closes the modal. Whether it *also* navigates the user away is a per-call-site choice the calling page makes (see D3) — a terminal "Create Risk" flow can navigate to the risk's detail page on OK, while an iterative multi-save flow like the Form Template Builder in the reference screenshot can stay put so the user keeps working.

## c) User stories

1. As any user who successfully creates, updates, or deletes a record (on a page that has adopted the new pattern), I see a modal with the record's display ID and what happened, and I must click OK to dismiss it — I can't accidentally miss it the way I can miss a toast.
2. As a user on an iterative multi-save page (e.g. building out a form template field by field), clicking OK keeps me on the page so I can keep working, instead of being bounced back to a list after every save.
3. As a user on a terminal action (e.g. "Create Risk" from a blank form), clicking OK takes me to the new record (or back to the list), matching what "done" means for that specific flow.
4. As a user who deletes a record, I see the same modal pattern confirming the deletion and its ID, instead of the record just silently disappearing from a list.
5. As a keyboard user, I can dismiss the modal by pressing Enter (OK is auto-focused) or Escape, without reaching for the mouse.
6. As a screen-reader user, the modal's content (not just its title) is announced when it opens, including the operation and record ID.
7. As a developer building a new create/edit page, I import one hook (`useSuccessModal` on Platform/Simulator, the Admin equivalent in Admin) and get consistent behavior, icon, color, and copy-to-clipboard-ID affordance for free — matching CLAUDE.md rule 16.1's mandate to prefer the display ID over the raw UUID.
8. As a PMO Admin looking at the Form Template Builder specifically (the reference screenshot's page), I see the exact same information I see today (template code, operation, version number) but in a modal I must acknowledge, and — because this page is an iterative multi-save flow — I stay on the page after clicking OK.
9. As a maintainer, the three pages currently using the duplicated, app-specific `CrudSuccessBanner.jsx` component migrate to the new shared modal, and the dead `CrudSuccessBanner.jsx` files get removed from both apps.
10. As a maintainer, `RiskForm.jsx` (currently silent on save) and `IssueForm.jsx` (currently a native `alert()`) get fixed to use the new modal as part of this same initial batch, since both are clear existing rule-16 violations/anti-patterns independent of this broader migration.
11. As a developer touching any OTHER existing page that still uses `toast.success()` for a CRUD save, CLAUDE.md rule 16 now tells me to migrate that call site to the new modal as part of my change, per the established "amend rule" pattern already used elsewhere in this codebase (e.g. rule 28.1).
12. As an Admin user, I get the equivalent experience on Admin pages that adopt the new pattern — same OK-to-dismiss, display-ID-first, operation-labeled modal, built on `AdminModal` to match Admin's existing visual language.

## d) Implementation decisions

**D1 — Scope: replaces toast for ALL CRUD success, not just primary-page saves.** Confirmed explicitly by the user over the narrower "primary create/edit page only" alternative. Toast remains in use for genuinely non-CRUD notifications (errors, warnings, background-job status, info messages) — this plan only concerns success confirmations for create/update/delete.

**D2 — Rollout: foundation + opportunistic adoption, not a full sweep.** Given ~1,000+ existing call sites, this plan:
   - Ships the shared modal/hook (Platform+Simulator now; Admin now, per D6).
   - Fixes a small starting batch of existing pages (D5).
   - Updates CLAUDE.md rule 16 (both repos) to mandate the new modal for all NEW and AMENDED create/update/delete flows.
   - Leaves the remaining existing `toast.success()`/`showSuccess()` CRUD call sites to migrate opportunistically, matching the established pattern for rule 52 (unsaved-changes guard) and rule 28.1 (theme-aware "amend rule").
   - **This is a deliberate, explicit exception to "no full sweep":** rule 16 will now read as mandatory for all CRUD success going forward, but this PRD does not claim the ~1,000 existing call sites are compliant on day one — they are pre-existing debt with a defined migration trigger (next touch), not a backlog this plan silently declares resolved.

**D3 — Navigation is per-call-site, not global.** `showSuccessModal({..., onOk })` — the modal always closes on OK; if the caller passes an `onOk` callback (e.g. `() => navigate('/platform/risks')`), that runs after close. No implicit default navigation is applied by the hook itself — the calling page always makes this choice explicitly, since "is this save terminal or iterative" is page-specific knowledge the shared component can't guess.

**D4 — API shape (Platform/Simulator).** New hook `useSuccessModal()` in `packages/shared/src/hooks/useSuccessModal.js`, mirroring Admin's existing `useConfirmAction()` shape (local per-page hook, not a global provider/context — simpler than `ToastContext`'s provider pattern and consistent with the one existing local-hook precedent in this codebase):
   ```js
   const { showSuccess, modal } = useSuccessModal()
   // ...
   showSuccess({ recordId: 'RISK-2026-014', operation: 'created', message: 'Risk created successfully.', onOk: () => navigate(...) })
   // in JSX: {modal}
   ```
   Presentational component: `packages/ui/src/SuccessConfirmationModal.jsx`, built on the existing `Modal.jsx` (`size="sm"`, single primary `Button` footer, `closeOnOverlayClick={false}` so a stray click can't silently dismiss a confirmation the user is meant to actively acknowledge). Shadow-copied to `apps/platform/src/{hooks,components/ui}/` and `apps/simulator/src/{hooks,components/ui}/` per this codebase's established convention for shared-package code.

**D5 — Starting retrofit batch (this plan, not opportunistic).** Fixed now, as part of shipping the foundation:
   - `RiskForm.jsx` (Platform + Simulator) — currently gives no feedback at all on save; a genuine existing rule-16 violation, not just a migration candidate.
   - `IssueForm.jsx` (Platform + Simulator) — currently uses native `alert()`; the closest existing thing to "blocking + OK" in the codebase, and the most jarring/inconsistent visually.
   - `FormTemplateBuilder.jsx`, `StakeholderAssessmentMatrixPage.jsx`, `PracticeStakeholderAssessmentMatrixPage.jsx` (Platform + Simulator, 6 files total) — migrate off the duplicated `CrudSuccessBanner.jsx` onto the new shared modal; delete the now-dead `CrudSuccessBanner.jsx` files (both app copies).
   - `FormTemplateBuilder.jsx` specifically defaults to **no navigation on OK** (matches today's behavior — the banner dismisses, the page stays put for continued editing), demonstrating the D3 per-call-site pattern for iterative flows.

**D6 — Admin companion, built now.** Confirmed explicitly by the user over deferring Admin. Admin gets its own `useSuccessModal()` (`E:\project-nidus-admin\packages\ui\src\useSuccessModal.jsx`), mirroring the existing `useConfirmAction.jsx` shape almost exactly, built on the existing `AdminModal` component. `AdminModal` already supports a single-button "Close"-style footer when `onConfirm` is omitted (`cancelLabel === 'Cancel' ? 'Close' : cancelLabel` — passing `cancelLabel="OK"` gets the exact single-OK-button footer needed with **zero changes to `AdminModal` itself**). Admin's CLAUDE.md rule 13 ("Prefer `display_id` in success toasts") gets a companion note added, mirroring D2's rule-16 update.

**D7 — Best-practice details (explicitly requested by the user):**
   - Auto-focus the OK button on open; Enter and Escape both dismiss (matching `Modal.jsx`'s existing `closeOnEscape` support) — fast, keyboard-first dismissal matters a lot once this is the path for *every* CRUD save.
   - Display the record's **display ID** (rule 16.1), never the raw UUID.
   - A small "Copy ID" action next to the displayed ID (clipboard), useful for support/config workflows.
   - Icon + color by operation: created/updated = green `CheckCircle2` (matches the existing `CrudSuccessBanner`/toast success color, preserving visual continuity through the migration), deleted = amber/red `Trash2` or similar — never introduce a *new* color language users have to relearn.
   - The modal's body content (not just its title) is included in the screen-reader announcement `Modal.jsx` already fires on open — extend that announcement to include the operation + record ID, not just the modal title.
   - Reset the calling form's "dirty" baseline (`useUnsavedChangesGuard`) **before** showing the success modal and **before** any `onOk` navigation runs, so the unsaved-changes guard never double-prompts on top of a save the user just confirmed — mirrors the `bypassRef` pattern already used in `UnsavedChangesContext.jsx`.
   - No "don't show this again" / suppress option — would directly undermine D1's "all CRUD success, everywhere" decision; noted here only to record that it was deliberately not added, not overlooked.

## e) Testing decisions

- Unit tests for `useSuccessModal()` (Platform/Simulator and Admin, separately): `showSuccess()` opens the modal with the right content; OK closes it; `onOk` callback fires after close, not before; no `onOk` = closes with no side effect.
- Component tests for `SuccessConfirmationModal.jsx` / Admin's equivalent: renders display ID + operation + Copy-ID action; OK button is focused on open; Escape dismisses; overlay click does NOT dismiss (`closeOnOverlayClick={false}`).
- Regression tests for the D5 batch: `RiskForm.jsx` now shows the modal on save (previously nothing); `IssueForm.jsx` shows the modal instead of calling `window.alert`; the three `CrudSuccessBanner` pages show the modal with equivalent information, and `FormTemplateBuilder.jsx` specifically does NOT navigate away on OK.
- Manual browser check (Platform, Simulator, Admin — one page each from the D5 batch): confirm dark/light theme, keyboard dismissal, and that the unsaved-changes guard doesn't double-prompt after a save.
- **"Done" bar:** the shared hook/component exists and is tested in both repos; the 8 D5 files are migrated and tested; CLAUDE.md rule 16 (both repos) is updated with the mandate and the opportunistic-migration expectation; no attempt is made to claim the remaining ~1,000 pre-existing call sites are "done."

## f) Out-of-scope items

- **O1 — Full sweep of all ~1,000 existing `toast.success()`/`showSuccess()` CRUD call sites.** Explicitly deferred to opportunistic, next-touch migration (D2).
- **O2 — Undo affordance inside the delete confirmation.** Not requested; would be a meaningful separate feature (soft-delete/restore), noted as a possible future enhancement only.
- **O3 — Suppress/"don't show again" option.** Deliberately not built (D7) — would contradict D1.
- **O4 — Retiring the Toast system entirely.** Toast remains the correct tool for errors, warnings, and non-CRUD info messages; this plan narrows what toast is used *for*, it doesn't remove it.
- **O5 — Any new database/SQL work.** This is a pure frontend UI-pattern change; no schema, table, or RLS changes are implied anywhere in this PRD.

## g) Further notes

- The two implementations (Platform/Simulator vs. Admin) are deliberately **not** shared code, per the standing cross-codebase import ban (CLAUDE.md rule 46 / Admin rule 34.5) — this PRD covers both because the user asked for both now, but each repo's plan file is the authoritative execution record for its half.
- `AdminModal`'s existing single-button "Close" footer mode (used when `onConfirm` is omitted) turns out to already be exactly what an OK-only success modal needs — no changes to `AdminModal` itself are required, only a new hook wired on top of it (D6).
- This PRD intentionally does not attempt to enumerate all ~1,000 existing call sites; that inventory work belongs to whoever picks up each page opportunistically, not to this plan.
