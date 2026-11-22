# v1351 — Regional date input (plan)

PRD: `projectprd/v1351_regional_date_input_PRD.md` (decisions D1–D6, owner 2026-11-22).

## Steps (one change, D6)

### 1. Shared logic (`packages/shared/src/utils/regionalDateInput.js`)
- [ ] `formatDateForInput(value, settings)` → display text (reuses `formatRegionalDate`).
- [ ] `parseTypedDate(text, settings)` → `YYYY-MM-DD` or null: the setting's format, numeric forms in its day / month
      order, ISO, month names (display locale and English), today / tomorrow / yesterday.
- [ ] Date-time: `formatDateTimeForInput` / `parseTypedDateTime` using the org time format and time zone (reuse
      `registerDateTime.js` conversions so stored ISO values do not change).
- [ ] `calendarMonth(year, month, firstDayOfWeek)` → weeks grid.
- [ ] Unit tests for all of the above.

### 2. Control (`packages/ui/src/RegionalDateInput.jsx`)
- [ ] Text box + calendar button; popover calendar (month grid, prev / next, today, clear, keyboard arrows / Enter / Esc).
- [ ] Props mirror the native input: `value`, `onChange(value)`, `id`, `name`, `required`, `min`, `max`, `disabled`,
      `readOnly`, `aria-*`, `className`, `placeholder`, plus `withTime` and optional `settings` (else read from the
      nearest regional settings — the same resolution `FieldHelpScope` uses, project override in project scope).
- [ ] Also accepts an `onChange` that expects an event (`e.target.value`) so call sites can switch with a one-line
      change: `onChange` receives a synthetic `{ target: { value, name, id } }` when `eventStyle` is set — the
      codemod sets it where the old handler read `e.target.value`.
- [ ] Theme-aware, phone-friendly, accessible; component tests.
- [ ] `DateTimeInput` becomes a thin wrapper over it (`withTime`), keeping its "Now" action.

### 3. Replace every picker (codemod, reviewed)
- [ ] `scripts/replace-native-date-inputs.mjs`: rewrites `<input type="date" …/>` / `type="datetime-local"` JSX to
      `<RegionalDateInput … />` (keeps props; sets `eventStyle` for `e.target.value` handlers; adds the import);
      reports anything it cannot rewrite safely (spread props, refs, dynamic `type`) for hand edits.
- [ ] Run on Platform, Simulator, Planner, packages; hand-fix the reported cases; skip files with other sessions'
      uncommitted edits and list them.
- [ ] Update tests that typed into native date inputs.

### 4. Admin (separate repo)
- [ ] `@nidus-admin/ui` `AdminDateInput` (copy of the control, fixed D MMM YYYY / 24-hour) + tests; replace the 24 files.

### 5. Guard + docs
- [ ] `scripts/check-native-date-inputs.mjs` (+ tests) in CI for all four apps; CLAUDE.md rule 79 (monorepo) and Admin rule.
- [ ] `Documentation/Regional_Date_Input_v1351_Guide.md`.
- [ ] Builds (4 apps), full test suites against the baseline, one commit per repo; owner browser check.

## Review

(to be completed)
