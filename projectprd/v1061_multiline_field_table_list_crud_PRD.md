# v1061 — Multi-line field table-list CRUD (system-wide)

## a) Problem statement

Multi-line capture fields (e.g. Project Details Objectives / Success Criteria) use a stacked list (`MultiLineListInput`) with add/remove only. Users cannot switch to a scannable table list with proper inline edit, and there is no shared standard for this pattern across Platform, Simulator, and Admin. New fields keep re-implementing the stacked-only UX.

## b) Solution

Promote an enhanced **MultiLineListInput** into shared UI (`@nidus/ui` / Admin-local equivalent) that:

1. Stores values as a **newline-joined string** (unchanged persistence contract).
2. Offers a **Card ⊞ / Table-List ≡** toggle (`ViewToggle`), **default Table-List**, remembered via **required** `viewModeId` + `useViewMode`.
3. **Table mode:** `#` | item text | icon-only Edit/Delete; inline edit with Save/Cancel; Add row; delete requires confirmation.
4. **Stacked (card) mode:** keep today’s list UX (display + remove + clear all + add), with the same delete confirmation.
5. Mandate the pattern in **CLAUDE.md** (monorepo rule 67) and **Admin CLAUDE.md**, with opportunistic adoption elsewhere; **Project Details** migrates in this delivery as the reference adopter.

## c) User stories

1. As a user on Project Details, I can toggle Objectives between stacked list and table list.
2. As a user, my last-chosen view for that field is remembered on return (`viewModeId`).
3. As a user in table mode, I see row numbers and can Add a new line.
4. As a user in table mode, I can Edit a row inline and Save or Cancel.
5. As a user, Delete (table or stacked) asks for confirmation before removing the line.
6. As a developer adding a new multi-line field, I must use the shared component with a stable `viewModeId`.
7. As a developer amending an existing multi-line field page, I migrate it to the shared component in the same change.
8. As an Admin developer, the same component/rule exists in `@nidus-admin/ui` / Admin CLAUDE.md for parity.

## d) Implementation decisions (settled in interview)

| # | Decision |
|---|----------|
| 1 | Both stacked + table modes; default **table**; `useViewMode`; newline-joined storage |
| 2 | Table **inline edit** (Edit → input → Save/Cancel); no per-row View action |
| 3 | Shared component + CLAUDE rules; **opportunistic** call-site adoption |
| 4 | **`viewModeId` required** for persistence; without it, table default for session only is not allowed — callers must pass id |
| 5 | **Project Details** (Objectives + Success Criteria) migrates in this delivery |
| 6 | **Admin full parity now** — Admin component + Admin CLAUDE.md rule (even with no Admin call site yet) |
| 7 | **Confirm before delete** |

## e) Testing decisions

- Unit tests for parse/join helpers and mode toggle / inline edit / confirm-gated delete (Vitest + RTL on the shared component).
- Manual: Project Details light/dark, both modes, persistence after reload, confirm cancel vs confirm OK.

## f) Out of scope

- Changing DB storage (no array column / child table).
- Migrating Project Wizard / Manager Appointment / other call sites in this delivery.
- Changing register-page `ViewToggle` colours/API.
- Export of multi-line sub-lists as standalone registers.

## g) Further notes

- Vite aliases `@nidus/ui` → `apps/{platform,simulator}/src/components/ui` — implement in `packages/ui` **and** sync app-local UI copies so imports resolve.
- Existing `apps/*/components/project/MultiLineListInput.jsx` remains for non-migrated callers until those pages are amended.
