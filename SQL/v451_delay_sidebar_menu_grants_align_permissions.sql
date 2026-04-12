-- ============================================================================
-- v451: Align PM + Simulator PM delay sidebar entries with v446 permissions
--
-- v446 grants platform delay menus to every role that has delay.view /
-- delay.create. v449 / v450 only granted pm_delays / sim_pm_delays to a narrow
-- role list, so viewers, assurance, team members, etc. saw /platform/delays
-- but not /pm/delays or simulator PM delays. This migration grants:
--   • pm_delays, pm_delay_register  → roles with delay.view
--   • pm_delay_drafts               → roles with delay.create
--   • sim_pm_delays, sim_pm_delay_register → roles with delay.view
--   • sim_pm_delay_drafts           → roles with delay.create
-- Idempotent: safe to re-run.
-- ============================================================================

-- PM dashboard delay section (matches v446 visibility rules)
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT DISTINCT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
INNER JOIN role_permissions rp ON rp.role_id = r.id
  AND COALESCE(rp.is_deleted, FALSE) = FALSE
  AND rp.is_active = TRUE
INNER JOIN permissions p ON p.id = rp.permission_id AND p.permission_code = 'delay.view'
CROSS JOIN menu_items m
WHERE m.menu_code IN ('pm_delays', 'pm_delay_register')
  AND COALESCE(m.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT DISTINCT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
INNER JOIN role_permissions rp ON rp.role_id = r.id
  AND COALESCE(rp.is_deleted, FALSE) = FALSE
  AND rp.is_active = TRUE
INNER JOIN permissions p ON p.id = rp.permission_id AND p.permission_code = 'delay.create'
CROSS JOIN menu_items m
WHERE m.menu_code = 'pm_delay_drafts'
  AND COALESCE(m.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

-- Simulator PM delay section (same permission gates)
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT DISTINCT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
INNER JOIN role_permissions rp ON rp.role_id = r.id
  AND COALESCE(rp.is_deleted, FALSE) = FALSE
  AND rp.is_active = TRUE
INNER JOIN permissions p ON p.id = rp.permission_id AND p.permission_code = 'delay.view'
CROSS JOIN menu_items m
WHERE m.menu_code IN ('sim_pm_delays', 'sim_pm_delay_register')
  AND COALESCE(m.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT DISTINCT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
INNER JOIN role_permissions rp ON rp.role_id = r.id
  AND COALESCE(rp.is_deleted, FALSE) = FALSE
  AND rp.is_active = TRUE
INNER JOIN permissions p ON p.id = rp.permission_id AND p.permission_code = 'delay.create'
CROSS JOIN menu_items m
WHERE m.menu_code = 'sim_pm_delay_drafts'
  AND COALESCE(m.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();
