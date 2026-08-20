# Role-Scoped Routing Guide (v839)

## The bug this prevents

A signed-in user's sidebar/menu must always reflect their **actual role**, never the URL they
happened to navigate to. Before v839, `PMOLayout`/`PMLayout` (and their Simulator equivalents)
hardcoded `<MenuProvider layoutScope="pmo">` / `"pm"` — so any user who followed a link into a
`/pmo/...` URL had their sidebar instantly replaced with the PMO menu, regardless of their real
role. Worse, pages with their own narrower "Only PMO Admin can access this" check still let the
wrong sidebar mount *first*, before that check ever ran.

## The fix: guard the Layout shell, not the route

Every role-scoped Layout (`PMOLayout`, `PMLayout`, and Simulator equivalents in both Platform and
Simulator apps) now wraps itself in `RoleScopeGate` (from `@nidus/ui`) **before** rendering
`MenuProvider`/`Sidebar`:

```jsx
export default function PMOLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  return (
    <RoleScopeGate requiredScope="pmo" blockedRedirectTo="/platform/dashboard">
      <BrandingProvider>
      <MenuProvider layoutScope="pmo">
        <RoleScopedShell
          header={<PlatformAppHeader onSidebarToggle={...} />}
          sidebar={<Sidebar isOpen={sidebarOpen} onClose={...} />}
          beforeChildren={<SubscriptionExpiryBanner />}
          quickCaptureFab={<QuickCaptureFab />}
        >
          {children}
        </RoleScopedShell>
      </MenuProvider>
      </BrandingProvider>
    </RoleScopeGate>
  )
}
```

**Important:** `blockedRedirectTo` must be a home in a *different* scope the user can open.
`PMLayout` uses `/platform/dashboard` (not `/pm/dashboard`) — redirecting to the same gated
route causes an infinite `<Navigate>` loop and a blank page.

`RoleScopeGate` calls `useRoleScopeGuard(requiredScope)` (`@nidus/shared/hooks`), which resolves
the signed-in user's actual role scope(s) via `resolveUserRoleScopes()`
(`@nidus/shared/utils/menuLayoutUtils`) — the **same** `PMO_LAYOUT_ROLES`/`PM_LAYOUT_ROLES`/
`TM_LAYOUT_ROLES` classification the menu itself uses. Three outcomes:

- **`loading`** — brief neutral spinner; `MenuProvider`/`Sidebar` haven't mounted yet, so no
  chrome can flash.
- **`blocked`** — the user's role doesn't include this scope → `<Navigate to={blockedRedirectTo}>`
  fires before `MenuProvider` ever mounts. No fetch, no flash.
- **`allowed`** — the user's role includes this scope (or they have no scope-bearing role at all
  — see "fail open" note below) → renders normally.

`RoleScopedShell` (also `@nidus/ui`) is purely presentational — the shared header/sidebar/main
markup every Layout family uses, parametrized by slots (`header`, `sidebar`, `aboveContent`,
`beforeChildren`, `quickCaptureFab`, `providers`, `contentClassName`). It has no guard logic of
its own; it assumes the caller already gated access.

## Adding a page that more than one role needs

**Never** let one role reach a page through another role's URL/Layout. If a page is genuinely
needed by more than one role (the confirmed case: Organisational Templates, needed by both PMO
Admin and PM — see [[v824]]), mount the **same page component** at an additional route under the
other role's own prefix, wrapped in that role's own Layout:

- PMO-admin view: `/app/pmo/organisational-templates` (+ `/:nodeId` detail) (`PMOLayout`, unfiltered)
- PM view: `/platform/templates/organisational` and `/platform/templates/project` (+ `/:nodeId` detail)
  (`PMLayout`) — Simulator: `/simulator/pm/templates/organisational|project` alongside
  `/simulator/pmo/organisational-templates`. View/Edit from a PM list must use these PM paths,
  never `/app/pmo/...` (role scope guard redirects PMs to `/pm/dashboard`).
- **Manage form fields →** from a Project Template detail must use
  `resolveFormTemplateManagePath()` → `/platform/projects/:id/field-templates?templateCode=…`
  (Simulator: `/simulator/pm/projects/:id/field-templates?…`), not `/app/pmo/forms/…/edit`.
  That page is **form parameterization only** (no Record-fields / LDE tab).

Any link/redirect that builds a URL into this page must point at the **viewer's own** scoped
route — never construct a cross-scope URL and rely on the guard to "let them through" (it won't).

## Fine-grained checks narrower than a whole scope

Some pages need more than "any PMO-scope role" — e.g. Form Template Builder, Role Assignment,
Assign Roles to Projects, Send Role Invites, Form Template Admin, and Business Case View's
approve action are gated to the exact roles `pmo_admin` / `org_admin` / `system_admin` /
`super_admin` (`PMO_SUITE_ADMIN_ROLE_NAMES` in `services/pmoSuiteRoleAccess.js`), not the broader
`PMO_LAYOUT_ROLES` set (which also includes `account_owner`). These pages' existing checks
(`getSessionPMOAdminStatus()`, `isPmoAdmin()`, `isPMOAdmin()`) now all resolve through one shared
helper, `userHasAnyRole(authUser, roleNames)` (`@nidus/shared/utils/menuLayoutUtils`), instead of
each re-implementing the same `users → user_roles → roles` query. For a **new** page needing this
pattern, prefer the `RequireRole` component (`@nidus/ui`) over hand-rolling another inline check:

```jsx
<RequireRole roles={['pmo_admin', 'org_admin', 'system_admin', 'super_admin']} fallback={<AccessDenied />}>
  <PageContent />
</RequireRole>
```

`RoleScopeGate` and `RequireRole` solve different problems — use both where both apply. The gate
decides which *sidebar* renders (coarse, per-Layout); `RequireRole`/`userHasAnyRole` decides
whether a specific *page's content* is allowed (fine-grained, per-page), independent of scope.

## "Fail open" on zero roles — this is a UX fix, not the security boundary

`useRoleScopeGuard` allows access when a user resolves to **no** scope-bearing role at all (e.g. a
transient gap during onboarding/role-provisioning), rather than blocking them. This guard exists
to stop the *wrong sidebar* from rendering — it is not a substitute for RLS or for each page's own
data-level authorization. Never treat passing this guard as proof a user may see or modify a
given record; the database's row-level security remains the real access boundary (see CLAUDE.md
rule 42 — never bypass RLS as a workaround).

## Checklist for a new role-scoped Layout or page

1. Does this page need its own Layout family? If so, wrap it the same way as the existing 8:
   `RoleScopeGate` outermost, then `BrandingProvider`/`MenuProvider` (unchanged per-app import),
   then `RoleScopedShell` for the markup.
2. Does more than one role need this exact page? Mount it once per role's own prefix — never
   share a URL across scopes.
3. Does it need a narrower check than "any role in this scope"? Use `RequireRole`/
   `userHasAnyRole` with an explicit role-name list.
4. Apply to both Platform and Simulator (CLAUDE.md rule 34.1/34.2).
