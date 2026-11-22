# v1351 — Regional date input (plan)

PRD: `projectprd/v1351_regional_date_input_PRD.md` (decisions D1–D6, owner 2026-11-22).

## Steps (one change, D6)

### 1. Shared logic (`packages/shared/src/utils/regionalDateInput.js`)
- [x] `formatDateForInput(value, settings)` → display text (reuses `formatRegionalDate`).
- [x] `parseTypedDate(text, settings)` → `YYYY-MM-DD` or null: the setting's format, numeric forms in its day / month
      order, ISO, month names (display locale and English), today / tomorrow / yesterday.
- [x] Date-time: `formatDateTimeForInput` / `parseTypedDateTime` using the org time format and time zone (reuse
      `registerDateTime.js` conversions so stored ISO values do not change).
- [x] `calendarMonth(year, month, firstDayOfWeek)` → weeks grid.
- [x] Unit tests for all of the above.

### 2. Control (`packages/ui/src/RegionalDateInput.jsx`)
- [x] Text box + calendar button; popover calendar (month grid, prev / next, today, clear, keyboard arrows / Enter / Esc).
- [x] Props mirror the native input: `value`, `onChange(value)`, `id`, `name`, `required`, `min`, `max`, `disabled`,
      `readOnly`, `aria-*`, `className`, `placeholder`, plus `withTime` and optional `settings` (else read from the
      nearest regional settings — the same resolution `FieldHelpScope` uses, project override in project scope).
- [x] Also accepts an `onChange` that expects an event (`e.target.value`) so call sites can switch with a one-line
      change: `onChange` receives a synthetic `{ target: { value, name, id } }` when `eventStyle` is set — the
      codemod sets it where the old handler read `e.target.value`.
- [x] Theme-aware, phone-friendly, accessible; component tests.
- [x] `DateTimeInput` becomes a thin wrapper over it (`withTime`), keeping its "Now" action.

### 3. Replace every picker (codemod, reviewed)
- [x] `scripts/replace-native-date-inputs.mjs`: rewrites `<input type="date" …/>` / `type="datetime-local"` JSX to
      `<RegionalDateInput … />` (keeps props; sets `eventStyle` for `e.target.value` handlers; adds the import);
      reports anything it cannot rewrite safely (spread props, refs, dynamic `type`) for hand edits.
- [x] Run on Platform, Simulator, Planner, packages; hand-fix the reported cases; skip files with other sessions'
      uncommitted edits and list them.
- [x] Update tests that typed into native date inputs.

### 4. Admin (separate repo)
- [x] `@nidus-admin/ui` `AdminDateInput` (copy of the control, fixed D MMM YYYY / 24-hour) + tests; replace the 24 files.

### 5. Guard + docs
- [x] `scripts/check-native-date-inputs.mjs` (+ tests) in CI for all four apps; CLAUDE.md rule 79 (monorepo) and Admin rule.
- [x] `Documentation/Regional_Date_Input_v1351_Guide.md`.
- [ ] Builds (4 apps), full test suites against the baseline, one commit per repo; owner browser check.

## Review

**Done 2026-11-22.**

- **Shared logic** `packages/shared/src/utils/regionalDateInput.js` (+12 tests): formats a stored date in the
  organisation's format without day shifts (noon UTC), reads typed dates (own format, ISO, numbers in the
  format's day / month order, month names in English or the display locale, today / tomorrow / yesterday),
  times (24 h and 12 h), "now", min / max, calendar weeks from the first day of week.
- **Control** `packages/ui/src/RegionalDateInput.jsx` (+8 tests): text box + calendar (keyboard, Today, Clear),
  settings from the nearest help scope; `eventStyle` keeps `e.target.value` handlers; `className` keeps the
  native meaning (layout classes size the wrapper). `DateTimeInput` (register Date & Time) now wraps it and
  keeps ISO-UTC storage and "Now"; `RegisterFieldInput` date fields and `TableListInput` date columns use it.
- **Codemod** `scripts/replace-native-date-inputs.mjs`: 410 pickers in 232 files + 4 hand edits (spread props,
  dynamic type) — 249 files in all, Platform, Simulator, Planner, packages. 6 files with other sessions'
  uncommitted edits skipped and listed in `scripts/native-date-input-allowlist.json`.
- **Admin**: `AdminDateInput` + `adminDateInputUtils.js` (fixed D MMM YYYY / 24-hour / Monday, +4 tests);
  47 pickers in 24 files; guard `scripts/check-native-date-inputs.mjs` + CI.
- **Guard** `scripts/check-native-date-inputs.mjs` + `.github/workflows/native-date-inputs.yml` (+5 script tests).
  Rule 79 / Admin rule 24 updated; guide `Documentation/Regional_Date_Input_v1351_Guide.md`.
- **Tests:** Simulator — no new failures (17 failing files all at baseline; 3 more test sources deleted in
  v917). Platform — no new failures; `PMORFPCreate` and `PracticeProjects` failed only under load and pass
  alone. Packages — `@nidus/ui` 11 load timeouts pass alone; `@nidus/planning` `PlanSheet` passes alone; shared
  failures unrelated (export pop-up, time-zone sort, query router).
- **Lesson (test runs):** running several suites at once on this 4-core machine caused the timeouts and the
  apparent hang; run one suite at a time, related tests first.
- **Open:** convert the 6 allow-listed files when their owners commit; owner browser check (light and dark,
  typing and calendar, a date-and-time field, a register date field).
