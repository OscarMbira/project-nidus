# Searchable Long-List Selects (v1064)

## Purpose

Long option lists (time zones, countries, currencies, users, roles) use a searchable UI instead of a scrolling native `<select>`.

## Component

**Platform / Simulator:** `@nidus/ui/SelectField`  
**Admin:** `@nidus-admin/ui` `SelectField`

| Condition | UI |
|-----------|-----|
| `forceNative` | Themed native `<select>` |
| `forceSearchable` **or** `options.length ≥ 12` | `SearchableSelect` |
| Otherwise | Themed native `<select>` |

Constant: `SEARCHABLE_SELECT_MIN_OPTIONS = 12`.

## Usage

```jsx
import SelectField from '@nidus/ui/SelectField'

<SelectField
  options={[{ value: 'UTC', label: 'UTC' }, ...]}
  value={timeZone}
  onChange={setTimeZone}
  placeholder="Select time zone..."
  searchPlaceholder="Search time zones..."
  forceSearchable   // IANA / countries / async known-long
/>
```

- Prefer `{ value, label }` options.
- `allowCustom` / Admin `allowCreate`: off unless the field needs free-text.
- Short enums (12h/24h, status with few values): leave as native or use `SelectField` without force — auto stays native under 12.

## Where applied (initial pass)

- Regional & Format Settings — Time zone (`forceSearchable`), Currency (≥12)
- Organisation Profile — Country
- `UserSelectWithAdd` — org users / named contacts
- Invite / Bulk invite — role catalogs
- Admin — Tax rates country; payment country filters; FX/invoice/subscription currency catalogs

## Related

- PRD: `projectprd/v1064_searchable_long_list_selects_PRD.md`
- Plans: `projectplan/v1064_searchable_long_list_selects_plan.md`, Admin `projectplans/v209_searchable_long_list_selects_plan.md`
- Stakeholder timezone (pre-existing): `Documentation/Stakeholder_Timezone_Searchable_Dropdown.md`
