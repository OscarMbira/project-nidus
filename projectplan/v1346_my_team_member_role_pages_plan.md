# Plan v1346 — My Team member & functional-role pages

PRD: `projectprd/v1346_my_team_member_role_pages_PRD.md`  
**Status:** implemented (Platform + Simulator)

## Todos

- [x] **Routes (Platform):** Register under `/platform/my-team/…` (and alias `/platform/teams/my-team/…` if needed):
  - `members/new`, `members/:memberId/edit`
  - `roles/new`, `roles/:roleId/edit`
  - Query: `teamId` (+ existing `projectId` scoping via `usePlatformProjectId` / current project)
- [x] **Routes (Simulator):** Same shape under `/simulator/practice-teams/my-team/…`
- [x] **Pages — member Create/Edit:** Shared layout component or app-local pages with Details + Audit; fields: person (create only), role preset/custom, allocation %, start/end dates, comments; Back; unsaved guard; `useSuccessModal`; field help
- [x] **Pages — role Create/Edit:** Label, required skills (`MultiLineListInput`), sort order; Details + Audit; same chrome
- [x] **Wire MyTeam / SimMyTeam:** Replace modal openers with `navigate(…)`; Actions Edit → edit route; keep Delete confirm on list; remove modal usage once pages work
- [x] **Services:** Ensure `addTeamMember` / `updateTeamMember` pass dates + comments; role add/update pass skills + sort_order (extend if missing)
- [x] **Field help SQL:** Seeds for any newly surfaced columns (dates, comments, role skills/sort) + sim aliases if needed — next free `SQL/v{N}` after listing folder
- [x] **Seed top-up SQL:** Idempotent ≥10 members and ≥10 roles per team on SEED334-PRJ-08; Simulator practice twin — next free `SQL/v{N}`
- [x] **Tests:** FieldLabelWithHelp partition tests (nested select ⓘ alignment); role delete stays disabled when in use on list
- [x] **Parity check:** Platform `MyTeam.jsx` + Simulator `SimMyTeam.jsx`
- [x] **Review section:** Fill after implementation

## Notes

- Do not invent View routes.
- Access: keep PM / team-lead / PMO-all / `team.manage` behaviour from the list page; pages should re-check manage rights before save.
- Theme: inherit Layout grey; raised panels `bg-white dark:bg-gray-800` (surface rule).

## Review

### What shipped

1. **Platform My Team pages** — `MyTeamMemberPage.jsx`, `MyTeamFunctionalRolePage.jsx` with Details + Audit, unsaved guard, `useSuccessModal`, field help; Active (`is_active`) on member form.
2. **Routes** — `/platform/my-team/members|roles/…` and `/platform/teams/my-team/…` aliases; Simulator `/simulator/practice-teams/my-team/members|roles/…`.
3. **List wiring** — Platform/Sim My Team navigate to pages; modals removed from Sim My Team; team-scoped functional roles on Sim (with project-roles catalog link retained).
4. **SQL** — `v1533` field help + aliases; `v1534` SEED334-PRJ-08 top-up; `v1536` `is_active` help (+ sim alias).
5. **System-wide ⓘ alignment** — `FieldLabelWithHelp` + `partitionFieldLabelChildren` keep the help button on the label row when SelectField/input/textarea are nested under the label (fixes Team Detail “Member role” and any similar nested control). Unit tests in `packages/ui/src/__tests__/FieldLabelWithHelp.test.jsx` (21 passing).

### Remaining / follow-ups

- Simulator practice-team seed twin (≥10 members/roles) was scoped in the PRD; Platform `v1534` covers SEED334-PRJ-08 — add a dedicated sim seed SQL when a practice project twin is chosen.
- Opportunistic: migrate leftover `SimAddTeamMemberModal` / `SimEditTeamMemberModal` call sites if any remain outside My Team.
