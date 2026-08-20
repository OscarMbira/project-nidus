# Project Forms Register (v850)

## Purpose
Upgrade `FormsGallery` into a full **All Records** register for `form_instances` on the existing
route (`/platform/projects/:projectId/forms` · Simulator PM equivalent), without changing the
Forms tier-override architecture (v808–v847).

## Behaviour
- Keeps **FormTemplateGallery** (start new) and **DraftFormQueue** (my drafts).
- Adds **All Records**: every instance for the project (not only drafts).
- Default view **hides archived**; status filter includes **Archived**.
- Actions: View → `FormView`; Edit → `FormEdit` (draft / in_review / rejected); Archive →
  `archiveForm()` (draft / in_review / rejected). Archive disabled for **approved** with tooltip.
- List standard: table default, sort, row numbers, Card/Table toggle, search, export.
- Multi-instance per template remains allowed (no uniqueness change).

## Status vocabulary
Engine: `draft` | `in_review` | `approved` | `rejected` | `archived`.  
Product “submitted” maps to `in_review`.

## Key files
- `apps/platform/src/pages/forms/FormsGallery.jsx`
- `apps/simulator/src/pages/forms/FormsGallery.jsx`
- `packages/shared/src/utils/formInstanceRegisterUtils.js`
- `getFormsByProject` join enrichment in both apps’ `formEngineService.js`

## Out of scope
Tier override tables / `TierFormPolicyPanel`, hard delete, new menu leaf, process_template (v849).
