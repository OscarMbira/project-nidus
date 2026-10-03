# v1107 — Organisation Risk Categories and Sub-categories — Implementation Plan

**PRD:** `projectprd/v1107_organisation_risk_categories_PRD.md`
**Status:** Implemented in code and SQL run (2026-09-26).

**Note:** `SQL/v1113_organisation_risk_categories.sql` was renamed to `SQL/v1118_organisation_risk_categories.sql` after implementation to resolve a filename collision with an unrelated v1113 file from a different feature (v1106). No content changed — same file, new name.

Vertical slices (rule 17.2). SQL in `E:\project-nidus\SQL\` only. No Admin repo change. Do not start until this plan is approved.

---

## Phase 0 — SQL

- [x] `SQL/v1118_organisation_risk_categories.sql` (renamed from `v1113`, see note above)
  - Add `organisation_id UUID NULL REFERENCES accounts(id)` to `public.risk_subcategories` (NULL = built-in row from v1111).
  - Replace the global unique `(category_code, subcategory_code)` with a system unique index where `organisation_id IS NULL`, and an organisation unique index on `(organisation_id, category_code, lower(subcategory_name))`.
  - RLS: authenticated users who belong to the account can select active system rows and their account's rows. Insert of an organisation row is allowed for PMO Admin, Account Owner (`accounts.owner_user_id`), Project Manager, Team Manager, Team Lead, and Team Member. Update (rename, `is_active`) is allowed for PMO Admin and Account Owner, and only when `organisation_id` is that account. No delete policy.
  - Same insert/update split on `public.risk_categories` for organisation-owned rows. System rows (`organisation_id IS NULL`) stay read-only.
  - No new display-id column. `category_code` / `subcategory_code` are generated slugs, not Admin ID Generation references.

## Phase 1 — Catalogue service and tests

- [x] `apps/platform/src/services/riskCategoryCatalogService.js` (and the Simulator copy): list categories and sub-categories for the current account (system + own), add by name, rename, deactivate, duplicate check, similar catalogue names, similar risks (max 5, current project first, account-scoped through existing access).
- [x] Unit tests for duplicate rejection, similar names, and the five-risk ordering (`riskCategoryMatch.test.js`, 3 passed). Permission checks live in the SQL functions.

## Phase 2 — Catalogue page

- [x] Routed list at one path, linked from **PMO Configuration → Risk Categories** and **RAID → Risks → Risk Categories**. Same path in the Simulator menus.
- [x] Table-list default, card toggle, search, row numbers, export. Categories alphabetical, then created date. Sub-categories nested under the category.
- [x] Add is a routed page (name only) for every role that may add. Rename and deactivate are on the edit route for PMO Admin and Account Owner only.
- [x] Similar-name panel on the name field after the user pauses.
- [x] Success modal on create, rename, and deactivate. Unsaved-changes guard. Audit tab on the create/edit page.
- [x] Update `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` in the same change (rule 70).

## Phase 3 — Risk form

- [x] `EnhancedRiskForm` in Platform and Simulator: Category and Sub-category load from the catalogue. Remove the hardcoded category options.
- [x] **Add** on each dropdown saves the name immediately and selects it. Sub-category add stays disabled until a category is selected.
- [x] Similar-name panel on those adds, and the same panel when the risk title pauses.
- [x] A stored name that is no longer active still shows on an existing risk.

## Review

Code is in place for Platform and Simulator. `SQL/v1111_risk_subcategories.sql` and `SQL/v1118_organisation_risk_categories.sql` (renamed from `v1113`) have both been run (2026-09-26).

`riskCategoryMatch.test.js`: 3 passed. The form, catalogue list, and catalogue detail modules compile (HTTP 200). The signed-in catalogue page and the similar-risk panel were not clicked through in the browser.

A new risk stores the category name. An older risk that still stores a code such as `commercial` still selects the matching catalogue row. Renaming a catalogue name does not rewrite existing risks. Saving an old risk after touching the category stores the name that is selected at that moment.
