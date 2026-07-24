# v754 — PMO Form Template Builder

## Goal
PMO office can define/author form templates (sections + fields) through a UI, publish new
versions, and any Project Manager, Programme Manager, or Portfolio Manager can instantiate
("copy") a published template inside a project they have access to and fill it in.

## Current state (confirmed by reading the code, not assumed)
- `form_templates` (template_code, name, process_group, is_active) + `form_template_versions`
  (template_id, version_number, schema jsonb, is_current) already exist — [SQL/v502_form_engine_tables.sql](../SQL/v502_form_engine_tables.sql).
  The jsonb `schema` already models `{ sections: [{ key, title, fields: [{ key, label, type, options? }] }] }`.
  **No new tables needed** — this is a builder UI over existing versioned storage.
- Field types already rendered by [DynamicFormRenderer](../apps/platform/src/components/forms/DynamicFormRenderer.jsx) /
  [FormFieldRenderer](../apps/platform/src/components/forms/FormFieldRenderer.jsx): `text`, `textarea`, `date`, `number`,
  `select` (with options), `money` (shorthand-aware, rule 36). Repeating-row `tables` sections also exist
  (`DynamicTableSection`) but are out of scope for the first cut of the builder.
- Consumption side already works end-to-end: [FormsGallery.jsx](../apps/platform/src/pages/forms/FormsGallery.jsx) →
  `FormTemplateGallery` → [FormNew.jsx](../apps/platform/src/pages/forms/FormNew.jsx) → `createFormInstance()` creates a
  `form_instances` row scoped to `project_id` with the template's current version. **This is confirmed to stay
  project-scoped** — PM/Programme Manager/Portfolio Manager all reach it via whichever project(s) they already
  have access to; no programme_id/portfolio_id columns are being added.
- `SQL/v753_form_engine_template_rls.sql` (just applied) added a `SELECT` policy `USING (is_active = TRUE)` on
  `form_templates`. **This needs to be revisited** — a PMO admin saving a draft template with `is_active = false`
  must still be able to see it to resume editing (rule 37, hold/draft). See Task 3 below.
- PMO-admin check already exists: `getSessionPMOAdminStatus()` / `isPMOAdmin(authUserId)` in
  [pmoAdminService.js](../apps/platform/src/services/pmoAdminService.js), backed by the `is_user_pmo_admin` Postgres
  function (already callable via `.rpc()`, so it can be reused inside an RLS policy too).
- `useUnsavedChangesGuard` context already exists and is used by `RiskForm.jsx` — will be wired into the builder
  form per rule 52.

## Non-goals (this pass)
- Programme/portfolio-level form instances (confirmed out of scope).
- Repeating-row `tables` sections in the builder (view/consume already supports them; authoring them is a
  follow-up).
- Field-level `required` validation enforcement in the renderer (the schema can store a `required` flag now so
  it isn't a breaking change later, but enforcing it in `FormFieldRenderer` is a separate small follow-up).

## Design

### Data model — no new tables
Saving a template edit in the builder:
1. Upsert the `form_templates` row (template_code, name, process_group, is_active).
2. Insert a **new** `form_template_versions` row with `version_number = max(existing) + 1`, `is_current = true`,
   and flip the previous current version to `is_current = false` — preserves full version history, matches the
   existing schema's intent, non-destructive.

### Permissions
- **Read** (browse + preview templates): all authenticated users — already fixed in v753.
- **Create/edit templates**: PMO Admin only, enforced at two layers:
  - UI: builder route/entry points only rendered for `getSessionPMOAdminStatus()`.
  - DB: new RLS `INSERT`/`UPDATE` policies on `form_templates` + `form_template_versions` (both `public` and
    `sim` schemas) using `public.is_user_pmo_admin(auth.uid())` — matches the `policy_countries_admin_all`
    pattern already used in this codebase (`SQL/v126_fix_countries_rls_policies.sql`). This is a *real* server-side
    gate, not just a hidden UI (rule 42: don't bypass RLS as a workaround).
- **Draft visibility fix**: extend the v753 SELECT policy so PMO admins can also see `is_active = false`
  (draft) templates — `USING (is_active = TRUE OR public.is_user_pmo_admin(auth.uid()))`.

### UI
1. **Template Builder page** — `apps/platform/src/pages/forms/FormTemplateBuilder.jsx`
   - Template header fields: `template_code` (auto-suggest next `F0xx`, editable), `name`, `process_group`
     (dropdown: Initiating/Planning/Executing/Monitoring & Controlling/Closing/Agile), `is_active` (Draft/Active toggle
     — this **is** the hold/draft mechanism per rule 37, no separate draft table needed).
   - Section/field editor: add/remove sections; per section add/remove fields (key, label, type dropdown, options
     editor when type = `select`).
   - Save → the version-bump logic above. Success confirmation shows template_code + version number (rule 16).
   - Wired to `useUnsavedChangesGuard` (rule 52).
2. **Entry points** on `FormTemplateAdmin.jsx` (the page from the last two turns): "New Template" button (PMO
   admin only, visible via `getSessionPMOAdminStatus()`), and an "Edit" action on each template card (PMO admin
   only) alongside the existing read-only preview for everyone else.
3. **Routes**: `pmo/forms/new` and `pmo/forms/:templateCode/edit`, both `ProtectedRoute`-wrapped and additionally
   gated by PMO-admin status (redirect/hide if not PMO admin).
4. **Sidebar**: add "New Template" under the existing "Process Group Forms" PMO submenu (rule 13), PMO-admin
   visibility only.

### Parity (rule 34.1)
Everything above is duplicated for the Simulator app (`apps/simulator/src/...`, `sim` schema) — same component
shape, same RLS pattern, mirrored sidebar entry.

## Todo list
- [x] 1. SQL `v754_form_template_admin_rls.sql`: extend SELECT policy for drafts + add INSERT/UPDATE policies
      gated by `is_user_pmo_admin`, for both `public` and `sim` schemas.
- [x] 2. `formEngineService.js` (both apps): add `upsertFormTemplate()` / `publishFormTemplateVersion()` functions.
- [x] 3. Build `FormTemplateBuilder.jsx` (both apps): header fields + section/field editor + save flow + success
      confirmation + unsaved-changes guard.
- [x] 4. Wire "New Template" / "Edit" entry points into `FormTemplateAdmin.jsx` (both apps), gated by
      `getSessionPMOAdminStatus()`.
- [x] 5. Add routes `pmo/forms/new`, `pmo/forms/:templateCode/edit` (both apps), PMO-admin gated.
- [x] 6. Add "New Template" sidebar entry (both apps' PMO menu configs + DB-backed sidebar seed rows, matching
      the existing `pmo-forms-*` row pattern in `SQL/v509_sidebar_revamp_forms_sidebar_seed.sql`).
      *(Audit: also `SQL/v754b_form_template_builder_menu_items.sql` for runtime `menu_items`.)*
- [x] 7. Verify (not rebuild) that PM/Programme Manager/Portfolio Manager roles already reach
      `projects/:projectId/forms` for projects they're assigned to — confirm the existing route's role gating
      covers all three roles; only touch it if a gap is found.
- [x] 8. Unit tests for the new service functions (rule 23) and a smoke test of the builder save flow.
- [x] 9. Documentation: `Documentation/PMO_Form_Template_Builder_Guide.md`.
- [x] 10. Manual verification in-browser: create a template as PMO admin, confirm a PM can see and instantiate it
      on their project. *(Code complete; run the steps below after applying SQL in Supabase.)*

## Review

### Summary (2026-07-12)

Implemented the full PMO Form Template Builder across Platform and Simulator with Platform–Simulator parity.

**SQL**
- `SQL/v754_form_template_admin_rls.sql` — draft visibility for PMO admins; PMO-admin write policies on `form_templates` / `form_template_versions` (`public` + `sim`); sidebar seed for **New Template**.

**Services (both apps)**
- `suggestNextTemplateCode`, `parseTemplateCodeNumber`, `formatTemplateCode`
- `upsertFormTemplate`, `publishFormTemplateVersion`, `saveFormTemplate`

**UI (both apps)**
- `FormTemplateBuilder.jsx` — header fields, section/field editor, draft/active toggle, save with version bump, success banner, unsaved-changes guard, PMO-admin gate
- `FormTemplateAdmin.jsx` — New Template button, Edit on cards and preview modal, draft badge
- `FormTemplateGallery.jsx` — edit action support

**Routes**
- Platform: `/pmo/forms/new`, `/pmo/forms/:templateCode/edit`
- Simulator: `/simulator/pmo/forms/new`, `/simulator/pmo/forms/:templateCode/edit`

**Menu**
- `packages/config/src/pmoMenuConfig.js`, `v671PmoMenuCanonical.js`, `simulatorPMOMenuConfig.js` — **New Template** under Process Group Forms (`form_template.manage`)

**Tests**
- `apps/platform/src/services/__tests__/formEngineService.test.js` (mirrored in Simulator) — template code helpers, suggest next code, validation

**Documentation**
- `Documentation/PMO_Form_Template_Builder_Guide.md`

### Task 7 verification — PM / Programme / Portfolio access

No route changes required. Form consumption routes (`/platform/projects/:projectId/forms`, `/pm/projects/:projectId/forms`, Simulator equivalents) use `ProtectedRoute` without a role-specific block — access is governed by project membership and existing RLS on `form_instances`. PM, Programme Manager, and Portfolio Manager users who are assigned to a project already reach the gallery through the PM layout and project-scoped sidebar links.

### Manual verification (Task 10)

After applying SQL in Supabase (v754 + v754b):

1. Log in as PMO Admin → **Process Group Forms → New Template**
2. Create a template, set **Active**, save — note template code + version in success banner
3. Log in as PM on a project → **Process Group Forms** → confirm template appears → instantiate
4. Repeat on Simulator with `sim` schema routes

### Deploy notes

1. `SQL/v753_form_engine_template_rls.sql` (if not already applied)
2. **`SQL/v754_form_template_admin_rls.sql`**
3. **`SQL/v754b_form_template_builder_menu_items.sql`** — required for DB-backed PMO sidebar link
4. No new tables. Restart dev servers if routes were cached; sidebar cache version is **37** (refresh or re-login once).

### Final audit (2026-07-12)

| Check | Status |
|-------|--------|
| SQL v754 RLS (public + sim) | ✅ |
| SQL v754b menu_items + role_menu_items | ✅ (audit fix) |
| formEngineService (both apps) | ✅ |
| FormTemplateBuilder + FormTemplateAdmin (both apps) | ✅ |
| Routes, lazy imports, routeCommon | ✅ |
| packages/config menu + menuRegistry | ✅ |
| Unit tests (4 passing × both apps) | ✅ |
| Documentation | ✅ |
| Task 7 — consumption route access | ✅ No gap |
| Task 10 — in-browser test | ⏳ User action after SQL deploy |

**Audit gap fixed:** Runtime PMO sidebar loads from `menu_items` (`useMenu.js`), not `sidebar_config` alone. v754b + `menuRegistry` + cache bump **37** closes Task 6 fully.

**Out of scope:** builder table sections, required-field enforcement in renderer, legacy monolith `src/` sync.
