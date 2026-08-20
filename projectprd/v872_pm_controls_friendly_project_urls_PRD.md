# v872 — Friendly Project URLs in PM Controls (+ Admin Display-ID Navigation Adoption) — PRD

**Repos:** `E:\project-nidus` (Platform + Simulator) and `E:\project-nidus-admin` (Admin)
**Plans:** `projectplan/v872_pm_controls_friendly_project_urls_plan.md` (this repo) · `E:\project-nidus-admin\projectplans\v205_display_id_navigation_adoption_plan.md` (Admin repo)

---

## a) Problem statement

Opening Issue Register (and every other page under `/pm/controls/*`, `/pm/dashboard`, and the many `/pm/*`-style
list/detail pages in Platform and Simulator) shows a raw UUID in the address bar:

```
localhost:5173/pm/controls/issue-register?projectId=42a1e47a-e1bf-4ea3-a78c-ed278270458d
```

This is not user-friendly, not shareable/bookmarkable in a recognisable way, and is inconsistent with the rest of
the app: `/platform/projects/<project_code>/...` and the Templates area (v337, v864) already show the human-readable
`project_code` instead of the UUID.

Root cause: `/pm/*` routes have no project path segment (they're a flat query-string area), so they rely on
`?projectId=<uuid>` — populated from `CurrentProjectContext`'s `currentProjectId`, which is always the raw UUID.
Roughly 242 files across Platform + Simulator build `?projectId=${currentProjectId}`-style links, but there is a
single, universal **read** point: the `usePlatformProjectId()` hook (duplicated identically in `packages/shared`,
`apps/platform`, `apps/simulator`), which every one of those destination pages calls to resolve the incoming id.

Separately, the Admin app already has the equivalent mechanism for record deep-links (`navId()` / `useDisplayIdMap`
/ `useDisplayId`, governed by Admin CLAUDE.md rule 13) but a live audit of `admin.id_generation_rules` shows it's
only adopted on a handful of pages (Users, Orgs, Support Tickets, Admin Users) — dozens of others still pass the raw
`row.id`.

## b) Solution

**Platform + Simulator:** fix the single shared read point instead of the 242 write points. Teach
`usePlatformProjectId()` to detect a raw-UUID `?projectId=` query param, resolve it to `project_code` (reusing the
existing `resolveProjectRouteKeyFromId` from `projectRouteParam.js`), and rewrite the address bar via
`setSearchParams(..., { replace: true })`. Every `/pm/*` page that reads its project id through this hook (already
the established, ~250-caller convention) gets the friendly URL automatically, with no per-page changes. On top of
that, fix the two highest-traffic link-*building* hubs — `PMProjectSelector` (project switcher) and `PMDashboard`
(the `/pm` hub that links out to every controls page) — to build the link with `project_code` from the start, so
there's no visible UUID flash before the hook's rewrite lands.

**Admin:** no new mechanism is needed — extend adoption of the existing `navId()` / `useDisplayIdMap` pattern to the
pages found still using raw UUIDs, for every target table that already has an active `admin.id_generation_rules`
row. Tables that do **not** yet have a rule (or a `display_id`-style column) are catalogued as a separate follow-up
— that's a schema change on billing-adjacent tables (subscriptions, payment gateways, plan catalog) and is
deliberately out of scope for this pass (see Out-of-scope).

## c) User stories

1. As a PM opening Issue Register (or any `/pm/controls/*`, `/pm/dashboard`, `/pm/*` planning/report page) via the
   sidebar or project selector, the address bar shows `?projectId=<project_code>`, not the UUID.
2. As a PM who bookmarks or shares a `/pm/*` URL that still has the old raw-UUID `?projectId=`, opening that link
   continues to work (backward-compatible resolution) and the address bar self-corrects to the friendly form on
   load.
3. As a PM switching projects via `PMProjectSelector`, the very first link built after switching already carries
   the friendly code — no visible UUID flash.
4. As a PM on the `/pm` dashboard clicking into any controls page, the link Ianded on already carries the friendly
   code.
5. As a developer building a brand-new `/pm/*`-style page, consuming `usePlatformProjectId()` is sufficient to get
   correct, friendly-URL behaviour for free — no extra work required.
6. As an Admin user browsing Affiliates, Batch Jobs, COB Runs, Email Campaigns, Alert Rules, or cross-links from
   Errors/Support/Invoices to those tables, the detail URL shows the table's display ID, not the UUID.
7. As an Admin developer, tables without an ID Generation rule yet are not silently left half-migrated — they're
   explicitly tracked as a follow-up, not touched by this pass.

## d) Implementation decisions (already settled)

- **Scope for Platform/Simulator:** core hook fix (3 duplicate files: `packages/shared`, `apps/platform`,
  `apps/simulator`) + the 2 link-building hubs (`PMProjectSelector`, `PMDashboard`) × 2 apps = 4 files. The
  remaining ~238 files that build their own `?projectId=${...}` links are **not** swept in this pass — they keep
  working unchanged (still valid UUIDs into the hook, which normalizes on read) and get cleaned up opportunistically
  whenever each page is next touched, matching this codebase's existing adoption pattern (rule 16, rule 52).
- **Only the `projectId` query param is normalized** — the `entityId`/`entityType=project` legacy fallback in the
  hook is left untouched (it's a separate, already-handled path per the v864 Templates redirect work); normalizing
  it here risks double-handling on pages that already redirect it themselves.
- **Normalization mechanism:** `setSearchParams(next, { replace: true })` inside a `useEffect` — no new history
  entry, idempotent (once the param is the code, `looksLikeProjectUuid` is false and the effect no-ops).
- **Admin scope:** fix now, but only for tables with an existing, active `admin.id_generation_rules` row (verified
  via a live query, not guessed from static SQL search). Confirmed fixable now: `admin.affiliates`,
  `admin.batch_jobs`, `admin.cob_runs`, `admin.email_campaigns`, `admin.alert_rules`, `admin.error_aggregations`,
  `admin.support_tickets`, `admin.refunds`.
- **Admin deferred (explicitly out of scope for this pass):** `subscription_plans`/`plan_catalog`,
  `payment_gateways`, `email_templates`, `notification_templates`, `subscriptions`
  (`platform_subscriptions`/`team_subscriptions`) — none have an active `id_generation_rules` row today. Wiring
  these requires (1) confirming/adding a `display_id`-style column, (2) a new `admin.id_generation_rules` seed per
  rule 14, (3) an insert/update trigger — a schema change on billing-adjacent tables that needs its own explicit
  go-ahead, not a silent side-effect of a URL-friendliness pass.
- **CLAUDE.md rule update:** extend monorepo rule 16.1 to explicitly name `usePlatformProjectId()` as the mandatory
  access point for any new `/pm/*`-style page's project id (not just literal record deep-links), so future pages
  get this behaviour for free by construction rather than by remembering to normalize manually. Admin rule 13 gets a
  one-line reinforcement: adoption applies to cross-module links (e.g. Support → Errors) too, not just a page's own
  row links.

## e) Testing decisions

- Unit tests for the hook's normalization effect (`usePlatformProjectId.test.js` — new, colocated with existing
  `projectRouteParam.test.js` / `entityUrlUtils.test.js` patterns): raw UUID with a resolvable `project_code` →
  `setSearchParams` called once with the code; already-a-code param → no-op; unresolvable UUID → no-op (stays as
  is, existing DB-driven resolution still works for the actual `projectId` value returned).
- Manual smoke: open Issue Register via `?projectId=<uuid>` bookmark → address bar corrects to `?projectId=<code>`;
  switch project via `PMProjectSelector` → land on a controls page with the code already in the URL, no flash;
  `/pm` dashboard tiles carry the code.
- Admin: for each fixed page, manual check that the destination URL shows the display ID and that the destination
  page still resolves correctly (existing `useDisplayId`/backward-compatible UUID resolution already handles both).

## f) Out-of-scope

- Sweeping the remaining ~238 Platform/Simulator files that build their own `?projectId=${...}` links.
- Admin tables without an active ID Generation rule (see Implementation decisions) — tracked as a follow-up, not
  built here.
- Any DB schema changes (new `display_id` columns, new triggers) in either repo.
- Consolidating the 3 duplicate copies of `usePlatformProjectId.js` into a single shared import (pre-existing
  duplication, unrelated to this fix — noted as a separate opportunistic cleanup, not attempted here to keep this
  change's blast radius minimal).

## g) Further notes

- Live-queried `admin.id_generation_rules` (1000 rows) on 2026-08-14 to get ground truth on rule coverage rather
  than guessing from static SQL grep — several tables assumed to have rules did not.
- This PRD/plan pair is cross-repo per the "Repo-scoped SQL & plans" rule: Admin's plan lives in
  `E:\project-nidus-admin\projectplans\v205_display_id_navigation_adoption_plan.md`, linked here rather than
  merged into this file.
