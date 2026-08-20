# PRD v840 — Icon-Only Row & Detail-Bar Actions (View / Edit / Delete)

## a) Problem statement

Across Platform, Simulator, and Admin, table/list "Actions" columns and record-detail action bars render View/Edit/Delete as full buttons with both an icon and a text label (e.g. `👁 View`, `✏️ Edit`). On dense registers (Risks, Issues, Actions, Quality, Support Tickets, Users, Subscriptions, etc.) this consumes column width that would otherwise go to substantive data, and it duplicates the same JSX pattern across dozens of files with inconsistent icon choices (`Pencil` vs `Edit2`) and inconsistent colors (some files color View and Edit identically, so the two are hard to tell apart at a glance).

Some pages already ship an icon-only version of this pattern (e.g. `RiskList.jsx` card view), proving the direction is viable — the problem is it isn't consistent, isn't componentized, and isn't the system default.

## b) Solution

Introduce one canonical icon-only action-button pattern — Eye/View (blue), Pencil/Edit (amber), Trash2/Delete (red), each with a `title` + `aria-label` and a lightweight themed hover tooltip — and apply it to every table/list row-actions column and every record-detail top action bar in Platform, Simulator, and Admin.

Ship it as a shared component rather than hand-edited markup per page:
- `RowActionButton` + `Tooltip` in `packages/ui` (consumed by Platform + Simulator via `@nidus/ui`, per rule 34.3).
- `AdminIconActionButton` + `AdminTooltip` in `project-nidus-admin/packages/ui` (Admin replicates the pattern locally per rule 34.4 — it cannot import `@nidus/ui` cross-codebase).

Retrofit every existing text-label View/Edit/Delete instance found in the codebase inventory to use the new component, and add a CLAUDE.md rule (monorepo rule 61, Admin rule 15) making icon-only View/Edit/Delete mandatory for all new and amended list/detail pages going forward.

Out of scope for this pass: Export format dropdowns (PDF/Excel/Word/etc. — text stays, since users are scanning distinct format names, not repeating one action per row), and any action other than View/Edit/Delete (Assign, Approve, Reject, Duplicate, Archive, Cancel, Print, Hold/Draft stay text-labeled for now).

## c) User stories

1. As a user scanning a Risks/Issues/Actions register, I see a compact `[👁][✏️][🗑]` action cluster per row instead of `[👁 View][✏️ Edit][🗑 Delete]`, so more of the row width is available for data columns.
2. As a user, hovering any icon-only action button shows a themed tooltip naming the action ("View", "Edit", "Delete") within ~300ms, in both light and dark mode.
3. As a screen-reader user, each icon-only button exposes an `aria-label` matching the tooltip text, so the button's purpose is announced even without the tooltip rendering.
4. As a user on a record detail page (e.g. Risk Detail, Work Authorisation Detail), the top action bar's Edit/Delete buttons are icon-only with tooltips, consistent with the list-view pattern.
5. As a user, the Delete icon button still triggers the existing confirmation flow (dialog/inline confirm) — only the trigger's visual form changes, not the confirmation behavior.
6. As a user, View is always blue, Edit is always amber, Delete is always red, everywhere in the system — the color alone is a consistent signal of which action a button performs.
7. As a keyboard-only user, tabbing to an icon-only action button shows the same tooltip that a mouse hover would (`:focus-visible` triggers it), so keyboard navigation isn't a second-class experience.
8. As a mobile/touch user (rule 29/39 PWA), tapping an icon-only action button performs the action directly — there is no dead first tap required to "reveal" the tooltip before the action fires.
9. As a developer building a new list page after this change ships, I import `RowActionButton` (Platform/Simulator) or `AdminIconActionButton` (Admin) rather than hand-rolling button markup, per the new CLAUDE.md rule.
10. As a developer, if an action is conditionally available (e.g. Edit hidden for closed/realized risks, per existing `RiskList.jsx` logic), `RowActionButton` supports conditional rendering identically to today's `{onEdit && (...)}` pattern — no regression in permission-gated visibility.
11. As a user with reduced motion / high contrast OS settings, the tooltip and icon buttons remain legible — no motion-dependent-only affordance for discovering what a button does (aria-label covers this).
12. As a QA reviewer, every retrofitted page still passes its existing unit tests (or updated tests reflecting the new DOM shape), and the new shared components ship with their own unit tests per rule 23.

## d) Implementation decisions

- **Scope of surfaces:** list/table row actions AND record-detail top action bars. Export dropdown menu items are explicitly excluded.
- **Actions converted:** View, Edit, Delete only. Assign/Approve/Reject/Duplicate/Archive/Cancel/Print/Hold-Draft remain text-labeled in this pass.
- **Rollout:** full retrofit of all existing instances now, plus a new CLAUDE.md rule (monorepo #61, Admin #15) mandating icon-only View/Edit/Delete for all new/amended list and detail pages going forward.
- **Component architecture:** shared `RowActionButton` (+ `Tooltip`) in `packages/ui/src`, consumed via `@nidus/ui` by Platform and Simulator. Admin gets a locally-replicated `AdminIconActionButton` (+ `AdminTooltip`) in `project-nidus-admin/packages/ui/src`, additive alongside the existing text-only `AdminActionButton` (still used for Assign/Priority/etc.).
- **Icon set:** `Eye` (View), `Pencil` (Edit — standardized away from `Edit2`, which some files currently use), `Trash2` (Delete), all from `lucide-react` (already the system-wide icon library — no new dependency).
- **Color convention:** View = blue/sky (`text-blue-600 dark:text-sky-300` family), Edit = amber (`text-amber-600 dark:text-amber-400` family), Delete = red (`text-red-600 dark:text-red-400` family, already near-universal in the current codebase). Hover backgrounds follow the same hue at low opacity, matching existing `hover:bg-*-50 dark:hover:bg-*-900/20` pattern.
- **Tooltip:** new lightweight, theme-aware `Tooltip` component (no external tooltip library) — shows on hover and on `:focus-visible`, not on touch tap (touch tap fires the button's action directly, satisfying PWA/mobile rule 29/39). Backed by `aria-label` regardless of tooltip render state, so screen readers are never dependent on hover.
- **Delete confirmation:** unchanged — whatever confirm dialog/inline-confirm behavior a page already has stays; only the trigger element becomes icon-only.
- **Conditional rendering:** `RowActionButton` must support the same "only render if allowed" pattern already used (e.g. `{onEdit && <RowActionButton .../>}`), so existing permission/status gating (e.g. Risk closed/realized hides Edit) is preserved, not flattened into the component.
- **Process:** full PRD (this document) + a single versioned implementation plan with a todo checklist; no GitHub issue breakdown (rule 17.2 skipped — this is one contained mechanical retrofit executed end-to-end, not split across multiple people/PRs).

## e) Testing decisions

- New `RowActionButton` and `Tooltip` (packages/ui) and `AdminIconActionButton` / `AdminTooltip` (Admin) each get unit tests per rule 23: renders correct icon per `variant`, applies correct color class per `variant`, exposes `aria-label` matching `label` prop, tooltip appears on hover/focus and not on touch-only interaction, `onClick` fires, conditional rendering (`disabled`/omitted) behaves as expected.
- Existing test files that assert on button text content for View/Edit/Delete (e.g. `apps/platform/src/components/__tests__/IssueList.test.jsx`) are updated to assert on `aria-label`/`title` instead of visible text, since the visible text is being removed by design — this is an expected, intentional test update, not a regression.
- "Done" = every file in the inventory (built by the codebase-wide grep pass) uses the shared component, all touched test files pass, and no page shows both an icon and visible "View"/"Edit"/"Delete" text simultaneously for a converted action.

## f) Out-of-scope items

- Export/Print-format dropdown menu items (PDF/Word/Excel/CSV/XML/JSON/Print picker) — stays icon+text.
- Non-View/Edit/Delete actions (Assign, Approve, Reject, Duplicate, Archive/Restore, Cancel, Hold/Draft) — stays text-labeled; may be a follow-up PRD if the pattern proves out.
- Primary standalone CTA buttons (e.g. "+ Create New Risk", "Save", "Submit") — stay text, per rule that icon-only is for repeated per-row/per-bar actions, not unique page-level calls to action.
- Retrofitting Admin's `AdminActionButton` itself (the text-pill component) — left as-is for the actions still using it; only a new additive `AdminIconActionButton` is introduced.

## g) Further notes

- Grounded in a codebase survey (existing icon lib = `lucide-react` everywhere already; existing partial icon-only precedent in `RiskList.jsx` card view, `IssueList.jsx`, `ViewToggle.jsx`; Admin's `AdminActionButton`/`AdminRowActions` are text-only today with no icon-only variant; no shared `Tooltip` component exists yet in either `packages/ui`).
- A full file-by-file inventory of every current text-label View/Edit/Delete instance across Platform, Simulator, and Admin is being compiled separately and will form the literal checklist in the companion implementation plan (`projectplan/v840_icon_only_row_actions_plan.md`).
- Platform–Simulator parity (rule 34.1) is inherent here since both consume the same `packages/ui` component — no separate Simulator-specific build needed, only Simulator page retrofits.
