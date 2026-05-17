-- v398: Remove PMO-exclusive menu items from the project_manager role
-- Problem: project_manager users were seeing full PMO sidebar (portfolio, programme,
--          executive overview, PMO admin, etc.) because their role_menu_items included
--          menu items whose route_paths triggered the PMO sidebar revamp logic.
-- Fix: soft-delete (is_active = false, is_deleted = true) any role_menu_item assignments
--      for the project_manager role that point to PMO-exclusive routes/areas.
--      The project_manager role should only see: project management, daily log,
--      RAID registers (risks/issues/changes), team members, and project-scoped reports.

DO $$
DECLARE
  v_pm_role_id UUID;
  v_row_count  INT;
BEGIN
  -- Look up the project_manager role id
  SELECT id INTO v_pm_role_id
  FROM roles
  WHERE role_name ILIKE 'project_manager'
     OR role_name ILIKE 'project manager'
  LIMIT 1;

  IF v_pm_role_id IS NULL THEN
    RAISE NOTICE 'project_manager role not found — skipping cleanup';
    RETURN;
  END IF;

  RAISE NOTICE 'Cleaning PMO-exclusive menu items from role: %', v_pm_role_id;

  -- Soft-delete role_menu_items for the PM role where the linked menu_item
  -- belongs to PMO-exclusive route areas.
  UPDATE role_menu_items rmi
  SET
    is_active  = FALSE,
    is_deleted = TRUE,
    updated_at = NOW()
  FROM menu_items mi
  WHERE rmi.role_id    = v_pm_role_id
    AND rmi.menu_item_id = mi.id
    AND rmi.is_deleted = FALSE
    AND (
      -- PMO executive / oversight routes
      mi.route_path ILIKE '/pmo/%'
      OR mi.route_path ILIKE '%/oversight%'
      -- Portfolio
      OR mi.route_path ILIKE '/platform/portfolio%'
      -- Programme
      OR mi.route_path ILIKE '/platform/programme%'
      OR mi.route_path ILIKE '/platform/benefits%'
      -- PMO administration pages
      OR mi.route_path ILIKE '/platform/pmo-admin/manager-assignments%'
      OR mi.route_path ILIKE '/platform/pmo-admin/manager-assignment-settings%'
      OR mi.route_path ILIKE '/platform/pmo-admin/settings%'
      OR mi.route_path ILIKE '/platform/pmo-admin/teams%'
      -- Email & notifications admin (PMO only)
      OR mi.route_path ILIKE '/platform/admin/email-settings%'
      OR mi.route_path ILIKE '/platform/admin/email-sender-profiles%'
      OR mi.route_path ILIKE '/platform/admin/invitation-settings%'
      -- Branding / org identity (PMO only)
      OR mi.route_path ILIKE '/platform/organisation/branding%'
      OR mi.route_path ILIKE '/platform/pmo-admin/branding%'
      -- PMO governance / methodology
      OR mi.route_path ILIKE '/platform/governance/%'
      -- System / platform admin
      OR mi.route_path ILIKE '/platform/settings%'
      OR mi.route_path ILIKE '/platform/pwa-settings%'
      -- PMO menu labels (for items without explicit route_path)
      OR mi.menu_label ILIKE 'Executive Overview'
      OR mi.menu_label ILIKE 'Portfolio'
      OR mi.menu_label ILIKE 'Programme'
      OR mi.menu_label ILIKE 'Programme Management'
      OR mi.menu_label ILIKE 'PMO Administration'
      OR mi.menu_label ILIKE 'PMO Admin'
      OR mi.menu_label ILIKE 'Governance & Standards'
      OR mi.menu_label ILIKE 'Email & Notifications'
      OR mi.menu_label ILIKE 'Email Settings'
      OR mi.menu_label ILIKE 'Sender Profiles'
      OR mi.menu_label ILIKE 'Invitation Templates'
      OR mi.menu_label ILIKE 'Invitation Expiry'
      -- menu_code patterns for PMO items
      OR mi.menu_code ILIKE 'pmo_%'
      OR mi.menu_code ILIKE '%_portfolio%'
      OR mi.menu_code ILIKE '%_programme%'
      OR mi.menu_code ILIKE '%oversight%'
    );

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RAISE NOTICE 'PMO menu cleanup for project_manager complete. Rows affected: %', v_row_count;
END $$;

-- Verification: show what remains for the project_manager role
SELECT
  mi.menu_label,
  mi.route_path,
  mi.menu_code,
  rmi.can_view,
  rmi.can_use,
  rmi.is_active,
  rmi.is_deleted
FROM role_menu_items rmi
JOIN menu_items      mi  ON mi.id = rmi.menu_item_id
JOIN roles           r   ON r.id  = rmi.role_id
WHERE r.role_name ILIKE 'project_manager'
   OR r.role_name ILIKE 'project manager'
ORDER BY mi.menu_label;
