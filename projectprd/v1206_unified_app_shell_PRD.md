# v1206 — Unified persistent app shell (Platform + Simulator)

## a) Problem statement

Clicking between pages that use different layouts makes the whole screen refresh and the sidebar reload, often ending in a collapsed or empty menu. The most visible case: on the PM Lessons Log (`/pm/controls/lessons-log`), "Add Lesson" navigates to `/platform/projects/.../lessons/create`. The PM shell (PM sidebar, project selector) is torn down and the Platform shell (My Work / Delivery sidebar) is mounted from scratch, and its menu loads after mount.

Verified root causes:

- `apps/platform/src/components/Layout.jsx` returns `<PMLayout>` for PM paths (lines 47–49) and its own header/sidebar/main tree otherwise. Crossing that boundary changes the root element type, so React unmounts and remounts the entire shell.
- `PMLayout` (`apps/platform/src/components/pm/PMLayout.jsx`) and `Layout.jsx` each build their own shell with different providers. `PMLayout` adds `RoleScopeGate`, `CurrentProjectProvider` and a PM `MenuProvider` scope. `Layout.jsx` uses `MenuProvider layoutScope={null}`.
- Each route in `apps/platform/src/routes/platformRoutes.jsx` wraps its page in its own `<Layout>` or `<PMLayout>` element, so no single shell persists across routes.
- `ProtectedRoute` (`apps/platform/src/components/ProtectedRoute.jsx`) already documents that every route element remounts the subtree, and only hides the auth spinner with a 60s cache.
- `PMLayout` omits the Help, Feedback and AI chat floating widgets that Platform pages show.

Probe result (temporary test, removed): two routes that share the same wrapper component type kept the shell mounted across navigation. The remount happens only when the shell component type changes. Same-layout navigation is not the problem; cross-shell navigation is.

Why it matters: this is the perceived quality of the whole product. Users read the flash as a broken app, and the SaaS goal (rule 62) requires that navigation feel continuous.

## b) Solution

Introduce one `AppShell` component that every route uses. It owns the header, sidebar, main area, floating widgets and always-mounted providers. Scope (`pm`, `platform`, `simulator`) becomes a prop that selects the header slot and the menu scope, not the component type.

- Because every route renders the same `AppShell` type, React keeps it mounted across navigation, including PM↔Platform moves. No route file needs restructuring.
- The sidebar frame and header never unmount. Only the menu list and header slot update in place.
- `RoleScopeGate` stays per route, so non-PM users are still redirected from PM pages, but the shell stays visible while that check runs.

## c) User stories

1. As a PM, when I click "Add Lesson" from the Lessons Log, the sidebar frame does not disappear or flash.
2. As a PM, moving between PM pages and Platform pages keeps the header and sidebar frame visible at all times.
3. As a user, while a different menu loads after a scope change, the previous menu stays visible until the new one arrives, with no blank or collapsed flash.
4. As a user, the sidebar collapse/expand choice is preserved across every navigation.
5. As a PM user, I see the Help, Feedback and AI chat buttons on PM pages, the same as on Platform pages.
6. As a non-PM user who opens a PM page, I am still redirected to the Platform dashboard, and the shell stays visible during the check.
7. As a user, the project context (`CurrentProjectProvider`) remains available when I move between scopes.
8. As a Simulator user, the same persistent behaviour applies to Simulator pages and scopes.
9. As a developer, a new route only needs to pick a scope; it does not need to choose or import a layout component.
10. Existing pages keep working: no route loses its page, guard, or query parameters.

## d) Implementation decisions (settled)

- Scope: Platform and Simulator are both changed in this plan. Admin is out of scope (separate codebase).
- Mount strategy: one shared `AppShell` component type, scope passed as a prop. Nested layout routes were rejected because they require rewriting every route file.
- Menu swap: keep the previous menu visible while the new scope's menu loads. No skeleton; no session caching of menus in this plan.
- Widgets: Help, Feedback and AI chat are shown on every page, including PM pages.
- Providers: `CurrentProjectProvider` and the branding and menu providers mount for every shell, not only PM. `RoleScopeGate` is applied per route, not in the shell.
- Shared shell markup lives in `packages/ui` (building on `RoleScopedShell.jsx`), so Platform and Simulator consume one implementation through `@nidus/ui`.
- Rollout: vertical slices, Platform first, then Simulator. Each slice is independently revertible.
- No commit or push until the user asks (standing instruction).

## e) Testing decisions

- Interface under test: the `AppShell` component and the routing layer, not internal state.
- Required tests, written first (red before green):
  - Navigating between a PM route and a Platform route does not remount the shell frame (header and sidebar element identity preserved).
  - While a scope menu is loading, the previous menu items remain in the DOM.
  - Help, Feedback and AI chat render on a PM route.
  - A non-PM user on a PM route is redirected, and the shell is still rendered during the check.
  - Collapsed state persists across a scope switch.
- Regression: existing `QualityReviews`, `QualityReviewForm`, `QMSView` and `PMControlsQualityRegister` suites, plus the `ProtectedRoute` and `RoleScopedShell` tests, must stay green.
- Manual acceptance on the dev server: Lessons Log → Add Lesson, PM ↔ Platform navigation, collapse toggle across navigation, and light/dark theme on both apps.
- Done means: all automated tests green in both apps, and the manual checks above pass on Platform before Simulator slice starts.

## f) Out of scope

- PMO shell (`PMOLayout`, `PmoFederatedOutlet`) and its federated outlets. Recorded as a follow-up; they keep their current layouts.
- Caching the menu per scope in session storage (option 3 from the interview).
- Changing the Admin app (`E:\project-nidus-admin`), which is a separate codebase (rule 34.6 follow-up).
- Changing which page a feature lives on (for example moving Add Lesson under `/pm/`). This plan fixes the shell, not route placement.
- Rewriting route definitions into nested layout routes.

## g) Further notes

- The `Layout.jsx` PM delegation and the `PMLayout` wrapper are the two places to unify; the `RoleScopedShell` in `packages/ui` is the natural home of the shared markup.
- Record the final decision in `projectplan/v1206_unified_app_shell_plan.md` (review section) and update `Documentation/Role_Scoped_Routing_Guide.md` if the slot mapping changes.
- The PMO and Simulator-PMO follow-ups should reference this PRD.
