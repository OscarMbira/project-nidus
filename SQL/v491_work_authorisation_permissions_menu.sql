-- ============================================================================
-- v491 — Work Authorisation: permissions, role_permissions, sidebar menus
-- Platform + Simulator (public.menu_items / role_menu_items)
-- ============================================================================

INSERT INTO public.permissions (
    permission_code, permission_name, permission_description,
    permission_category, permission_module, permission_type, is_system_permission, is_active
)
VALUES
    ('work_authorisation.view', 'View Work Authorisations', 'View work authorisation lists and records', 'governance', 'work_authorisation', 'read', true, true),
    ('work_authorisation.request', 'Request Work Authorisations', 'Create and submit work authorisation requests', 'governance', 'work_authorisation', 'create', true, true),
    ('work_authorisation.review', 'Review Work Authorisations', 'Review queue and participate in decisions', 'governance', 'work_authorisation', 'read', true, true),
    ('work_authorisation.approve', 'Approve Work Authorisations', 'Approve, reject, or defer work authorisations', 'governance', 'work_authorisation', 'execute', true, true),
    ('work_authorisation.suspend', 'Suspend or Resume Authorisations', 'Suspend or resume active authorisations', 'governance', 'work_authorisation', 'update', true, true),
    ('work_authorisation.audit', 'Audit Work Authorisations', 'Full visibility of history and audit trail', 'governance', 'work_authorisation', 'read', true, true)
ON CONFLICT (permission_code) DO UPDATE SET
    permission_name = EXCLUDED.permission_name,
    permission_description = EXCLUDED.permission_description,
    updated_at = NOW();

-- Map to global/system roles (same pattern as v442 ITTO)
INSERT INTO public.role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM public.roles r
CROSS JOIN public.permissions p
WHERE p.permission_code IN (
    'work_authorisation.view', 'work_authorisation.request', 'work_authorisation.review',
    'work_authorisation.approve', 'work_authorisation.suspend', 'work_authorisation.audit'
)
  AND r.role_name IN ('system_admin', 'pmo_admin')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

INSERT INTO public.role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM public.roles r
CROSS JOIN public.permissions p
WHERE p.permission_code IN (
    'work_authorisation.view', 'work_authorisation.request', 'work_authorisation.review',
    'work_authorisation.approve', 'work_authorisation.suspend'
)
  AND r.role_name IN ('project_manager', 'programme_manager', 'portfolio_manager')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

INSERT INTO public.role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM public.roles r
CROSS JOIN public.permissions p
WHERE p.permission_code IN ('work_authorisation.view', 'work_authorisation.request', 'work_authorisation.review')
  AND r.role_name IN ('team_lead', 'team_manager', 'pm_team_manager')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

INSERT INTO public.role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM public.roles r
CROSS JOIN public.permissions p
WHERE p.permission_code = 'work_authorisation.view'
  AND r.role_name IN (
    'pm_project_assurance', 'project_assurance', 'pm_quality_assurance', 'quality_assurance',
    'pm_team_member', 'team_member', 'stakeholder', 'viewer', 'auditor', 'sponsor',
    'project_sponsor'
  )
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- Platform: top-level menu (after Change Request Log sort 96)
INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
)
VALUES
    (
        'platform_work_authorisation',
        'Work Authorisations',
        'Request, review, and track governed work authorisations across the project lifecycle',
        NULL,
        1,
        97,
        '/platform/work-authorisations',
        'shield-check',
        TRUE,
        TRUE
    ),
    (
        'platform_work_authorisation_drafts',
        'Work Authorisation Drafts',
        'Save and continue draft work authorisation requests',
        NULL,
        1,
        98,
        '/platform/work-authorisations/drafts',
        'file-clock',
        TRUE,
        TRUE
    )
ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    route_path = EXCLUDED.route_path,
    menu_icon = EXCLUDED.menu_icon,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
SELECT r.id, mi.id, TRUE, TRUE, TRUE
FROM public.roles r
CROSS JOIN public.menu_items mi
WHERE mi.menu_code IN ('platform_work_authorisation', 'platform_work_authorisation_drafts')
  AND mi.is_active = TRUE
  AND r.role_name IN (
      'System Admin',
      'PMO Admin',
      'Portfolio Manager',
      'Programme Manager',
      'Project Manager',
      'Team Manager',
      'Team Lead',
      'Team Member',
      'Project Assurance',
      'Quality Assurance',
      'Risk Manager',
      'Stakeholder',
      'Viewer',
      'Auditor',
      'Sponsor',
      'Project Sponsor',
      'Project Board Member'
  )
  AND r.is_active = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view = TRUE,
    can_use = TRUE,
    is_active = TRUE,
    updated_at = NOW();

-- Simulator: under Controls & Registers (sim_pm_controls)
DO $$
DECLARE
    v_parent UUID;
BEGIN
    SELECT id INTO v_parent FROM public.menu_items
    WHERE menu_code = 'sim_pm_controls' AND COALESCE(is_deleted, FALSE) = FALSE
    LIMIT 1;

    IF v_parent IS NULL THEN
        RAISE NOTICE 'v491: sim_pm_controls parent missing — skip simulator work authorisation menu children';
        RETURN;
    END IF;

    INSERT INTO public.menu_items (
        menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
        route_path, menu_icon, is_visible, is_active
    )
    VALUES
        (
            'sim_pm_controls_work_authorisation',
            'Practice Work Authorisations',
            'Practice work authorisation requests and decisions',
            v_parent,
            2,
            60,
            '/simulator/pm/controls/work-authorisations',
            'shield-check',
            TRUE,
            TRUE
        ),
        (
            'sim_pm_controls_work_auth_drafts',
            'Practice Work Authorisation Drafts',
            'Draft queue for practice work authorisations',
            v_parent,
            2,
            61,
            '/simulator/pm/controls/work-authorisations/drafts',
            'file-clock',
            TRUE,
            TRUE
        )
    ON CONFLICT (menu_code) DO UPDATE SET
        menu_label = EXCLUDED.menu_label,
        parent_menu_id = EXCLUDED.parent_menu_id,
        route_path = EXCLUDED.route_path,
        menu_icon = EXCLUDED.menu_icon,
        is_active = TRUE,
        is_deleted = FALSE,
        updated_at = NOW();
END $$;

INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, mi.id, TRUE, TRUE, TRUE, FALSE
FROM public.roles r
CROSS JOIN public.menu_items mi
WHERE mi.menu_code IN ('sim_pm_controls_work_authorisation', 'sim_pm_controls_work_auth_drafts')
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND r.role_name IN (
      'project_manager', 'programme_manager', 'portfolio_manager',
      'pmo_admin', 'system_admin',
      'team_lead', 'team_manager', 'pm_team_manager',
      'PMO Admin', 'System Admin'
  )
  AND COALESCE(r.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view = TRUE,
    can_use = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();
