# v1064 — System-wide searchable long-list dropdowns (implementation plan)

## Goal

Ship shared `SelectField` (≥12 → `SearchableSelect`), migrate existing long single-selects across Platform, Simulator, and Admin, and lock the rule in both CLAUDE files.

## Settled decisions

See [projectprd/v1064_searchable_long_list_selects_PRD.md](../projectprd/v1064_searchable_long_list_selects_PRD.md).

Admin counterpart plan: `E:\project-nidus-admin\projectplans\v209_searchable_long_list_selects_plan.md`.

## API sketch (`SelectField`)

```jsx
<SelectField
  options={[{ value, label }, ...]}
  value={value}
  onChange={onChange}           // value string/number
  placeholder="Select..."
  searchPlaceholder="Search..."
  disabled={false}
  required={false}
  allowCustom={false}           // default false
  forceSearchable={false}
  forceNative={false}
  openAbove={false}
  combobox={false}
  className=""
  id=""
  aria-label=""
/>
```

**Switch logic:** `forceNative` → native; else `forceSearchable || options.length >= 12` → `SearchableSelect`; else themed native `<select>`.

Constant: `SEARCHABLE_SELECT_MIN_OPTIONS = 12` exported from the same module (or `@nidus/shared` if preferred for Admin parity without importing UI).

## Priority census (migrate this pass)

### P0 — User-reported / clear ≥12 catalogs
| App | Target | Notes |
|-----|--------|-------|
| P+S | `RegionalFormatFields` `time_zone` | `forceSearchable`; ~400 IANA |
| P+S | `RegionalFormatFields` `currency_code` | 16 options ≥12 |
| P+S | `OrganisationProfile` country | `countries` active |
| Admin | TaxRates / Payment routing / flow / monitor country | v209 |
| Admin | Country form default currency; ExchangeRate; Invoice/Sub/Payment currency | v209 |

### P1 — Shared / high-traffic pickers
| App | Target | Notes |
|-----|--------|-------|
| P+S / packages | `UserSelectWithAdd` | Switch inner select to SelectField / SearchableSelect |
| P+S | Programme/Portfolio owner-manager; Tasks assignee; Risk/Quality/Benefits owners | User lists |
| P+S | InviteUserForm / BulkInviteForm / RoleMenuCustomiser | Role catalogs |
| Admin | Industry category forms; tester grant catalogs; session admin filter | When ≥12 |

### Leave native
- Options always &lt;12 (time format, first day of week, locale ~8, short currency stubs, page-size).
- Already on `SearchableSelect` (stakeholder timezone, org setup country, etc.).

## Todos

- [x] Add `SelectField` + unit tests in `packages/ui`; sync Platform/Simulator UI copies; export path `@nidus/ui/SelectField`
- [x] Migrate Regional Format fields (timezone + currency); keep short fields native
- [x] Migrate Organisation Profile country (P+S)
- [x] Migrate `UserSelectWithAdd` + priority P1 forms (Invite/BulkInvite roles) (P+S parity)
- [x] Admin: `SelectField` + migrate country/currency/catalog pages (see v209)
- [x] CLAUDE.md rule (monorepo) + Admin CLAUDE.md rule
- [x] Documentation guide under `Documentation/`
- [x] Plan review section after implementation

## Tracer bullets (implementation order)

1. Red-green: `SelectField` switch tests → implement component.
2. Regional Format timezone (immediate user pain).
3. Organisation Profile country.
4. UserSelectWithAdd + remaining P1 census.
5. Admin v209 pass.
6. CLAUDE + guide.

## Review

### What shipped
- `packages/ui/src/SelectField.jsx` (+ app UI copies) with ≥12 auto-switch, `forceSearchable` / `forceNative`; unit tests pass.
- Regional Format uses `SelectField` (timezone forced searchable; currency auto ≥12).
- Organisation Profile country searchable; theme shell fixed while amending.
- `UserSelectWithAdd`, InviteUserForm, BulkInviteForm role picks migrated (Platform + Simulator sync).
- Admin `SelectField` + TaxRates / Payment* / Country / Exchange / Invoice / Subscription / PaymentTransactions country & currency catalogs.
- CLAUDE rule **69** (monorepo) + Admin rule **21**; guide `Documentation/Searchable_Long_List_Selects_v1064_Guide.md`.

### Validation
- `pnpm --filter @nidus/ui test -- src/__tests__/SelectField.test.jsx` — 5 passed.
- Manual: Regional Format Time zone search; Organisation Profile country; Admin tax rate country.

### Remaining / follow-up
- Additional P1 native user pickers (Programme/Portfolio forms, Tasks assignee, Risk/Quality owners, structured report headers) still on native `<select>` in places — convert opportunistically under rule 69 when next touched, or a focused follow-up pass.
- Multi-select long lists remain out of scope.
