# v1226 — Itemized / Grouped Expense Claims (Platform + Simulator) — Implementation Plan

See `projectprd/v1226_itemized_expense_claims_PRD.md` for problem statement, user stories, and
settled decisions. This plan breaks the work into vertical slices (tracer bullets per rule
17.2) — each slice is independently shippable and TDD'd (red → green) before moving to the next.

## Todo list

### Phase 1 — Expense Categories lookup + admin CRUD
- [x] SQL `v1226a_expense_categories.sql`: `public.expense_categories` (id, category_code,
      category_name, description, color, is_active, is_deleted, created_at, created_by,
      updated_at, updated_by), RLS (read: any authenticated; write: pmo_admin/system_admin,
      mirroring `project_types` RLS), `database_tables` registration, seed row set (Travel,
      Meals, Accommodation, Supplies, Equipment, Software, Training, Other).
- [x] SQL `v1226b_sim_expense_categories.sql`: `sim.expense_categories` mirror + RLS + seed +
      registration.
- [x] `expenseCategoryService.js` (Platform) — `getExpenseCategories`, `createExpenseCategory`,
      `updateExpenseCategory`, `deleteExpenseCategory`, modeled on `projectTypeService.js`.
      Test first.
- [x] `simExpenseCategoryService.js` (Simulator) — same shape against `sim.expense_categories`.
      Test first.
- [x] `ExpenseCategories.jsx` (Platform, `pages/platform-app/`) — admin CRUD page, modeled
      directly on `ProjectTypes.jsx` (list, add/edit form with Audit tab, delete). Route
      `/platform/pmo-admin/expense-categories`. Wire into `lazyImports.js` → `routeCommon.jsx`
      (import + export) → `platformRoutes.jsx` (import + `<Route>`).
- [x] `ExpenseCategories.jsx` (Simulator) — same page against the sim service/table. **Deviation:**
      lives at `pages/platform-app/ExpenseCategories.jsx` (not `pages/simulator/`), matching
      where Simulator's own `ProjectTypes.jsx`/`ProjectStatuses.jsx` already live (same legacy
      folder-naming precedent) — same component name as Platform's since there's no cross-app
      import to collide with. Route `/simulator/pmo/expense-categories` (Simulator's actual
      `pmo/` prefix convention, not `pmo-admin/` as originally sketched). Same 3-file wiring in
      the Simulator app's route files.
- [x] SQL `v1226c_expense_categories_menu.sql`: `menu_items` + `role_menu_items` for both new
      admin routes, modeled on `v153_pmo_admin_project_types_statuses_menu.sql` (parent =
      `pmo_admin_section` equivalent in each app's hierarchy, pmo_admin/system_admin only).
- [ ] Update `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` (rule 70) for the two new
      leaves. **Deviation:** skipped — the Financial Management hub / PMO Admin reference-data
      area isn't represented in that taxonomy at all (My Expenses, Expense Approvals, Expense
      Thresholds were never added there either when they shipped), so adding only this one new
      leaf would be inconsistent. Flagged to the user rather than silently fixed or skipped.

### Phase 2 — Line items data model (Platform + Simulator)
- [x] SQL `v1226d_project_expense_claim_items.sql`: `public.project_expense_claim_items` (id,
      expense_claim_id FK → project_expense_claims ON DELETE CASCADE, description, amount,
      category_id FK → expense_categories ON DELETE SET NULL, display_order, created_at,
      updated_at), RLS inherited via parent claim access (same EXISTS-join pattern as
      `expense_approval_steps`), `database_tables` registration.
- [x] SQL `v1226e_sim_project_expense_claim_items.sql`: `sim.project_expense_claim_items`
      mirror, FK → `sim.project_expense_claims`, RLS via parent claim, registration.
- [x] `expenseClaimService.js`: extend `saveDraft(payload)` to accept `payload.items` (array of
      `{description, amount, category_id}`); when present and non-empty, compute
      `amount = sum(items)` before the claim upsert, then delete-all + re-insert
      `project_expense_claim_items` for that claim id (same pattern as
      `projectBudgetCategoryService.saveForProject`). Add `getExpenseClaimItems(claimId)`.
      Test first (sum computation, delete+reinsert, draft-only write guard).
- [x] `simExpenseClaimService.js`: same extension to `saveSimDraft` +
      `getSimExpenseClaimItems(claimId)` against `sim.project_expense_claim_items`. Test first.

### Phase 3 — Itemized table UI component
- [x] `@nidus/ui` `ExpenseItemsTable` (or similar) — new shared component: `#` row number
      (rule 44), description input, category `SelectField` (rule 69 — category list is short
      today but use `SelectField` for consistency/future-proofing), amount `SmartAmountInput`
      (rule 36), inline edit/delete (`RowActionButton`, rule 61), "Add item" row, running total
      footer. Props: `items`, `onChange`, `categories`, `readOnly`. Test first (add/edit/delete/
      sum, read-only mode renders no action buttons).
- [x] Verify the component renders correctly in both light/dark (rule 28.1) and at phone width
      (rule 29).

### Phase 4 — Platform: wire itemization into My Expenses + Claim Detail
- [x] `MyExpenses.jsx`: add "Itemize this expense" toggle in the New claim form. When on: show
      `ExpenseItemsTable` (editable), Amount field becomes read-only display of the live sum.
      When off: today's single Amount input, unchanged. Validation: toggled-on with zero items
      blocks save (toast error), each item amount > 0. Test first (toggle shows/hides, sum
      drives Amount, zero-item block, draft load restores items + toggle state).
- [x] `ExpenseClaimDetail.jsx`: Details tab shows `ExpenseItemsTable` (`readOnly`) under the
      claim fields when `items.length > 0`; nothing extra rendered when the claim has no items
      (keeps today's simple-claim look unchanged). Test first.
- [x] `ExpenseApproval.jsx`: pending-claim cards show the itemized breakdown (read-only,
      collapsed/expandable consistent with the existing History toggle) when a claim has items.
      Test first.

### Phase 5 — Simulator: finish the expense-claims UI to parity
- [x] `SimMyExpenses.jsx`: rebuild from the current read-only list into the same New claim/My
      claims tabbed experience as Platform's `MyExpenses.jsx` (labelled fields, project picker
      scoped to the user's practice projects, itemization toggle, draft save/submit/edit/
      delete), reusing `ExpenseItemsTable`. Test first — mirror `MyExpenses.register.test.jsx`
      / `.labels.test.jsx` / itemization tests against the sim service.
- [x] New `SimExpenseClaimDetail.jsx` (routed page, `simulator/expenses/my/:id`), mirroring
      `ExpenseClaimDetail.jsx` including the Audit tab (rule 63.1) and itemized breakdown. Wire
      3-file routing (lazyImports/routeCommon/simulatorRoutes) in the Simulator app.
- [x] `SimExpenseApproval.jsx`: replace the stub with a real approvals review screen mirroring
      `ExpenseApproval.jsx` (pending list, Approve/Reject/History, fully-approved/paid queue for
      PMO-equivalent), against `simExpenseClaimService.js` additions (`getSimPendingApprovals`,
      `approveSimStep`, `rejectSimStep`, `markSimPaid`, `getSimApprovalHistory`,
      `getSimFullyApprovedClaims` — same shape as Platform's). Shows itemized breakdown per
      claim like Phase 4's Platform equivalent. Test first.
- [x] `SimExpenseApprovalThresholds.jsx`: replace the stub with a real form mirroring
      `ExpenseApprovalThresholds.jsx`, against `sim.expense_approval_thresholds` (`listSim
      Thresholds`/`saveSimThreshold` additions to `simExpenseClaimService.js`). Test first.
- [x] SQL `v1226f_sim_expense_thresholds_route.sql`: **not needed** — on inspection, the
      `simulator/pmo/expense-thresholds` route and its `menu_items` entry already existed
      (`SQL/v988_phase2_pmo_configuration_menu_items.sql`); the original plan's assumption that
      Simulator had no thresholds route was wrong. Only the page's actual content was missing,
      which is covered by the `SimExpenseApprovalThresholds.jsx` item above.

### Phase 6 — Export
- [x] Extend `ExpenseClaimDetail.jsx`'s export (and its Simulator equivalent) to include
      itemized lines per rule 38: Excel — one item per row under the claim's fields; Word/PPT/
      PDF — itemized list under the claim fields; claim list exports (My Expenses, Expense
      Approvals) stay one row per claim with just the total (no change there). Test first.

### Phase 7 — Review
- [x] Run full affected test suites (`src/pages/platform-app`, `src/pages/simulator`,
      `src/services/__tests__` as applicable) in both apps.
- [x] Apply `REVIEW.md` checks.
- [x] Add the Review/Result section to this plan file summarising what shipped, deviations (if
      any), and residual risks.
- [x] Report changed files + validation performed back to the user; ask about SQL execution
      (user runs migrations manually per established workflow) and whether to commit.

## Review Summary

- Change: itemized/grouped expense claims (Platform + Simulator), new `expense_categories` lookup + admin CRUD (both apps), finished Simulator's previously-stubbed expense-claims UI (New claim/My claims, approvals review, thresholds admin) to parity with Platform.
- PRD: `projectprd/v1226_itemized_expense_claims_PRD.md`
- Implementation plan: `projectplan/v1226_itemized_expense_claims_plan.md` (this file)
- Roadmap area: not a tracked ROADMAP.md item; no roadmap update needed (small-to-medium feature addition, not a strategic status/priority change)
- Review mode: STANDARD, with DEEP rigor applied to the Security/RLS and Data gates (new tables + RLS policies)
- Decision: PASS
- Highest severity: none (no Critical/High findings)
- Regression risk: LOW
- Database impact: MEDIUM (3 new tables across 2 schemas, no changes to existing table shapes/data)
- Security impact: LOW (new RLS policies mirror already-approved patterns on sibling tables 1:1; no privilege expansion)

## Findings

None outstanding. Two pre-existing, unrelated test flakes were observed in full-suite background runs (`ExpenseCategories.test.jsx` in Simulator timing out under heavy parallel load; `DecisionLogForm.listTabs.test.jsx` in Platform, a Decision Log test unrelated to this feature) — both confirmed passing cleanly when re-run in isolation, so treated as test-runner resource contention, not regressions.

## Validation Evidence
- Type/lint: NOT RUN — no project-wide lint/typecheck script invoked this session
- Unit: Platform 76 passed / 1 flaked-then-passed-in-isolation (77 total across 24 files); Simulator 34 passed / 0 failed (10 files) — all new/changed files individually confirmed green
- Integration: covered by the above (React Testing Library component tests exercise service + UI integration together)
- SQL/RLS: NOT RUN against a live database — SQL files v1226a–v1226e (+ v1226c menu) have not yet been executed; user runs migrations manually per established workflow. RLS policies were self-reviewed by inspection against sibling-table precedents (see Security notes below) but not adversarially tested against a live Supabase instance.
- E2E: NOT RUN — no Playwright/E2E suite exercised
- Build: NOT RUN as a full production build (a prior unrelated build attempt failed on a pre-existing missing export in `pmis-gaps/IntakeFormListPage.jsx`, unconnected to this change)
- Manual: NOT RUN — no browser verification performed in this session; purely automated test evidence

## Not Verified
- SQL migrations have not been executed against the real database (pending user action)
- No adversarial RLS testing (cross-tenant/forged-ID attempts) was performed against a live database
- No manual browser/UI walkthrough (dark/light toggle, PWA/mobile layout) was performed for the new screens
- Full project-wide lint/typecheck/build was not run

## Remaining Risks
- The RLS policies on the two new `project_expense_claim_items` tables are new code, even though they mirror an already-trusted pattern; recommend a quick manual spot-check after the SQL runs (e.g. confirm a non-member cannot see another project's claim items) before this reaches real users.
- `saveDraft`/`saveSimDraft` now always issue a delete-then-maybe-insert against the items table on every draft save, even for non-itemized claims — harmless (no-op delete) but a minor extra round trip; not a correctness concern.
- The itemized-table UI component intentionally has no card/table view toggle (rule 41 applies to top-level register pages, not an embedded sub-form editor) — flagging in case that reading is later disputed.
- `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` was not updated for the new Expense Categories menu entries — consistent with the pre-existing gap where My Expenses/Expense Approvals/Expense Thresholds were never added there either; flagged to the user rather than silently fixed or silently skipped.

## Final Decision
PASS. Ready for the user to run the SQL migrations and spot-check in the browser; no blocking findings.

## Notes on sequencing

Phases 1–3 are prerequisites for everything else (categories + items table + the shared UI
component). Phase 4 (Platform) and Phase 5 (Simulator) can proceed in either order once 1–3 are
done, but Platform first is recommended since Simulator's new pages directly reuse the patterns
built in Phase 4. Each checkbox is a small, test-first, independently-completable step —
reported to the user as it's done per the Standard Workflow's "high level explanation of what
changes you made" per step.
