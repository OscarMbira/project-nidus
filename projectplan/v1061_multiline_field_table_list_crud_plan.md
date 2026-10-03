# v1061 — Multi-line field table-list CRUD (implementation plan)

## Goal

Ship a system-wide multi-line list control with Card/Table toggle, table-mode inline CRUD, delete confirmation, CLAUDE.md rules (Platform/Simulator + Admin), and migrate Project Details as the reference adopter.

## Settled decisions

See [projectprd/v1061_multiline_field_table_list_crud_PRD.md](../projectprd/v1061_multiline_field_table_list_crud_PRD.md).

## Todos

- [x] Add `MultiLineListInput` to `packages/ui` (toggle, table + stacked, inline edit, delete confirm via themed Modal)
- [x] Export from `packages/ui/src/index.js`; sync to `apps/platform` + `apps/simulator` `src/components/ui/`
- [x] Unit tests for the shared component
- [x] Migrate Platform `ProjectDetailsPage` Objectives + Success Criteria (`viewModeId`s)
- [x] Admin: `AdminMultiLineListInput` (+ field ViewToggle) in `@nidus-admin/ui`, export, tests
- [x] Add monorepo CLAUDE.md rule **67**; add matching Admin CLAUDE.md rule **20**
- [x] Short Documentation guide + plan review section

## Implementation notes

### Component API (`MultiLineListInput`)

```jsx
<MultiLineListInput
  viewModeId="project-details-objectives" // required
  id="project_details_objectives"
  value={form.project_objectives}
  onChange={(v) => setForm({ ...form, project_objectives: v })}
  placeholder="…"
  ariaLabelPrefix="objective"
  itemColumnLabel="Objective" // optional; default "Item"
  disabled={false}
/>
```

- `viewModeId` required — throw/dev console error if missing in non-production; do not invent keys.
- Default mode: `'list'` (table) via `useViewMode(viewModeId, 'list')`.
- Table columns: `#` (not sortable), item text (`itemColumnLabel`), Actions (Edit/Delete via `RowActionButton`).
- Inline edit: local draft state for `editingIndex`; Save writes back into newline-joined value; Cancel discards.
- Delete: open small confirm Modal; on confirm remove line.
- Stacked mode: existing card-list UX + same delete confirm; keep Clear all (confirm once for clearing all).
- Theme: Layout-safe surfaces (`bg-white dark:bg-gray-800`, etc.).

### Project Details

- Import from `@nidus/ui/MultiLineListInput` (or named export).
- `viewModeId="project-details-objectives"` and `viewModeId="project-details-success-criteria"`.
- Pass `itemColumnLabel` matching the field.

### Backward compatibility

- Leave `apps/*/components/project/MultiLineListInput.jsx` unchanged for wizard / appointment until those pages are next amended (then point them at `@nidus/ui` + add `viewModeId`).

### Admin

- Mirror component as `AdminMultiLineListInput` using `AdminIconActionButton` / Admin `ViewToggle` (add ViewToggle to Admin UI if absent).
- Rule text mirrors monorepo rule 67.
- No mandatory Admin page migration (no current call site).

### CLAUDE.md rule 67 (draft)

**Multi-line list fields (mandatory for NEW and AMENDED — Platform + Simulator).** Any field that captures multiple text lines as a list (objectives, criteria, tolerances-style “one per line” values, etc.) must use `@nidus/ui` `MultiLineListInput` with a stable required `viewModeId`, Card/Table toggle defaulting to table list, inline edit in table mode, and confirm-before-delete. Persist value as a newline-joined string unless a dedicated child table already exists. Adopt opportunistically when amending a page that still uses a local/stacked-only multi-line control. Admin: same via `@nidus-admin/ui` `AdminMultiLineListInput` (Admin CLAUDE.md).

## Review

### What changed
- Added `@nidus/ui` `MultiLineListInput` with Card/Table toggle (default table), inline edit, confirm-before-delete, required `viewModeId`.
- Synced copies under `apps/platform` and `apps/simulator` `src/components/ui/` (Vite `@nidus/ui` alias).
- Migrated Project Details Objectives / Success Criteria to the shared component.
- Added Admin `AdminMultiLineListInput`, `useViewMode` in `@nidus-admin/shared`, monorepo CLAUDE.md rule **67**, Admin CLAUDE.md rule **20**.
- Guide: `Documentation/Multi_Line_List_Field_Table_CRUD_v1061_Guide.md`.
- Unit tests: `packages/ui/src/__tests__/MultiLineListInput.test.jsx` (passing).

### Validation
- Vitest: MultiLineListInput parse/join, add, inline edit, confirm delete, grid mode.
- Manual recommended: Project Details toggle + persistence after reload; light/dark.

### Remaining
- Wizard / Manager Appointment still use local `components/project/MultiLineListInput.jsx` until next amended.
- Admin has the component ready; no Admin page call site yet.
