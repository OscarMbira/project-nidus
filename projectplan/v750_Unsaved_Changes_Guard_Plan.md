# v750 — Unsaved Changes Guard (Platform + Simulator)

**Status:** COMPLETE
**Companion plan (Admin app):** `E:\project-nidus-admin\projectplans\v17.0_unsaved_changes_guard_plan.md` — same feature, same API shape, built separately since the Admin app shares no code with this monorepo (`CLAUDE.md` rule 34.2/46). Read both together; this file covers Platform + Simulator.

## Goal

Warn the user before leaving an open record (new or amended) with unsaved changes — sidebar/breadcrumb clicks, Cancel buttons, tab close/refresh, and (best-effort) browser back/forward — across **both** Platform and Simulator, per rule 34 parity. Build it once in `packages/*` so both apps get it for free, and so every future form only needs one hook call.

## Investigated first — key constraints

- `apps/platform` and `apps/simulator` both pin `react-router-dom ^6.30.2` and mount via plain `<BrowserRouter>` (`App.jsx` in each), not a data router. Same as the Admin app: `useBlocker`/`unstable_usePrompt` are unavailable without migrating to `createBrowserRouter`/`RouterProvider` — out of scope here (see Non-goals).
- No existing `beforeunload`, `useBlocker`, `usePrompt`, or dirty-tracking code anywhere in `apps/*` or `packages/*` — greenfield.
- No universal form library — forms are hand-rolled `useState`, same pattern already visible in e.g. `RoleMenuCustomiser.jsx`'s `baseline` vs `pending` Map comparison (v749's neighbour). That comparison pattern is the natural model for computing `isDirty` in other forms too.
- There are **many** separate sidebar components per role per app (`Sidebar.jsx`, `PMSidebar.jsx`, `PMOSidebar.jsx`, `SimulatorPMSidebar.jsx`, `SimulatorPMOSidebar.jsx`, `SimulatorTMSidebar.jsx`, …) — each renders its own `<Link>`s directly; there is no single shared link-rendering component to patch once. **Do not patch each sidebar file individually** (too wide, too easy to miss one) — see Design below for the single-listener alternative that covers all of them without touching any.
- `packages/ui/src/Modal.jsx` already exists as a generic modal — reuse it for the confirm dialog rather than building a new one.

## Design

### `packages/shared/src/context/UnsavedChangesContext.jsx` (new)

Same shape as the Admin app's version, adapted to this monorepo's existing patterns (`@nidus/shared`, `ToastContext.jsx` as the sibling convention to follow for a top-level provider):

- `UnsavedChangesProvider` — mounted **once** per app, inside `<BrowserRouter>` in `apps/platform/src/App.jsx` **and** `apps/simulator/src/App.jsx` (two mount points, one shared implementation).
  - Aggregate `isDirty` from a registry of active guards.
  - **`beforeunload`** listener — reliable regardless of router type or which of the many sidebars is rendering.
  - **Capture-phase document click listener** — finds the nearest `<a href>` ancestor of any click, skips modified/`_blank` clicks, blocks + confirms + `navigate()`s on confirm. This is the key design choice for this repo specifically: because there are 8+ independent sidebar components across both apps, patching each one's `<Link>`/`handleClick` individually would be a large, easy-to-drift change. **One capture-phase listener at the provider level covers every sidebar variant, every breadcrumb, every "back to list" link, in both apps, without touching any of those files.**
  - **`popstate`** best-effort back/forward handling — same caveats as the Admin plan (Non-goals).
  - `requestNavigation(path)` for forms' own Cancel buttons.
- `useUnsavedChangesGuard(isDirty, message?)` — one-line hook per form.

### Confirm dialog

Build on `packages/ui/src/Modal.jsx` (existing) — don't introduce a second modal primitive.

### Rollout scope (deliberately small, per rule 6/32)

1. Build the provider + hook in `packages/shared` + `packages/ui` (shared code — both apps get it automatically per rule 34.3, no duplication needed here since this *is* the shared layer, unlike the Admin app).
2. Mount in both `apps/platform/src/App.jsx` and `apps/simulator/src/App.jsx` (two lines, one shared component).
3. Pilot on **one** representative Platform form and **one** representative Simulator form (parity, rule 34.1) — pick a real, actively-used create/edit form in each (e.g. a Project or Risk Register entry form on Platform; the matching Simulator equivalent).
4. Add a new numbered rule to this repo's `CLAUDE.md` (alongside rules 38–44, which already mandate export/PWA/row-numbers for all new list & form features) requiring `useUnsavedChangesGuard` on every **new or amended** create/edit form, for both Platform and Simulator per the existing parity rule. Existing forms adopt it opportunistically when next touched, not in one sweep.

### Non-goals

- Guaranteed Back/Forward button interception without a data-router migration (`createBrowserRouter`/`RouterProvider`) — same caveat as the Admin plan; that migration is a separate, much larger effort across both apps and isn't attempted here.
- Retrofitting the many existing forms in one pass.
- Any DB/schema change — purely client-side UX, nothing persisted, no `SQL/` file needed for this plan.

## Phases

- [x] **Phase 1:** `packages/shared/src/context/UnsavedChangesContext.jsx` (provider + hook) + export; reuse `packages/ui/src/Modal.jsx` for the dialog.
- [x] **Phase 2:** Mount in `apps/platform/src/App.jsx` and `apps/simulator/src/App.jsx`.
- [x] **Phase 3:** Pilot integration — `RiskForm.jsx` in Platform and Simulator (parity).
- [x] **Phase 4:** `CLAUDE.md` rule 52 (Platform + Simulator parity requirement) + unit tests in `packages/shared/src/utils/__tests__/unsavedChangesUtils.test.js`.
- [x] **Phase 5 (manual):** verify sidebar-click, tab-close, and back-button behaviour on both pilot forms, in both apps.

## Manual test checklist

1. Open the pilot Platform form, make a change, click any sidebar link (try more than one of the role-specific sidebars if reachable) → confirm modal appears; Discard/Keep-editing both behave correctly.
2. Same for the pilot Simulator form.
3. Tab close/refresh while dirty → native browser prompt, both apps.
4. `target="_blank"` link while dirty → opens in new tab, no prompt.
5. Not dirty → silent navigation, no prompt, both apps.

## Implementation notes

- Shared utils: `packages/shared/src/utils/unsavedChangesUtils.js` (`evaluateLinkClickForGuard`, `aggregateDirtyState`).
- Hook exports: `requestNavigation`, `confirmDiscard` (for modal Cancel/close without route change).
- Pilot: Create/Edit Risk modal on project Risks page (`RiskForm.jsx`).
