# v1063 — Export field valueType tables (currency-aware)

## a) Problem statement

Record export/preview stacks every field as label-then-value. Cost/amount groups (e.g. Business Case Costs & Investment) should render as an **Item | Value** table when field types warrant it; multi-value text should stay bullets; long text stays paragraphs. Formatting must use **resolved Regional & Format Settings** (v1062), not hard-coded `$`.

## b) Solution

Extend export section field metadata with `valueType` and teach `exportUtils` (PDF/Word/PPT/Excel) to:

1. Coalesce consecutive `currency` / `number` / `percent` fields into a two-column table.
2. Keep `list` as bullets; `text` / default as labelled body.
3. Format cells via resolved regional settings (currency code, decimals, grouping, negative style, percent decimals).
4. Annotate **all known** Platform/Simulator export section definitions that have amounts or list-like fields.

Depends on **v1062** resolver.

## c) User stories

1. As a user previewing a Business Case PDF, Costs show a table including Development, Ongoing, and Total Investment with correct currency.
2. As a user, list fields still export as bullets.
3. As a developer, I set `valueType` on export field defs; the engine handles layout.
4. As PMO, changing org currency updates subsequent exports for projects that inherit it.

## d) Implementation decisions (settled)

| # | Decision |
|---|----------|
| Typing | Field `valueType`: `currency` \| `number` \| `percent` \| `text` \| `list` |
| Layout | Consecutive numeric types → one Item\|Value table per run |
| Currency display | Resolved settings currency, else `$` |
| Scope | Annotate all known amount/list export section defs (Platform + Simulator) |
| Delivery | After v1062 |

## e) Testing decisions

- Unit: coalesce runs; currency/number/percent formatting; list unchanged; amount-with-comma regression still holds.
- Manual: Business Case preview Costs table; Word/Excel smoke.

## f) Out of scope

- Changing on-screen Business Case form layout (already tabular in UI).
- Building Regional & Format Settings UI (v1062).

## g) Further notes

- Sync `packages/shared` + app-local `exportUtils` / `*ExportSections*` copies (Vite aliases).
- Add computed `total_investment` on Business Case export record when missing.
