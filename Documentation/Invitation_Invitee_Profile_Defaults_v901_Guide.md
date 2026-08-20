# Invitation invitee name and role → user profile (v901)

When a PMO / Portfolio / Programme / Project Manager creates a user via an email invitation, the invitee **Name** and **Role** shown on the invitation accept card become the defaults on **My Profile**.

## Mapping

| Invitation accept card | User profile (`/platform/profile`) |
|---|---|
| **Name** (invitee first + last name) | **Full Name** (`users.full_name`) |
| **Role** (`roles.role_display_name`) | **Job Title** (`users.job_title`) |

## When it applies

- New account created by accepting the invitation (`accept-invitation` Edge Function).
- Existing account that signs in to accept (profile still has the email handle as Full Name, or Job Title is blank).
- Already-accepted invitees whose profile was left as the email prefix (one-time SQL backfill).

A real, user-edited Full Name or Job Title is **not** overwritten.

## What to run

Apply `SQL/v901_invitation_accept_profile_name_and_job_title.sql` in the Supabase SQL editor. That installs:

1. `apply_invitation_profile_defaults()` helper
2. Accept triggers on `project_invitations` and `organisation_invitations`
3. A one-time repair for existing invitee rows (including the handle-like Full Name case)

Redeploy the `accept-invitation` Edge Function after pulling this change so new-user signup writes `job_title` as well as `full_name`.
