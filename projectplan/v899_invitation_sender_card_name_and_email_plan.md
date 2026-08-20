# v899 — Invitation "Sent by" card: correct name source + add inviter email

## Context

Two related fixes to the "Invitation sent by" card shown in invitation emails
(`buildInvitationEmailHtml`/`buildInvitationEmailText` in `invitationService.js`)
and used by every invite path that calls `dispatchProjectInvitationEmail` /
`dispatchOrganisationPmoAdminInvitationEmail` (project role invites, PMO
Administrator org-wide invites, invitation reminders).

## Todo

- [x] **Name source bug**: `resolveInviterDisplayNameFromUser`
      (`packages/shared/src/utils/invitationInviteeFormat.js`) prioritised
      composed `first_name + last_name` over the DB `full_name` field. Since
      `Settings.jsx` only exposes a single "Full name" input (no separate
      first/last name fields), `first_name`/`last_name` can go stale — e.g. a
      role title landing in `last_name` from an earlier onboarding flow —
      while `full_name` reflects what the user actually edited. Reordered to
      prefer `full_name` (when not email-handle-like) first, then composed
      first/last, then auth metadata, unchanged thereafter.
- [x] **Add inviter email to the card**: threaded a new `inviterEmail` field
      end-to-end — `pmoAdminService.js` (`sendRoleInvitation`) and
      `accountBillingDelegateService.js` (`invitePmoAdministrator`) now
      resolve it from the same `get_my_display_name()` RPC row already used
      for name/job title, `dispatchProjectInvitationEmail` /
      `dispatchOrganisationPmoAdminInvitationEmail` / `sendInvitationReminder`
      pass it through, and `buildInvitationEmailHtml` / `buildInvitationEmailText`
      render it as a new "Email" row directly under "Name" in the sender card
      (HTML + plain-text versions).
- [x] Platform–Simulator parity (rule 34.1): mirrored every edit into
      `apps/simulator/src/services/{invitationService,pmoAdminService,
      accountBillingDelegateService}.js` — diffed byte-identical against the
      Platform copies after editing.
- [x] Tests: added a regression test in
      `packages/shared/src/utils/__tests__/invitationInviteeFormat.test.js`
      locking in the full_name-over-stale-composed-name priority. Also added
      the pre-existing-but-never-run `invitationInviteeFormat.test.js` to
      `packages/shared/vitest.config.js`'s `include` list (needed to verify
      this exact change; it was a pre-existing gap, not introduced here).
      Full `packages/shared` suite: 56 files / 492 tests passing.
- [ ] Manual verification: send a project-role invite and a PMO Administrator
      invite from a real Supabase-backed session; confirm the "Invitation
      sent by" card shows the correct profile full name and the new Email row.

## Follow-up: the real root cause (found via live DB diagnostic)

The client-side priority fix above was necessary but not sufficient. Live
diagnostic query against `public.users` (run by the user) showed `full_name`
still held the bad value even *after* a Settings-page save that the app UI
confirmed succeeded (header updated). Root cause: `get_my_display_name()`
(SQL v627)'s auth-metadata backfill triggers on `first_name IS NULL` — and
since `Settings.jsx` never writes `first_name`/`last_name` (only `full_name`),
that column stays NULL forever for any account that only ever used Settings.
Every RPC call (including the one inside `sendRoleInvitation()`) was
therefore re-running the backfill and silently overwriting a deliberately-set
`full_name` with stale `auth.users.raw_user_meta_data`, undoing the user's
own edit moments after they saved it.

- [x] `SQL/v900_fix_get_my_display_name_backfill_overwrite.sql`: redefined
      `get_my_display_name()` so the `full_name` backfill only fires when
      `full_name` is actually missing/blank/handle-like — never merely
      because `first_name`/`last_name` are null. `first_name`/`last_name`
      backfill-from-metadata is unchanged (harmless; no longer read for
      display). Includes a one-time data repair restoring the test account
      (`nombira@gmail.com`) to `full_name = 'Oscar PMO Administrator'`, since
      the live value had already been clobbered by the bug.
- [ ] **User to run** `SQL/v900_fix_get_my_display_name_backfill_overwrite.sql`
      in the Supabase SQL editor (not run by me — no DB execution access this
      session). After that, a Settings-page name edit will stick permanently;
      no further code changes are needed for this.

## Out of scope

- The "Team Manager"/"Team Member" exclusion from the PMO Admin role picker
  (separate request, same session) — user confirmed to leave as-is.
- No change to `first_name`/`last_name` data itself — this is a display-order
  fix, not a data migration. A user whose `full_name` is ALSO wrong still
  needs to fix it via Settings → Full name.
