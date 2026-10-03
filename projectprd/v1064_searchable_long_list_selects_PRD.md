# v1064 — System-wide searchable long-list dropdowns (`SelectField`)

## a) Problem statement

Long option lists (IANA time zones ~400, countries ~200, currencies, org users/roles) are still rendered as native `<select>` on many Platform, Simulator, and Admin surfaces. Users cannot type to filter (Regional & Format Settings → Time zone is the current pain). Shorter enums and some domains already use `@nidus/ui` / Admin `SearchableSelect`, so behaviour is inconsistent.

## b) Solution

Introduce a thin shared **`SelectField`** that:

1. Renders **`SearchableSelect`** when `options.length ≥ 12` (or `forceSearchable`), else a themed native `<select>` (or `forceNative`).
2. Reuses existing `SearchableSelect` (no new library).
3. Migrate existing ≥12 plain single-selects across **Platform + Simulator + Admin** in one pass.
4. Encode the rule in monorepo `CLAUDE.md` and Admin `CLAUDE.md` for all future selects.

## c) User stories

1. As a PM editing Regional & Format Settings, I can search/filter Time zone instead of scrolling a huge native list.
2. As a user filling Organisation Profile, I can search Country the same way.
3. As an Admin operator, country/currency catalog picks on payment and FX pages are searchable when lists are long.
4. As a developer, I use `SelectField` by default and get searchable behaviour automatically at ≥12 options.
5. As a developer, I can force searchable (async known-long lists) or force native (known-short) via props.
6. As a reader of CLAUDE.md, I know new ≥12 selects must not ship as plain `<select>`.

## d) Implementation decisions (settled)

| # | Decision |
|---|----------|
| Scope apps | Platform + Simulator + Admin (one pass) |
| Threshold | ≥ **12** options → searchable |
| Component | New **`SelectField`** wrapping SearchableSelect / native |
| Overrides | `forceSearchable` / `forceNative` |
| `allowCustom` | Off by default; opt-in only where already needed |
| Multi-select | Out of scope this pass |
| Existing SearchableSelect | Keep; new/migrated code prefers SelectField |
| Persistence | CLAUDE rule (monorepo + Admin) |

## e) Testing decisions

- Unit: `SelectField` chooses SearchableSelect at 12+ options, native below 12; respects `forceSearchable` / `forceNative`.
- Manual: Regional Format timezone search; Organisation Profile country; one Admin currency/country page; light/dark.
- Platform–Simulator parity for migrated shared/local copies.

## f) Out of scope (v1064)

- Multi-select / `MultiSearchableSelect` rollout.
- Replacing short enums (&lt;12) with searchable UI.
- Third-party select libraries (react-select, etc.).
- Changing option **data sources** (still DB / existing helpers).
- v1063 export `valueType` tables (separate).

## g) Further notes

- Sync app-local `@nidus/ui` copies under `apps/*/src/components/ui` where the Vite alias points.
- Admin: `AdminSelectField` (or `SelectField` under `@nidus-admin/ui`) mirroring the same API.
- Known high-value migration targets: `RegionalFormatFields` timezone (+ currency ≥12), Organisation Profile country, Admin country/currency pages, `UserSelectWithAdd` and high-traffic user/role pickers (see plan census).
- Prefer `{ value, label }` option shape already used by `SearchableSelect`.
