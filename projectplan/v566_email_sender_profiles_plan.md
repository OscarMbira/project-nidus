# Email Sender Profiles — Implementation Plan
Version: v1.0 | Date: 2026-05-17

## Goal
Keep one global provider config (Resend API key / SMTP credentials) but allow PMO
admins to define multiple **Sender Profiles** — each profile maps a Project Type to
a specific From Email and From Name.  When a transactional email is triggered the
system picks the matching profile; if none exists it falls back to the global default.

---

## User Stories
1. As a PMO Admin I can create a Sender Profile linking a Project Type to a
   From Email + From Name so project emails appear to come from the right identity.
2. As a PMO Admin I can mark one profile as the System Default so all emails
   without a matching project type still have a valid sender.
3. As a PMO Admin I can edit or delete any profile.
4. When a transactional email is sent, the Edge Function automatically picks the
   correct From Email / From Name without any manual override.

---

## Architecture Decision
- **One provider config** → `email_configurations` (unchanged)
- **Many sender profiles** → new `email_sender_profiles` table
- Profiles are looked up by `project_type_id`; one row has `is_default = true`
  as the fallback
- The Edge Function accepts an optional `project_type_id` in the request body
  and resolves the correct profile via the REST API

---

## Database

### New table: `email_sender_profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| email_config_id | uuid FK | → email_configurations.id |
| project_type_id | uuid FK nullable | → project_types.id; NULL = default |
| profile_name | varchar(255) | Human label, e.g. "Construction Projects" |
| from_email | varchar(255) NOT NULL | Must be on the verified Resend domain |
| from_name | varchar(255) NOT NULL | Display name in email client |
| is_default | boolean DEFAULT false | Only one row should be true |
| is_active | boolean DEFAULT true | |
| is_deleted | boolean DEFAULT false | Soft delete |
| created_at | timestamptz DEFAULT now() | |
| updated_at | timestamptz DEFAULT now() | |
| created_by | uuid FK → users.id | |

**Constraints:**
- UNIQUE (email_config_id, project_type_id) where is_deleted = false
- Partial unique index ensuring only one is_default = true per email_config_id

**RLS:**
- `authenticated` with `can_manage_email_configurations()` → ALL operations
- `service_role` → ALL (for Edge Function)

**SQL file:** `SQL/v566_email_sender_profiles.sql`

---

## Backend Service
**File:** `src/services/emailSenderProfileService.js`

Functions:
- `getSenderProfiles()` — fetch all active profiles with project_type name joined
- `getSenderProfile(id)` — single profile
- `saveSenderProfile(data)` — create or update (upsert by id)
- `deleteSenderProfile(id)` — soft delete; blocks if it's the only default
- `setDefaultProfile(id)` — sets is_default=true, clears others
- `resolveProfile(projectTypeId)` — returns best-match profile:
  1. Exact match on project_type_id
  2. Fall back to is_default = true row
  3. Fall back to global email_configurations from_email / from_name

---

## Frontend — Dedicated Sender Profiles page
**File:** `src/pages/platform-app/EmailSenderProfiles.jsx` *(new standalone page)*
**Route:** `/platform/admin/email-sender-profiles`

Keeping Email Settings focused on provider credentials (API key / SMTP). Sender
Profiles gets its own page so it is independently navigable and discoverable.

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│  ✉ Sender Profiles                              [+ Add]     │
│─────────────────────────────────────────────────────────────│
│  Project Type        From Name          From Email    [Act] │
│  ─────────────────  ─────────────────  ─────────────  ──── │
│  ★ System Default   Project Nidus      noreply@...   ✏ 🗑  │
│  Construction       Nidus Build        build@...     ✏ 🗑  │
│  IT / Software      Nidus Tech         tech@...      ✏ 🗑  │
└─────────────────────────────────────────────────────────────│
```

### Add / Edit Profile — inline modal form
Fields:
- **Profile Name** (text) — free label
- **Project Type** (dropdown from project_types where is_active=true, plus "System Default" option)
- **From Name** (text, required)
- **From Email** (email, required — must end in verified domain)
- **Set as Default** (checkbox, only one allowed)

Validation:
- From Email must end in the verified Resend domain (`updates.projectastute.com`)
- Cannot delete the last default profile
- Cannot have two profiles for the same project type

Success feedback: show profile_name + from_email in confirmation banner.

---

## Sidebar Menu — Email & Notifications section (consolidation)

### Problem
Email-related sidebar entries are currently spread across three unrelated sections:
- **Invitation Templates** → Projects section (`pmo-projects`)
- **Email Settings** → Administration section (`pmo-administration`)
- **Invitation Expiry** → People & Resources section (`pmo-people-resources`)

### Solution
Create a new **"Email & Notifications"** top-level section in `pmoMenuConfig.js` that
consolidates all email-related items and includes the new Sender Profiles entry.

### New section (`src/config/pmoMenuConfig.js`)
```js
{
  id: 'pmo-email-notifications',
  label: 'Email & Notifications',
  path: null,
  icon: Mail,
  section: 'Email & Notifications',
  order: 15,
  children: [
    { id: 'pmo-email-settings',            label: 'Email Settings',       path: '/platform/admin/email-settings',         icon: Mail,     order: 1, permission: 'pmo.admin' },
    { id: 'pmo-email-sender-profiles',     label: 'Sender Profiles',      path: '/platform/admin/email-sender-profiles',  icon: AtSign,   order: 2, permission: 'pmo.admin' },
    { id: 'pmo-email-invitation-templates',label: 'Invitation Templates', path: '/app/settings/invitation-templates',     icon: FileText, order: 3, permission: 'pmo.admin' },
    { id: 'pmo-email-invitation-expiry',   label: 'Invitation Expiry',    path: '/platform/admin/invitation-settings',    icon: Clock,    order: 4, permission: 'pmo.admin' },
  ]
}
```

### Items to removed from their old sections
| Old entry id | Old section | Action |
|---|---|---|
| `pmo-pr-invitation-templates` | Projects | Remove |
| `pmo-admin-email-settings` | Administration | Remove |
| `pmo-people-invitation-expiry` | People & Resources | Remove |

### Route registration (`src/App.jsx`)
Add lazy import and route under the `/platform/admin/` path group:
```jsx
const EmailSenderProfiles = lazy(() => import('./pages/platform-app/EmailSenderProfiles'))
// …
<Route path="admin/email-sender-profiles" element={
  <Suspense fallback={<PageLoader />}>
    <EmailSenderProfiles />
  </Suspense>
} />
```

### `src/hooks/useMenu.js`
Add an `ensureAdminItem` entry for Sender Profiles; ensure Email Settings entry
is still present (it will now live in the new section, not Administration):
```js
ensureAdminItem('Email Settings',   '/platform/admin/email-settings',        'mail')
ensureAdminItem('Sender Profiles',  '/platform/admin/email-sender-profiles', 'at-sign')
```

---

## Edge Function update
**File:** `supabase/functions/send-email/index.ts`

Add optional field to `EmailRequest`:
```typescript
interface EmailRequest {
  ...
  project_type_id?: string;   // NEW — optional
}
```

Resolution logic (after fetching global config):
```
1. If project_type_id provided:
   GET /rest/v1/email_sender_profiles
     ?email_config_id=eq.<id>
     &project_type_id=eq.<project_type_id>
     &is_active=eq.true&limit=1
   If found → use profile.from_email, profile.from_name

2. If not found (or project_type_id absent):
   GET /rest/v1/email_sender_profiles
     ?email_config_id=eq.<id>
     &is_default=eq.true
     &is_active=eq.true&limit=1
   If found → use profile.from_email, profile.from_name

3. If still not found → fall back to config.from_email, config.from_name
```

---

## Call-site update
Services that invoke `send-email` (invitations, org verification, etc.) should pass
`project_type_id` when the email is linked to a project:
- `invitationService.js` — pass project's type id if available
- `registrationEmailService.js` — no project type, uses default

---

## Todo List
- [x] 1. Create `SQL/v566_email_sender_profiles.sql` (table + RLS + register)
- [x] 2. Create `src/services/emailSenderProfileService.js`
- [x] 3. Create `src/pages/platform-app/EmailSenderProfiles.jsx` (new dedicated page — includes Send Test Email per profile)
- [x] 4. Consolidate sidebar — add new "Email & Notifications" section to `src/config/pmoMenuConfig.js`; remove `pmo-pr-invitation-templates`, `pmo-admin-email-settings`, `pmo-people-invitation-expiry` from their old sections
- [x] 5. Add `AtSign` to the lucide-react import in `pmoMenuConfig.js`
- [x] 6. Add route to `src/App.jsx` for `/platform/admin/email-sender-profiles`
- [x] 7. Update `ensureAdminItem` entries in `src/hooks/useMenu.js`
- [x] 8. Update `supabase/functions/send-email/index.ts` — profile resolution
- [x] 9. Update `invitationService.js` to pass `project_type_id`
- [x] 10. Write unit tests for `emailSenderProfileService.js`
- [x] 11. Simulator parity check (email sender profiles are platform-only — no sim schema needed)
- [x] 12. Document in `Documentation/email_sender_profiles_guide.md`

---

## Out of Scope (this plan)
- Per-project (not per-project-type) overrides
- Reply-To overrides per profile (can be added later)
- Email template selection per project type (separate feature)

---

## Review
**Completed:** 2026-05-17

- `SQL/v566_email_sender_profiles.sql` — table, indexes, RLS, `database_tables` registration.
- `emailSenderProfileService.js` — CRUD, `resolveSenderFromProfiles`, domain validation; 6 unit tests passing.
- `EmailSenderProfiles.jsx` — list, modal add/edit, set default, delete guards.
- PMO menu consolidated under **Email & Notifications**; dynamic menu via `ensureEmailNotificationsItem` in `useMenu.js`.
- `send-email` resolves `project_type_id` → default profile → global config.
- Invitations pass `project_type_id` from `projects` (also wired in `pmoAdminService` / `orgAdminService`).
- Guide: `Documentation/email_sender_profiles_guide.md`.

**Deploy steps for operator:**
1. Run `SQL/v566_email_sender_profiles.sql` in Supabase SQL Editor (or `supabase db push` for `supabase/migrations/20260517140000_email_sender_profiles_v566.sql`).
2. Redeploy Edge Function: `npx supabase functions deploy send-email`.
3. Create at least one **System Default** sender profile in the UI.
4. Optionally add per–project-type profiles.

---

## Audit pass 2 (2026-05-17)

Additional gaps closed after code review:

| Gap | Fix |
|-----|-----|
| `emailIntegrationService` passed `from` / `from_name`, bypassing profile resolution | Edge payload omits `from`; optional `project_type_id` from `project_id` |
| `sendEmail()` object-style calls (issue reports, etc.) ignored | `sendEmail` accepts options object + resolves `project_type_id` |
| `getSenderProfiles` listed inactive rows | Filter `is_active = true` |
| Non-default save without project type | `parseSenderProfileInput` validation |
| `created_by` used auth UUID | Maps `auth_user_id` → `users.id` |
| No cross-link Email Settings ↔ Sender Profiles | Link added on Email Settings page |
| No Supabase CLI migration | `supabase/migrations/20260517140000_email_sender_profiles_v566.sql` |
| `send-email` README outdated | Documented `project_type_id` + sender profiles |
| Extra unit tests | `parseSenderProfileInput` tests (8 total) |

All original todo items remain `[x]`.
