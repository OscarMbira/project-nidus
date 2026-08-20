# v819 — Split Platform Dashboard: PMO Executive View vs. PM Project View

## Goal
User reported `/platform/dashboard` showing PMO-level content (org-wide Executive Summary:
Portfolios/Programmes/Projects/Tasks/Teams counts across the whole organisation) to a user
whose role badge read "Project Manager" — a project-level role, not an org admin. PMO and PM
users must each only see what belongs to their role.

## Root cause
`apps/{platform,simulator}/src/pages/platform-app/Dashboard.jsx` renders the org-wide Executive
Summary unconditionally for every authenticated user with an organisation — it only ever used
`isOrgAdmin` (from the `is_user_pmo_admin` RPC) to toggle a small "PMO Admin" **badge**, never to
gate the dashboard's actual **content**. A comment in `platformRoutes.jsx` confirms the history:
`/pmo/dashboard` was redirected here and folded into "the unified platform dashboard" — but
"unified" ended up meaning "shown to everyone," not "shown to whoever it's for."

Meanwhile `/pm/dashboard` (`pages/pm/PMDashboard.jsx`, built in [[v817]]) already exists as the
correct project-scoped home for PMs (current project's work packages, risks, issues, quality
activities, checkpoint reports, lessons, upcoming deadlines) — it was just never routed to.

## Fix
`apps/platform/src/pages/platform-app/Dashboard.jsx` and the byte-identical
`apps/simulator/src/pages/platform-app/Dashboard.jsx` (parity, rule 34.1):
- Added `hasSystemRole` state, resolved via the existing `getUserSystemRoles(authUserId)`
  (`roleService.js`) run in parallel with the existing org/admin checks — `true` when the user
  has any row in `user_roles` (Account Owner, PMO Admin, Org Admin, System Admin, ...), `false`
  when their only roles are project-level (Project Manager, Team Member, Sponsor, ...).
- Once `accountStatus === 'ready'` and `hasSystemRole === false`, the component now renders
  `<Navigate to="/pm/dashboard" replace />` instead of the Executive Summary/AI Insights/PMO
  Alerts stack. PMO/org-admin users see no change at all.

Used the broader `getUserSystemRoles` (any system role) rather than the narrower
`is_user_pmo_admin` RPC (only `pmo_admin`/`org_admin`/`system_admin`/`super_admin`) for this
audience check, so an Account Owner — who doesn't match that RPC's role-name whitelist but is
still clearly an org-level user, not a plain PM — still lands on the Executive Dashboard.
`isOrgAdmin`/`is_user_pmo_admin` is left untouched for its existing purpose (the "PMO Admin"
badge and the Organization Settings link).

## Explicitly out of scope
- Any change to `is_user_pmo_admin`'s role whitelist itself (that's an authorization function
  used by RLS policies and RPCs elsewhere — out of scope for a dashboard-routing fix).
- Team Members / Sponsors with only project roles also redirect to `/pm/dashboard` under this
  change (same as a Project Manager) since there's no separate "Team Member dashboard" today —
  a future, more granular per-role landing page is a follow-up, not bundled here.

## Todo
- [x] Platform: `Dashboard.jsx` — add `hasSystemRole` check + redirect
- [x] Simulator: mirror the same change (parity) — confirmed byte-identical via `diff -B -w`
- [x] Syntax-check both files (esbuild compile, no errors)
- [ ] Manual verification: log in as a plain Project Manager (no system role) and confirm
      `/platform/dashboard` redirects to `/pm/dashboard`; log in as a PMO Admin/Account Owner
      and confirm the Executive Summary still renders unchanged.

## Review
Reused the existing `getUserSystemRoles` call (already used by `SystemHeader.jsx` for the role
badge) rather than introducing a new RPC or role-check helper — it already draws exactly the
system-role/project-role line this fix needed. No changes to routing config (`platformRoutes.jsx`
/ `simulatorRoutes.jsx`) were necessary — the redirect is a simple `<Navigate>` inside the
existing component, matching the pattern `ProtectedRoute.jsx` already uses elsewhere in this
codebase.

**Left for the user:** the manual verification step above — this session could not drive a
browser to confirm the redirect visually.
