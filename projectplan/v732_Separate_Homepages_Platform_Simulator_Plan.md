# v732 — Separate Homepages: Platform & Simulator

## Objective

Give each system its own independent homepage and dev URL so that:

- `localhost:5173` → Project Nidus **Platform** (runs via `npm run dev:platform`)
- `localhost:5174` → Project Nidus **Simulator** (runs via `npm run dev:simulator`)

Each system's root `/` renders its own dedicated homepage, not the shared NidusHomepage gateway.

---

## Current State

| What | Current behaviour | Problem |
|------|------------------|---------|
| `apps/platform` (port 5173) | `/` renders `NidusHomepage` | Shows unified gateway, not platform-specific |
| `apps/simulator` (port 5174) | `/` renders `NidusHomepage` | Shows unified gateway, not simulator-specific |
| Platform App catch-all | Redirects unknowns → `/platform` | Should redirect to `/` |
| Simulator App catch-all | Redirects unknowns → `/simulator` | Should redirect to `/` |
| Legacy mode (`npm run dev:legacy`) | `/` renders `NidusHomepage` | Correct — keep unchanged |

The two separate dev apps already exist (`apps/platform`, `apps/simulator`) with correct ports (5173, 5174). The only thing missing is the `/` root route in each app pointing to the right homepage.

---

## What Already Works (No Changes Needed)

- `PlatformHeader` nav — already scoped to `/platform/*` routes, login → `/platform/login`, signup → `/platform/register`
- `SimulatorHeader` nav — already scoped to `/simulator/*` routes, login → `/simulator/login`, signup → `/simulator/register`
- Both headers' **Home** button navigates to `/` — this becomes correct once `/` is the right homepage per app
- `PlatformHomepage.jsx` and `SimulatorHomepage.jsx` — both exist and are complete
- Dev commands `npm run dev:platform` and `npm run dev:simulator` — already in `package.json`

---

## Todo List

### Phase 1 — Fix root `/` routes (core change)

- [x] **1.1** In `apps/platform/src/routes/publicRoutes.jsx`: change the `<Route path="/">` element from `<NidusHomepage />` to `<PlatformHomepage />`
- [x] **1.2** In `apps/simulator/src/routes/publicRoutes.jsx`: change the `<Route path="/">` element from `<NidusHomepage />` to `<SimulatorHomepage />`

### Phase 2 — Fix catch-all redirects

- [x] **2.1** In `apps/platform/src/App.jsx`: change the `path="*"` catch-all Navigate destination from `/platform` → `/`
- [x] **2.2** In `apps/simulator/src/App.jsx`: change the `path="*"` catch-all Navigate destination from `/simulator` → `/`

### Phase 3 — Cross-domain route cleanup (keep each app clean)

- [x] **3.1** In `apps/platform/src/routes/publicRoutes.jsx`: `/simulator` and `/simulator-home` now redirect to `/` (not served cross-domain)
- [x] **3.2** In `apps/simulator/src/routes/publicRoutes.jsx`: `/platform` and `/project-management` now redirect to `/` (not served cross-domain)

### Phase 4 — Preserve legacy mode (no change, verification only)

- [x] **4.1** Confirmed root `src/routes/publicRoutes.jsx` is untouched — `/` still renders `NidusHomepage`
- [ ] **4.2** Confirm `npm run dev:legacy` still boots and shows the unified NidusHomepage at `/` *(manual check)*

### Phase 5 — Manual verification

- [ ] **5.1** Run `npm run dev:platform` → open `localhost:5173` → confirm `PlatformHomepage` renders (blue/dark corporate theme, Platform nav)
- [ ] **5.2** Run `npm run dev:simulator` → open `localhost:5174` → confirm `SimulatorHomepage` renders (green/teal theme, Simulator nav)
- [ ] **5.3** From Platform homepage: click Login → confirm goes to `/platform/login`; click Sign Up → confirm goes to `/platform/register`
- [ ] **5.4** From Simulator homepage: click Log In → confirm goes to `/simulator/login`; click Sign Up → confirm goes to `/simulator/register`
- [ ] **5.5** On Platform app: navigate to an unknown route → confirm redirects to `/` (PlatformHomepage)
- [ ] **5.6** On Simulator app: navigate to an unknown route → confirm redirects to `/` (SimulatorHomepage)

---

## Files to Change

| File | Change |
|------|--------|
| `apps/platform/src/routes/publicRoutes.jsx` | Phase 1.1 + Phase 3.1 |
| `apps/simulator/src/routes/publicRoutes.jsx` | Phase 1.2 + Phase 3.2 |
| `apps/platform/src/App.jsx` | Phase 2.1 — catch-all redirect |
| `apps/simulator/src/App.jsx` | Phase 2.2 — catch-all redirect |

**Files NOT changed:**
- `src/routes/publicRoutes.jsx` (legacy monolith — preserved as-is)
- `src/pages/PlatformHomepage.jsx` (no content changes needed)
- `src/pages/SimulatorHomepage.jsx` (no content changes needed)
- `src/components/homepage/PlatformHeader.jsx` (nav links already correct)
- `src/components/homepage/SimulatorHeader.jsx` (nav links already correct)

---

## Risk Assessment

**Low risk.** All changes are route-level only — no component logic, no DB calls, no shared utilities. The `apps/platform` and `apps/simulator` each have their own independent copy of `publicRoutes.jsx` so changes are fully isolated. Legacy mode is entirely unaffected.

---

## Review Section

### Changes Made (v732)

**4 files modified, all route-level only:**

1. `apps/platform/src/routes/publicRoutes.jsx` — `/` now renders `PlatformHomepage` (wrapped in ThemeProvider). Legacy `/platform` and `/project-management` paths redirect to `/`.
2. `apps/simulator/src/routes/publicRoutes.jsx` — `/` now renders `SimulatorHomepage` (wrapped in ThemeProvider). Legacy `/simulator` and `/simulator-home` paths redirect to `/`.
3. `apps/platform/src/App.jsx` — catch-all redirects to `/` (was `/platform`).
4. `apps/simulator/src/App.jsx` — catch-all redirects to `/` (was `/simulator`).

**No component logic changed.** No DB calls. No shared utilities touched. Legacy monolith (`src/routes/publicRoutes.jsx`) is untouched.

### Pending Manual Verification
- Run `npm run dev:platform` and `npm run dev:simulator` to confirm each URL shows the correct homepage.

---

## Dev Quick Reference

```bash
# Start Platform only → localhost:5173
npm run dev:platform

# Start Simulator only → localhost:5174
npm run dev:simulator

# Start both at once
npm run dev

# Legacy monolith (unified NidusHomepage at /)
npm run dev:legacy
```
