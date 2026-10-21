-- ============================================================================
-- v1290: public.auth_user_can_use_menu(menu_codes) — "may the signed-in user USE this menu item?"
-- ============================================================================
-- First use: the meeting review page (comms/review/:meetingId, Platform + Simulator) only lets a
-- person file meeting outcomes to the registers when one of their roles has can_use = TRUE on the
-- Pending AI Reviews menu item (plat_pm_comms_pending_review / sim_pm_comms_pending_review, v1289).
-- v1289 grants that to PMO, Project Manager, Team Manager and Team Lead roles; Team Members keep
-- can_use = FALSE, so they can read the review page but not file. Admins change this per role in
-- the existing role menu screens — no code change needed.
--
-- Same grant rules as the sidebar (useMenu): active user_roles → active roles → active, not-deleted
-- role_menu_items with can_view and can_use → active menu_items. Only the caller's own grants are
-- read and only TRUE/FALSE is returned, so SECURITY DEFINER + row_security = off exposes nothing
-- (same pattern as auth_user_can_access_project). No grant, or no active menu row → FALSE.
--
-- Prerequisite: v1289 (the menu rows and grants). Idempotent.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auth_user_can_use_menu(p_menu_codes TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.user_roles ur
      ON ur.user_id = u.id
     AND ur.is_active = TRUE
     AND COALESCE(ur.is_deleted, FALSE) = FALSE
    JOIN public.roles r
      ON r.id = ur.role_id
     AND COALESCE(r.is_deleted, FALSE) = FALSE
     AND COALESCE(r.is_active, TRUE) = TRUE
    JOIN public.role_menu_items rmi
      ON rmi.role_id = r.id
     AND rmi.can_view = TRUE
     AND rmi.can_use = TRUE
     AND rmi.is_active = TRUE
     AND COALESCE(rmi.is_deleted, FALSE) = FALSE
    JOIN public.menu_items mi
      ON mi.id = rmi.menu_item_id
     AND mi.is_active = TRUE
     AND COALESCE(mi.is_deleted, FALSE) = FALSE
    WHERE u.auth_user_id = auth.uid()
      AND mi.menu_code = ANY (p_menu_codes)
  );
$$;

REVOKE ALL ON FUNCTION public.auth_user_can_use_menu(TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_can_use_menu(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_can_use_menu(TEXT[]) TO service_role;

COMMENT ON FUNCTION public.auth_user_can_use_menu(TEXT[]) IS
  'v1290: TRUE when one of the signed-in user''s active roles has can_view + can_use on any of the given active menu items.';

-- Check (read-only): which roles may file meeting outcomes (can_use) vs only view them.
SELECT mi.menu_code, r.role_name, rmi.can_use
FROM public.menu_items mi
JOIN public.role_menu_items rmi ON rmi.menu_item_id = mi.id AND rmi.can_view = TRUE AND rmi.is_active = TRUE AND COALESCE(rmi.is_deleted, FALSE) = FALSE
JOIN public.roles r ON r.id = rmi.role_id
WHERE mi.menu_code IN ('plat_pm_comms_pending_review', 'sim_pm_comms_pending_review')
ORDER BY mi.menu_code, rmi.can_use DESC, r.role_name;
