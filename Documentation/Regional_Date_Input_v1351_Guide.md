# Regional date input (v1351)

**Rule:** CLAUDE.md rule 79 (Admin: rule 24). **PRD / plan:** `projectprd/v1351_regional_date_input_PRD.md`,
`projectplan/v1351_regional_date_input_plan.md`.

## Why

Browser date pickers (`<input type="date">`, `<input type="datetime-local">`) draw the date in the computer's own
language and region. The same date showed as `09/08/2026` on one screen and `8 Sep 2026` on the next, and an
organisation that writes day-first dates saw month-first ones. Every date field now uses one shared control that
follows the organisation's **Regional & Format Settings** (rule 68).

## What people see

- The date in the organisation's **date format** (project override in project scope) — e.g. `8 Sep 2026`,
  `08/09/2026`, `09/08/2026`, `2026-09-08` or `Sep 8, 2026`.
- With a time, the organisation's **time format**: `14:30` or `2:30 PM`.
- **Type** the date in almost any common form, or **pick** it from the calendar button:
  - the organisation's own format, ISO (`2026-09-08`), or numbers in the format's day / month order
    (`8/9/2026`, `8-9-26`, `8.9.2026`);
  - month names in English or the display language (`8 Sep 2026`, `Sep 8, 2026`, `8 septembre 2026`);
  - `today`, `tomorrow`, `yesterday` (and `now` for a date and time);
  - times as `14:30`, `14.30`, `2:30 pm`, `2pm`, `1430`.
- The calendar starts the week on the organisation's **first day of week** and names months and days in its
  display language. Keys: arrows move a day / week, Page Up / Down a month, Enter picks, Esc closes. **Today**
  picks today; **Clear** empties an optional field.
- Text that is not a date (or is outside the field's allowed range) is flagged under the box with an example in
  the right format; the saved value does not change until it is fixed.

Admin has no regional settings, so `AdminDateInput` always shows D MMM YYYY, 24-hour, weeks starting Monday.

## For developers

```jsx
import RegionalDateInput from '@nidus/ui/RegionalDateInput'

// value / onChange exactly as before: 'YYYY-MM-DD'
<RegionalDateInput value={form.due_date} onChange={(v) => set('due_date', v)} required />

// an existing handler that reads e.target.value keeps working with eventStyle
<RegionalDateInput eventStyle name="due_date" value={form.due_date} onChange={handleChange} />

// date and time: 'YYYY-MM-DDTHH:mm' (wall clock, same as datetime-local)
<RegionalDateInput withTime value={form.starts_at} onChange={(v) => set('starts_at', v)} />
```

- Props mirror the native input: `value`, `onChange`, `id`, `name`, `required`, `min`, `max`, `disabled`,
  `readOnly`, `placeholder`, `className`, `aria-*`, `onKeyDown`, `onBlur`, … plus `withTime`, `eventStyle` and an
  optional `settings` (otherwise read from the nearest `FieldHelpScope` — every app has a root scope).
- `className` keeps the native input's meaning: layout classes (width, flex, grid span, margins) size the wrapper,
  the rest style the text box.
- Register engine fields of type `date` / `datetime` use it through `RegisterFieldInput` (`DateTimeInput` keeps
  its ISO-UTC storage, time zone and **Now** button). `TableListInput` date columns use it too.
- Logic (parsing, formatting, calendar) lives in `@nidus/shared/utils/regionalDateInput` (pure, unit-tested).
- Read-only dates: keep using `formatRegionalDate` / `formatRegionalDateTime`.
- Out of scope: month / week pickers and time-only inputs.

## Checks

- `node scripts/check-native-date-inputs.mjs` — fails on any browser date picker in Platform, Simulator, Planner or
  `packages/` (CI: `.github/workflows/native-date-inputs.yml`). `scripts/native-date-input-allowlist.json` lists
  files still to convert; do not add to it.
- `node scripts/replace-native-date-inputs.mjs [--write] [--skip-dirty] [paths…]` — the codemod used for the
  conversion; reports refs, spread props, `defaultValue` and dynamic `type` for hand edits.
- Admin: `node scripts/check-native-date-inputs.mjs` in the Admin repo (CI: `native-date-inputs.yml`).
