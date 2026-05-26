# Email Sender Profiles

Sender profiles let PMO admins map each **project type** to a dedicated **From Email** and **From Name**, while keeping a single Resend (or SMTP) provider configuration in Email Settings.

## Prerequisites

1. Active provider in **Platform → Admin → Email Settings** (Resend API recommended).
2. `send-email` Edge Function deployed to Supabase.
3. SQL migration `SQL/v566_email_sender_profiles.sql` applied.
4. Verified sending domain: `updates.projectastute.com`.

## Configuration

### Email Settings (provider)

- Path: `/platform/admin/email-settings`
- Stores API key and global fallback `from_email` / `from_name` in `email_configurations`.

### Sender Profiles (identity per project type)

- Path: `/platform/admin/email-sender-profiles`
- Table: `email_sender_profiles`
- **System Default** — `is_default = true`, `project_type_id` null; used when no type-specific profile matches.
- **Project type profile** — one row per project type per active email config.

All `from_email` values must use `@updates.projectastute.com`.

## Resolution order

When `send-email` runs:

1. If `project_type_id` is in the request body → match active profile for that type.
2. Else → active profile with `is_default = true`.
3. Else → `from_email` / `from_name` on `email_configurations`.

Explicit `from` / `from_name` in the request still override resolved values.

## Call sites

| Flow | `project_type_id` passed? |
|------|---------------------------|
| Project invitation | Yes — from `projects.project_type_id` |
| `emailIntegrationService.sendEmail` | Yes — when `project_id` or `project_type_id` in options object |
| Organisation verification | No — uses default profile / global config |
| Email Settings test | No |

`emailIntegrationService` no longer sends hard-coded `from` headers to the Edge Function, so sender profiles apply to all emails sent through that path.

## Menu

**Email & Notifications** section in the PMO sidebar:

- Email Settings
- Sender Profiles
- Invitation Templates
- Invitation Expiry

## Troubleshooting

| Issue | Action |
|-------|--------|
| Wrong sender on invitations | Add or edit a profile for that project's type |
| All emails use global sender | Create a **System Default** profile or type-specific profiles |
| Cannot save profile | Confirm Email Settings is saved first; check domain on From Email |
| 403 on profiles table | Run `v559` / `v561` email config RLS scripts |

## Simulator

Sender profiles are **platform-only** (`public` schema). The simulator does not duplicate this table.
