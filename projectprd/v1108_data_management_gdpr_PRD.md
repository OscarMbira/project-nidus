# v1108 — Data Management (GDPR Compliance Suite) — PRD

**Applies to:** Platform (`apps/platform`), Simulator (`apps/simulator`)
**Origin:** PMO Admin's "Data Management" tab (`PMOAdmin.jsx`) has shown a generic
"being enhanced" placeholder since it was first built. This PRD replaces that placeholder with a
real feature.

## a) Problem statement

PMO Admin's Data Management tab, and three of its four sibling tabs, were built as placeholders
and never finished. Two of those (Users & Roles, Billing) were trivial — real pages already
existed elsewhere and just needed wiring up (done under a separate small fix, ahead of this PRD).
Data Management is different: there is no existing page to link to, but there **is** a
substantial, fully-built-but-never-wired GDPR compliance module already sitting in the codebase —
`services/gdprService.js` (consent logging, data export requests, data deletion/anonymization
requests, privacy preferences, data breach records), an admin dashboard
(`pages/admin/GDPRCompliance.jsx`), a self-service center (`pages/settings/PrivacyCenter.jsx`),
and supporting components. None of it is reachable from any route today. The backing tables
(`SQL/v54_gdpr_compliance.sql`) are part of the original first commit and are very likely already
live in the database.

Two more problems surfaced while investigating this module:

1. Its RLS policies check for a `'System Admin'` role that no longer exists in the current role
   model (today's equivalent is `'PMO Admin'`), and compare `user_id = auth.uid()` directly — the
   same `auth_user_id`-linkage mismatch class of bug this codebase has hit and fixed before
   (`public.users.id` is not the same UUID space as `auth.uid()`). As written, these policies
   would silently deny access to legitimate users.
2. Its data export/deletion-anonymization only covers `users` + `user_projects` + `tasks` +
   `user_preferences` — the code's own comment flags this as "simplified."

## b) Solution

Wire up and modernize the existing GDPR module into two surfaces per app:

1. **Admin dashboard** — PMO Admin's Data Management tab (Platform) / a new
   `simulator/admin/data-management` page (Simulator) — for PMO Admin / Account Owner to view
   consent logs, process pending export and deletion requests, and log/track data breach
   incidents.
2. **Self-service Privacy Center** — a new "Privacy" tab on `Settings.jsx` (Platform) and its
   Simulator equivalent — for any user to manage their own consent, request an export of their
   own data, or request deletion of their own account data.

Both are rebuilt against the current UI standard (success-confirmation modal, icon-only row
actions, dark mode, audit tab, routed non-modal pages, unsaved-changes guard where applicable) and
against a corrected RLS/access model (PMO Admin + Account Owner for the admin side; row owner for
the self-service side, resolved via the correct `auth_user_id` linkage).

Data export and deletion-anonymization are expanded beyond the current `users`-table-only scope to
a **Tier-1 module list** (see decisions below), designed as an extensible registry so future
modules can be added without further hardcoding.

## c) User stories

1. As a PMO Admin, I can open Data Management from the PMO Admin settings page and see counts of
   total consents, pending export requests, pending deletion requests, and active data breaches.
2. As a PMO Admin, I can view and process a pending data export request, generating a JSON or CSV
   file covering the requesting user's Tier-1 data.
3. As a PMO Admin, I can view and process a pending data deletion request, anonymizing the user's
   identity on their `users` row and on their Tier-1 module rows (Risks, Issues, Changes,
   Assumptions, Constraints, Daily Logs, Lessons Log, governance memberships).
4. As a PMO Admin, I can log a new data breach incident (description, severity, affected users,
   detected date) and track it through to closed.
5. As a PMO Admin or Account Owner, I have access to Data Management; no other role does.
6. As any authenticated user, I can open a "Privacy" tab from my own Settings page.
7. As any authenticated user, I can view my consent history and record a new consent decision.
8. As any authenticated user, I can request an export of my own data and download the result once
   processed.
9. As any authenticated user, I can request deletion of my own account data, see the 30-day grace
   period before it's processed, and cancel the request within that window.
10. As a user with a completed deletion request, my identity is anonymized (not hard-deleted) on
    my `users` row and my Tier-1 module rows, so historical records I created remain intact but no
    longer show my real name/email.
11. As a developer maintaining this module in the future, I can add a new module to the Tier-1
    export/deletion list via a registry row, not a code change to `gdprService.js` itself.
12. As a Simulator PMO Admin / Account Owner, I have the equivalent admin dashboard at
    `simulator/admin/data-management`, scoped to the `sim` schema's own copies of these tables.
13. As a Simulator user, I have the equivalent self-service Privacy Center reachable from
    Simulator's own settings area.
14. As any user of either app, every action that creates/updates/deletes a record in this feature
    (recording consent, requesting export/deletion, PMO Admin processing a request, logging a
    breach) shows the shared success-confirmation modal, not a native `alert()`/`confirm()`.
15. As any user, all new/amended pages in this feature are theme-aware (dark/light) and mobile
    responsive.

## d) Implementation decisions

- **Build on the existing GDPR module** rather than designing something new — reuse
  `gdprService.js`'s functions, the five existing tables, and the two existing page shells as the
  starting point.
- **Scope covers both sides**: the admin dashboard AND the self-service Privacy Center in the same
  PRD/plan, since the admin queue has nothing to process without a way for users to submit
  requests.
- **Full UI modernization now**: success-confirmation modal (rule 16), icon-only row actions (rule
  61), dark mode (rule 28.1), audit tab (rule 63.1), routed non-modal pages (rule 65),
  unsaved-changes guard where applicable (rule 52) — not deferred to a later opportunistic pass.
- **Export/deletion Tier-1 module list**: Risks, Issues, Changes, Assumptions, Constraints, Daily
  Logs, Lessons Log, and Stakeholder/Governance body memberships — confirmed as the v1 scope.
  Designed as an extensible registry (a table listing which tables/columns to pull, analogous to
  `database_tables`) so future modules can be added without a `gdprService.js` code change.
- **Deletion matches export scope**: anonymization is expanded from "users row only" to also cover
  the same Tier-1 module list (e.g. `created_by`/`owner_user_id` columns reassigned to the
  anonymized identity), keeping export and deletion symmetric.
- **RLS/access fix (required, not optional)**: replace the `'System Admin'` role check with
  `'PMO Admin'` OR `accounts.owner_user_id`, and fix the `auth.uid()` comparison to resolve through
  the correct `auth_user_id` linkage (mirroring the established fix pattern from prior
  `auth_user_id` incidents in this codebase).
- **Access control**: PMO Admin + Account Owner may view/process the admin dashboard. Any
  authenticated user may use the self-service Privacy Center for their own data only.
- **Admin dashboard placement (Platform)**: PMO Admin's existing Data Management tab, navigating
  to a dedicated route (matching the pattern already established for the Users & Roles / Billing
  tabs on the same page) rather than embedding the dashboard inline.
- **Admin dashboard placement (Simulator)**: a new standalone page in the existing
  `simulator/admin/*` family (`simulator/admin/data-management`) — Simulator has no PMO-Admin-style
  tab bar to attach to (its copy of that file is dead/unmounted code), so a new page matches how
  Simulator's admin area is actually structured today. Requires a `menu_items` row + role grant
  (rule 13), since `simulator/admin/*` pages are DB-menu-driven, not hardcoded in the sidebar.
- **Self-service placement (Platform)**: a new "Privacy" tab on `Settings.jsx` (alongside Profile,
  Notifications, Security, Organisation), navigating to a dedicated `/platform/settings/privacy`
  route. Reached via the header/avatar dropdown's existing `settingsPath`, same as the rest of
  Settings — no `menu_items` sidebar entry needed (personal settings aren't PMO-configurable menu
  content).
- **Self-service placement (Simulator)**: a new standalone page (`simulator/settings/privacy`) —
  Simulator has no live general Settings page to attach a tab to either (its copy of `Settings.jsx`
  is imported but never routed, the same dead-code situation as `PMOAdmin.jsx`). Consistent with
  the admin-dashboard decision: don't revive an unrelated dead page as a side effect of this
  feature.
- **Simulator parity**: built for both apps, against the `sim` schema's own copies of the five
  GDPR tables (not shared with Platform's `public` schema tables, per the mandatory domain
  separation rule).
- **Deletion mechanism**: anonymization (soft-delete + PII scrub), not hard row deletion — matches
  the existing `anonymizeUserData` approach, extended to the Tier-1 list. 30-day grace period
  before processing (existing behaviour), with the ability for the requesting user to cancel
  within that window.
- **Export formats**: JSON and CSV (existing formats already implemented in
  `generateDataExportFile`).

## e) Testing decisions

- Unit tests for the export/deletion registry resolution (given a Tier-1 module list, correctly
  fetches and anonymizes/exports the right rows).
- Unit tests for the corrected RLS-equivalent access checks at the service layer (PMO Admin /
  Account Owner can process; a non-admin user cannot; a user can only export/delete their own
  data).
- Dev-server compile check on every new/changed file in both apps.
- Manual click-through: submit an export request as a regular user, process it as a PMO Admin,
  confirm the downloaded file's contents; submit a deletion request, confirm the 30-day grace
  period and cancel path, then process it and confirm the Tier-1 rows are anonymized, not deleted.
- "Done" means: both admin dashboards and both self-service Privacy Centers are live and reachable
  (no more placeholder), RLS actually grants access to the intended roles/owners (verified against
  a live Supabase check, not just code review), and the Tier-1 export/deletion registry is
  data-driven rather than hardcoded per-module logic.

## f) Out-of-scope

- Full exhaustive (all 30-50+ tables) export/deletion coverage — only the confirmed Tier-1 list
  ships now; the registry design allows extending it later without this being a retroactive gap.
- Data breach **notification** workflows (emailing affected users, regulator notification
  timers) — this PRD covers logging and tracking a breach record, not an automated notification
  pipeline.
- Any change to the Admin app's own (separate codebase) data/privacy tooling, if any exists there
  — out of scope; this PRD is Platform + Simulator only.
- Automatic scheduled processing of the 30-day deletion grace period (e.g. a cron job that
  auto-processes on day 30) — v1 requires a PMO Admin to manually process once the grace period
  has elapsed. An automated job can be a follow-up.

## g) Further notes

- The original ask was narrower ("implement the circled tabs" on PMO Admin) — Users & Roles and
  Billing were resolved as small wiring fixes ahead of this PRD, since real pages already existed.
  This PRD is scoped to the remaining, genuinely new-feature tab: Data Management.
- Security tab was removed from PMO Admin entirely (not built out) — system security
  administration belongs to the separate Admin app per the established three-app architecture, and
  building it in Platform would work against that separation.
