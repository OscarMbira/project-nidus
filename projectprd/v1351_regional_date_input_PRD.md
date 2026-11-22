# v1351 — Regional date input (PRD)

## a) Problem statement

Date fields use the browser's own picker (`<input type="date">` / `type="datetime-local"`). Browsers draw it from the
computer's language and region, not from the organisation's Regional & Format Settings (rule 68), and a page cannot
change that. The same date therefore appears three ways on one screen (owner report 2026-11-22, Technical Debt
register): the field shows "08 Sept, 2026", the help's format note says "D MMM YYYY", and (before the 3bd5e21d fix)
the help's example showed "Mar 15, 2027". Users get little training (rule 62), so a date must look the same
everywhere: in fields, lists, help and exports.

Scale (2026-11-22): ~455 browser date / date-time pickers — Platform ~300 in 169 files, Simulator ~115 in 66 files,
Planner 1, shared packages 16 in 9 files, Admin 24 files.

## b) Solution

One shared control, `RegionalDateInput` (`@nidus/ui`), used for every date and date-time field:
- shows the value in the organisation's date format (and time format / time zone for date-time);
- people can type the date (in that format, common numeric forms in the setting's day / month order, or shortcuts)
  or pick it from a calendar;
- stores exactly what the browser picker stored (`YYYY-MM-DD` for dates; the existing ISO value for date-time),
  so no service, database or export changes.
Admin gets its own copy (`@nidus-admin/ui`) with a fixed D MMM YYYY / 24-hour format.

## c) User stories

1. A date field shows its value in the organisation's date format (e.g. "8 Sep 2026" for D MMM YYYY).
2. A project's own date format override (rule 68) applies in project scope.
3. I can type "8 Sep 2026", "8/9/2026" (day / month order from the setting), "2026-09-08" or "today" and the field
   shows it back in the organisation's format.
4. Text that is not a date is flagged on leaving the field; the stored value does not change.
5. I can open a calendar, move with the arrow keys, pick a day, jump to today, and clear the field.
6. The calendar's week starts on the organisation's First day of week; month and day names follow the display locale.
7. A date-and-time field shows and accepts the time in the organisation's time format (12h / 24h) and time zone, and
   keeps a "Now" action where the old control had one.
8. Required, min and max still work as before (the same props the native input had).
9. Disabled and read-only fields look and behave as before.
10. The control works in light and dark mode (rule 28.1) and on phones (rule 29 / 39).
11. Screen readers announce the label, the format expected and errors; the help label (rule 76) still links to it.
12. Every date and date-time field in Platform, Simulator and Planner uses the control.
13. Every date and date-time field in Admin uses Admin's copy, showing D MMM YYYY / 24-hour.
14. A CLAUDE.md rule forbids new browser date pickers, and a CI check fails if one appears.

## d) Implementation decisions (owner, 2026-11-22)

- **D1 Scope:** everywhere — Platform, Simulator, Planner, shared packages and Admin — in one programme.
- **D2 Entry:** type or pick (calendar), always shown in the organisation's format.
- **D3 Calendar:** built in-house in `@nidus/ui` (no new dependency); Admin copies it.
- **D4 Date-time:** included — the same control with a time part; replaces `DateTimeInput` and every `datetime-local`.
- **D5 Admin:** included, own copy, fixed D MMM YYYY / 24-hour (Admin has no organisation regional setting).
- **D6 Delivery:** all at once — build the control and replace every picker in one change, test once, one commit
  (monorepo) plus one commit in the Admin repo.
- Value contract unchanged: `value` / `onChange(value)` with the same string shapes as the native inputs, so forms,
  services, SQL and exports are untouched.
- Files with other sessions' uncommitted edits are skipped and listed (as in v1349), then picked up afterwards.

## e) Testing decisions

- Unit tests for the parser / formatter (all date formats × typed forms × locales; invalid text; min / max;
  date-time with 12h / 24h and time zones) and for the calendar (keyboard, first day of week, today / clear).
- Component tests for `RegionalDateInput` (type, pick, clear, required, disabled).
- The CI check (`scripts/check-native-date-inputs.mjs`) with its own tests.
- Every app builds; full Platform and Simulator suites show no new failing test files against the v1349 baseline;
  tests that typed into native date inputs are updated to the new control.
- Owner browser check after the change (Technical Debt register, a Platform form, a Simulator form, Planner, Admin).

## f) Out of scope

- Read-only date display in lists, exports and views (already formatted through `formatRegionalDate`).
- Month / week / range pickers (`type="month"`, `type="week"`), time-only inputs.
- Changing stored values, SQL or exports.

## g) Further notes

- The 3bd5e21d fix made `formatRegionalDate` honour the order of 'D MMM YYYY' / 'MMM D, YYYY'; the control reuses it.
- Rule 36 amount shorthand is unrelated; date shortcuts are limited to today / tomorrow / yesterday.
