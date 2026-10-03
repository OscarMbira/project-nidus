# v1094 — Team Charter Accountability

**Status:** Approved for implementation (2026-09-20).
**Related:** Team Charter (`team_charters`), Project Team.

---

## a) Problem statement

Teams need agreed consequences / escalation when charter norms and values are
not followed. Without a dedicated section, this is buried or missing, so members
do not see clear accountability when they view the charter.

## b) Solution

Add an **Accountability** list section on Team Charter (edit tab + view section),
stored as newline-joined text on `team_charters.accountability`, after Team Norms.

## c) User stories

1. As an editor, I add accountability items (one per row) on Edit Team Charter.
2. As a team member, I see Accountability on the Team Charter view with other sections.
3. As a user, I can export Accountability with the rest of the charter content.

## d) Implementation decisions

1. Label: Accountability (not Punishment).
2. Tab order: after Team Norms, before Communication Plan.
3. Same MultiLineListInput pattern as Norms/Values.
4. Platform + Simulator (`public` + `sim`).

## e) Testing decisions

- Edit form includes accountability in EMPTY / TABS / LIST_FIELDS and load/save.
- View and export include the section.

## f) Out of scope

- Acknowledgement workflow
- Incident/HR case tracking

## g) Further notes

SQL: `SQL/v1094_team_charters_accountability.sql` — run on Supabase before using the field.
