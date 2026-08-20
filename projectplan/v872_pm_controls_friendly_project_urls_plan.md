# v872 — Friendly Project URLs in PM Controls — Plan (Platform + Simulator)

**Repo:** `E:\project-nidus`
**PRD:** `projectprd/v872_pm_controls_friendly_project_urls_PRD.md`
**Admin companion plan:** `E:\project-nidus-admin\projectplans\v205_display_id_navigation_adoption_plan.md`
**Status:** Planned.

---

## Goal

`/pm/*` pages show `?projectId=<project_code>` in the address bar instead of the raw UUID, by fixing the single
shared read hook rather than sweeping every link-building call site.

---

## Todos

### Core hook fix (3 duplicate files, kept in sync as today)
- [x] `packages/shared/src/hooks/usePlatformProjectId.js` — add address-bar normalization effect
- [x] `apps/platform/src/hooks/usePlatformProjectId.js` — same change (kept identical to shared copy)
- [x] `apps/simulator/src/hooks/usePlatformProjectId.js` — same change (kept identical to shared copy)

### Link-building hubs (no UUID flash)
- [x] `apps/platform/src/components/pm/PMProjectSelector.jsx` — `dashboardHref` uses `project_code`
- [x] `apps/simulator/src/components/pm/PMProjectSelector.jsx` — same
- [x] `apps/platform/src/pages/pm/PMDashboard.jsx` — `withProject` uses `project_code`
- [x] `apps/simulator/src/pages/pm/PMDashboard.jsx` — same

### Tests
- [x] New `usePlatformProjectId.test.jsx` covering: UUID→code rewrite, already-code no-op,
      unresolvable-UUID no-op, entityId/entityType=project left untouched (4 tests, all passing)
- [x] Ran full `packages/shared` suite (47 files / 403 tests) — no regressions

### Manual smoke
- [ ] Open `/pm/controls/issue-register?projectId=<uuid>` bookmark → address bar corrects to project_code
- [ ] Switch project in `PMProjectSelector` → land on a controls page with code already in URL (no flash)
- [ ] `/pm/dashboard` tiles/links carry the code
- [ ] Simulator parity: repeat the above on Simulator's `/pm/*` equivalents

### CLAUDE.md
- [x] Extend rule 16.1 to name `usePlatformProjectId()` as the mandatory access point for new `/pm/*`-style pages

---

## Design notes

**Normalization effect (added to each `usePlatformProjectId.js` copy):**

```js
// Only the `projectId` query param is normalized — the entityId/entityType=project legacy
// fallback already has its own redirect handling on specific pages (v864 Templates).
useEffect(() => {
  const qp = searchParams.get('projectId');
  if (!qp || !looksLikeProjectUuid(qp)) return;
  let cancelled = false;
  resolveProjectRouteKeyFromId(qp).then((code) => {
    if (cancelled || !code || code === qp) return;
    const next = new URLSearchParams(searchParams);
    next.set('projectId', code);
    setSearchParams(next, { replace: true });
  });
  return () => { cancelled = true; };
}, [searchParams, setSearchParams]);
```

Idempotent: after the replace, `searchParams.get('projectId')` is the code, `looksLikeProjectUuid` is false, effect
no-ops on the next run. Requires importing `resolveProjectRouteKeyFromId` from `@nidus/shared/utils/projectRouteParam`
(already exists, used by the Templates friendly-URL work) and switching `useSearchParams()` to also capture the
setter.

**Hub link builders:** `useCurrentProject()`'s `currentProject` already carries `.projectCode` (set in
`CurrentProjectContext.jsx` from `projects.project_code`). Prefer `currentProject?.projectCode || currentProjectId`
wherever these two files currently interpolate raw `currentProjectId` into a `?projectId=` link.

---

## Review

### Shipped
- `usePlatformProjectId()` (3 duplicate copies) now rewrites a raw-UUID `?projectId=` query param to
  `project_code` via `setSearchParams(..., { replace: true })` the moment it's resolvable — idempotent, only
  touches the `projectId` param (not the legacy `entityId`/`entityType` fallback).
- `PMProjectSelector` and `PMDashboard` (both apps) now build their `?projectId=` links from
  `currentProject?.projectCode || currentProjectId`, so the very first link after a project switch or from the
  `/pm` hub already carries the friendly code.
- Manual smoke not run this session (no dev server available) — flagged for the user to verify before/at next
  deploy.

### Tests
- `usePlatformProjectId.test.jsx` — 4 new tests, all passing.
- Full `packages/shared` vitest suite — 47 files / 403 tests passing, no regressions.

### Not done (by design, per PRD "Out-of-scope")
- The ~238 other Platform/Simulator files that build their own `?projectId=${...}` links were left unchanged —
  they still send valid UUIDs, which the hook now normalizes on arrival. Clean up opportunistically per rule 16/52.
- The 3 duplicate `usePlatformProjectId.js` copies were not consolidated into a single shared import.
