# Multi-line list fields (v1061)

## Purpose

System-wide control for “one value per line” fields (objectives, success criteria, and similar) with:

- Card ⊞ / Table-List ≡ toggle (default **table**)
- Persisted preference via required `viewModeId` + `useViewMode`
- Table mode: row numbers, inline edit, icon-only Edit/Delete
- Confirm before delete / clear all
- Storage: newline-joined string

## Usage (Platform / Simulator)

```jsx
import MultiLineListInput from '@nidus/ui/MultiLineListInput'

<MultiLineListInput
  viewModeId="project-details-objectives"
  id="project_details_objectives"
  value={form.project_objectives}
  onChange={(v) => setForm({ ...form, project_objectives: v })}
  placeholder="…"
  ariaLabelPrefix="objective"
  itemColumnLabel="Objective"
/>
```

`viewModeId` is **required** (CLAUDE.md rule 67).

## Usage (Admin)

```jsx
import { AdminMultiLineListInput } from '@nidus-admin/ui'

<AdminMultiLineListInput
  viewModeId="admin-example-items"
  value={form.items}
  onChange={(v) => setForm({ ...form, items: v })}
  ariaLabelPrefix="item"
/>
```

Admin CLAUDE.md rule 20.

## Adoption

- New multi-line list fields must use this component from day one.
- Existing stacked-only controls (e.g. `apps/*/components/project/MultiLineListInput.jsx`) migrate when the page is next amended.
- Reference adopter: Project Details Objectives / Success Criteria.

## Related

- PRD: `projectprd/v1061_multiline_field_table_list_crud_PRD.md`
- Plan: `projectplan/v1061_multiline_field_table_list_crud_plan.md`
