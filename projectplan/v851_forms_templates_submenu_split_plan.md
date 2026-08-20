# v851 — Split "Organizational Templates" and "Project Templates" into Forms / Templates Submenu

## Goal
Both sidebar items share `OrganisationalTemplatesPage.jsx` and currently list every domain
(`fields`, `form_template`, `process_template`, `portfolio_template`, `programme_template`,
`project_template`, `opa`) in one flat table, distinguished only by a Domain filter dropdown
column. This blurs the architecture line already drawn in [[v849]]/[[v850]]: `form_template`
runs on the override-table tier system, everything else runs on the node-fork tier system —
they are different systems with different semantics (singleton vs multi-instance, defaulted vs
blank data) and shouldn't read as one undifferentiated list. Add a sidebar submenu — mirroring
the expand/collapse pattern already used by Projects/Tasks/Teams/etc. in this sidebar — under
both **Organizational Templates** and **Project Templates**, splitting into **Templates** and
**Forms** children.

## Decisions locked in with the user
- Applies to **both** Organizational Templates and Project Templates (same component, same
  mixing problem, kept consistent).
- Reuse the existing, already-working `?domain=` query param mechanism
  (`OrganisationalTemplatesPage.jsx`'s `domainFilter` state, already deep-linkable — the v807
  pattern other sidebar leaves already use) rather than inventing a new filtering system.
- **Forms** child = `?domain=form_template` (zero new page logic — this exact value already
  works today via the dropdown).
- **Templates** child = every other domain (`fields`, `process_template`, `portfolio_template`,
  `programme_template`, `project_template`, `opa`) — i.e. "not Forms." This is the one new bit
  of filtering logic needed (today's dropdown only supports a single exact-match domain, not an
  exclusion).
- Parent items (**Organizational Templates**, **Project Templates**) stay clickable to today's
  unfiltered "All domains" view — non-breaking, existing links/muscle memory keep working. The
  submenu adds two new children under each; it doesn't remove the parent's own behaviour.

## Todo

### 1. Page: support a domain-group filter, not just single-domain
- [x] `packages/modules/pmo-module/src/pages/OrganisationalTemplatesPage.jsx` (and Simulator
  `sim-pmo-module` counterpart): read a new `?domainGroup=templates|forms` query param on mount.
  - `domainGroup=forms` → same effect as `domain=form_template` (can literally set
    `domainFilter('form_template')` internally — no new filter branch needed).
  - `domainGroup=templates` → new filter branch: `list = list.filter(r => r.domain !==
    'form_template')` instead of the existing exact-match `r.domain === domainFilter`.
  - Existing `?domain=` deep-links (single exact domain, e.g. `domain=process_template` from
    other places that already link here) keep working unchanged — `domainGroup` is additive,
    not a replacement.
  - When a `domainGroup` is active, hide or disable the in-page Domain dropdown (it's now
    implied by which submenu link was clicked) — Search/Tier/Methodology filters stay available
    within that group.
  - Page heading reflects the active group ("Organisational Templates — Forms" /
    "— Templates") so the URL bar and page title agree with the sidebar breadcrumb.

### 2. Sidebar menu — Platform
- [x] `SQL/v851_pm_templates_forms_submenu.sql`: add two child `menu_items` rows under each of
  `plat_pm_templates` (PM Organizational Templates), `plat_pm_project_templates`, and
  `plat_tpl_organisational` (PMO) — Forms / Templates with `?domainGroup=…`. Copy
  `role_menu_items` grants from each parent (v849 grant-copy pattern).

### 3. Sidebar menu — Simulator
- [x] Same children under `sim_pm_templates`, `sim_pm_project_templates`, and
  `sim_tpl_organisational`, grants copied the same way (same SQL file).

### 4. Verification
- [x] Unit tests: `templateDomainGroup.test.js` + sidebar `domainGroup` active-state cases.
- [ ] Browser: Organizational Templates and Project Templates both show expand chevrons with
  "Templates" and "Forms" children (requires applying `SQL/v851_pm_templates_forms_submenu.sql`
  and a menu cache refresh / re-login).
- [ ] Browser: clicking "Forms" shows only `form_template` rows; clicking "Templates" shows
  every other domain, none show `form_template` rows.
- [ ] Browser: parent item itself still opens the unfiltered "All domains" view.
- [ ] Browser: existing deep-links using bare `?domain=process_template` etc. still work.
- [ ] Browser: Simulator parity pass.
- [ ] Sidebar: confirm grants render for `project_manager` without a hard-refresh workaround.

## Explicitly out of scope
- Any change to the Forms register (v850) or Project Documents register (v849) — those are
  already single-domain, not affected by this mixing problem.
- Splitting out `fields`/`opa`/level-templates into further sub-buckets — this plan is the
  binary Forms/Templates split only, matching the architecture line already drawn.
- Any change to `TierFormPolicyPanel`, `form_template_field_overrides`, or the node-fork copy
  system — this is a navigation/filtering change only.

## Review
### Implemented
1. **Filter helpers** — `packages/shared/src/utils/templateDomainGroup.js` (+ Platform/Simulator
   shell mirrors for the `@nidus/shared/utils` alias).
2. **Pages (P+S)** — `OrganisationalTemplatesPage` reads `domainGroup`, filters Forms vs
   Templates, hides Domain dropdown when grouped, updates H1 suffix, preserves `domainGroup`
   when syncing `entityType`/`entityId` on PM mounts.
3. **Entry redirects** — `ProjectTemplatesEntry` / `TemplateLibraryList` preserve query params
   (including `domainGroup`) when injecting project entity.
4. **Sidebar active state** — bare parent paths do not steal highlight when `domainGroup` is set;
   child query links match via existing `searchParamsMatch`.
5. **SQL** — `SQL/v851_pm_templates_forms_submenu.sql` (Platform + Simulator menu children +
   grant copy + common role reassert).
6. **Docs** — `Documentation/Forms_Templates_Submenu_Split_Guide.md`.

### Apply to see submenu in the UI
Run `SQL/v851_pm_templates_forms_submenu.sql` against Supabase, then hard-refresh or re-login
so `useMenu` reloads grants (no code redeploy of menu cache alone if SQL was the only missing step).

### Follow-up fix (submenu still missing after SQL)
Root cause: `collapsePmNavigableCategoryToLeaf` in `pmoMenuHierarchyUtils.js` **stripped all
children** from `plat_pm_templates` / `plat_pm_project_templates` whenever they had a
`route_path` — intentionally keeping them as single links. That ran after DB children were
loaded, so Forms/Templates never reached the sidebar. Fixed to **keep** the v851 submenu
child codes; Sidebar chevron toggles expand while the parent label stays navigable.
