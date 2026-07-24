# v749 — Sidebar menu label rename (no-SQL), Platform + Simulator

**Status:** COMPLETE
**Companion plan (Admin app):** `E:\project-nidus-admin\projectplans\v16.0_sidebar_navigation_management_plan.md` — same underlying ask ("rename sidebar labels without SQL, flag per-role visibility"), applied to the Admin console's own `admin.nav_nodes`. This file covers the equivalent for Platform and Simulator, which run on a completely separate schema/codebase (no shared code with Admin — see `CLAUDE.md` rule 34.2/46).

## Problem

Investigated the existing sidebar menu system in this monorepo before planning anything new — **per-role visibility is already solved here**, more thoroughly than in the Admin app:

- `public.menu_items` + `public.role_menu_items` (`SQL/v05_configuration_menu_tables.sql`) is the single shared menu registry for **both** Platform and Simulator (Simulator menu rows just use `sim_*`/`pmo_*`-prefixed `menu_code`s in the same table — confirmed both apps' `menuManagementService.js` import `platformDb`, not a separate `sim` client, for this table).
- `RoleMenuCustomiser.jsx` (byte-identical in `apps/platform/src/components/admin/` and `apps/simulator/src/components/admin/`) already gives System Admins (`variant="admin"`, page `AdminRoleMenuManagement.jsx`) and PMO Admins (`variant="pmo"`, page `PMORoleMenuManagement.jsx`, scoped to roles at/below their own `role_level`) a live UI to toggle `can_view`/`can_use` per role, per menu item — no SQL required. This already covers this plan's "flag visibility per role" ask.

**What's actually missing, matching the Admin app's gap exactly:** renaming a `menu_items.menu_label` still requires a hand-written SQL migration. This monorepo has done that dozens of times already — `v709`–`v729` alone include multiple dedicated rename/dedupe files (`v715_rename_structured_track_prince2.sql`, `v716_rename_pmbok_track_label.sql`, `v717_rename_agile_track_adaptive.sql`, `v723_rename_workflow_approval_menu_labels.sql`, plus several `dedupe_*_menus.sql` files). `RoleMenuCustomiser.jsx` renders `node.menu_label` as **read-only text** — there is no rename affordance anywhere in the UI, and no RLS policy even permits a client to `UPDATE menu_items` today (`SQL/v129_fix_menu_system_rls.sql` grants `menu_items` **SELECT only** to `authenticated`/`anon`; only `service_role` has `ALL`).

## Scope

Add label-rename capability to the existing `RoleMenuCustomiser` admin UI. Do **not** rebuild the visibility system (it already works) and do **not** touch Simulator separately — it's the same table, same component, same fix, applied twice (once per app copy) to preserve the existing byte-identical-duplication convention rather than introducing a new shared-package refactor rule 32/6 didn't ask for.

## Design

### Why an RPC, not a blanket RLS UPDATE policy

`role_menu_items` (org/role-scoped access flags) already got an `UPDATE` RLS policy in `v484_role_menu_items_rls.sql`, gated by `public.can_manage_role_menu_target(role_id)`. `menu_items.menu_label` is different in kind: it's a **single global string every organisation and every role sees** — there's no per-row "target" to scope a policy against the way `role_menu_items` scopes to a target role. A blanket `UPDATE` grant on `menu_items` risks a buggy/compromised client mutating `route_path`, `menu_code`, or `parent_menu_id` (structural columns), not just the label. Use a narrow `SECURITY DEFINER` RPC instead — same reasoning as the Admin app's plan (v16.0) preferring targeted RPCs over its all-fields `upsert_nav_node`.

### Who can rename

**System Admin / Super Admin only — not PMO Admin**, even though PMO Admins can already toggle visibility. Reasoning: a PMO Admin's visibility edits are bounded to roles at/below their own `role_level` (`can_manage_role_menu_target`) — a contained blast radius. A label rename has no such natural boundary (it's not "per role"), so one org's PMO Admin renaming a shared label would change what every other organisation sees. This is the plan's one real judgement call — flagged here in case that's wrong; it's a one-line change (reuse `is_role_menu_management_user()` instead of a new narrower check) if PMO Admin should be allowed too.

### Backend — `SQL/v749_menu_item_label_rename.sql`

```sql
CREATE OR REPLACE FUNCTION public.is_menu_label_management_user()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN users u ON ur.user_id = u.id
    JOIN roles r ON ur.role_id = r.id
    WHERE u.auth_user_id = auth.uid()
      AND ur.is_active = TRUE AND COALESCE(ur.is_deleted, FALSE) = FALSE
      AND r.role_name IN ('system_admin', 'System Admin', 'super_admin', 'Super Admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.rename_menu_item(p_menu_item_id UUID, p_new_label TEXT)
RETURNS menu_items LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row menu_items;
BEGIN
  IF NOT public.is_menu_label_management_user() THEN
    RAISE EXCEPTION 'Permission denied: System Admin required';
  END IF;
  IF p_new_label IS NULL OR trim(p_new_label) = '' THEN
    RAISE EXCEPTION 'Label is required';
  END IF;

  UPDATE menu_items
  SET menu_label = trim(p_new_label), updated_at = NOW()
  WHERE id = p_menu_item_id
    AND is_system_menu = FALSE
    AND COALESCE(is_deleted, FALSE) = FALSE
  RETURNING * INTO v_row;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'Menu item not found or is system-protected';
  END IF;
  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rename_menu_item(UUID, TEXT) TO authenticated;
```

(System-protected menus stay locked, matching the existing `is_system_menu` guard `RoleMenuCustomiser.jsx` already applies to the view/use checkboxes.)

### Frontend — same edit applied to both apps' identical copies

- `apps/platform/src/services/menuManagementService.js` **and** `apps/simulator/src/services/menuManagementService.js`: add `export async function renameMenuItem(menuItemId, newLabel) { const { data, error } = await platformDb.rpc('rename_menu_item', { p_menu_item_id: menuItemId, p_new_label: newLabel }); if (error) throw error; return data }`.
- `apps/platform/src/components/admin/RoleMenuCustomiser.jsx` **and** the Simulator copy: in `MenuRows`, when `variant === 'admin'` (System Admin page only — never rendered on the PMO variant), replace the static `<span>{node.menu_label}</span>` with an inline-editable field (click pencil → text input → Enter/blur saves via `renameMenuItem`, calls `clearSidebarMenuCache` + reloads `fetchFullMenuTree()` on success, same refresh pattern `handleSave` already uses). Respect the existing `locked = readOnly || node.is_system_menu` guard.

No new page, no new route — this extends the page that already exists at `/platform/admin/role-menu-access`-equivalent (System Admin variant) in both apps.

## Non-goals

- No changes to `role_menu_items` / visibility toggling — already works.
- No Simulator-specific schema (`sim.menu_items` doesn't exist; both apps share `public.menu_items`).
- No consolidation of the duplicated `RoleMenuCustomiser.jsx`/`menuManagementService.js` files into a shared package — out of scope per rule 32 (don't refactor unrelated code) and rule 6 (smallest possible change); the two copies are currently byte-identical and this plan keeps them that way by applying the identical edit twice.
- Renaming `menu_description`, `route_path`, `menu_icon`, etc. — label only, matching the literal ask.

## Phases

- [x] **Phase 1 — Backend:** `SQL/v749_menu_item_label_rename.sql` (helper function + RPC + grant). Verify via SQL editor: system_admin can rename, pmo_admin/org_admin cannot, system-protected menu rejected.
- [x] **Phase 2 — Frontend (Platform):** `menuManagementService.js` + `RoleMenuCustomiser.jsx` inline-edit, admin variant only.
- [x] **Phase 3 — Frontend (Simulator):** identical edit to the Simulator copies of both files (rule 34.1 parity).
- [x] **Phase 4 — Docs & tests:** update `Documentation/Unified_Sidebar_Menu_Guide.md` describing the new rename affordance; unit tests for `renameMenuItem` in `menuManagementService.test.js` (Platform + Simulator).

## Manual test checklist

1. As System Admin, rename a non-system menu label on the admin variant page → sidebar reflects new label immediately for that user, and for other users after cache expiry.
2. Attempt the same as PMO Admin → rename control isn't shown (admin-only variant) / RPC rejects if called directly.
3. Attempt to rename a menu item with `is_system_menu = TRUE` → rejected with a clear error.
4. Confirm Simulator's admin variant page shows the identical rename affordance (parity check).

## Implementation notes

- Apply `SQL/v749_menu_item_label_rename.sql` in Supabase before using rename in production/staging.
- UI: `EditableMenuLabel` component with pencil icon; `allowLabelEdit = variant === 'admin' && editorCap.isSystemAdmin`.
- Docs: `Documentation/Unified_Sidebar_Menu_Guide.md` and `public/Documentation/Unified_Sidebar_Menu_Guide.md`.
