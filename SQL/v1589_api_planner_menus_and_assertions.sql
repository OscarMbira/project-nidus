-- ============================================================================
-- v1589: Public API / SCIM / SSO — Planner menus + assertion tests (v1356)
-- Companion to v1585–v1588. Idempotent.
-- ============================================================================

-- ── Planner edition menus (pln_*) ───────────────────────────────────────────
DO $$
DECLARE
  v_settings UUID;
BEGIN
  SELECT id INTO v_settings FROM public.menu_items WHERE menu_code = 'pln_settings' LIMIT 1;

  INSERT INTO public.menu_items (
    id, menu_code, menu_label, menu_description, route_path, parent_menu_id,
    menu_level, sort_order, methodology, menu_icon, is_active, is_visible,
    default_section_code, created_at, updated_at
  )
  SELECT gen_random_uuid(), v.code, v.label, v.descr, v.path, v_settings,
         2, v.sort, 'universal', v.icon, TRUE, TRUE, 'project_setup', NOW(), NOW()
  FROM (VALUES
    ('pln_settings_integrations', 'Integrations & Security', 'API keys, webhooks, SCIM and SSO (v1356).', '/app/settings/integrations', 20, 'key'),
    ('pln_settings_api_keys', 'API keys', 'Organisation API keys (v1356).', '/app/settings/integrations/api-keys', 21, 'key'),
    ('pln_settings_webhooks', 'Webhooks', 'Webhook endpoints (v1356).', '/app/settings/integrations/webhooks', 22, 'webhook'),
    ('pln_settings_scim', 'SCIM provisioning', 'SCIM Users and Groups (v1356).', '/app/settings/integrations/scim', 23, 'users'),
    ('pln_settings_sso', 'Single sign-on', 'SAML / OIDC (v1356).', '/app/settings/integrations/sso', 24, 'lock'),
    ('pln_settings_api_docs', 'API reference', 'OpenAPI reference (v1356).', '/app/settings/integrations/api-docs', 25, 'book')
  ) AS v(code, label, descr, path, sort, icon)
  WHERE v_settings IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.menu_items m WHERE m.menu_code = v.code);
END $$;

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.roles r
JOIN public.menu_items mi ON mi.menu_code LIKE 'pln_settings_%'
WHERE r.role_name IN ('account_owner', 'pmo_admin')
  AND mi.menu_code IN (
    'pln_settings_integrations', 'pln_settings_api_keys', 'pln_settings_webhooks',
    'pln_settings_scim', 'pln_settings_sso', 'pln_settings_api_docs'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.role_menu_items x
    WHERE x.role_id = r.id AND x.menu_item_id = mi.id
  );

INSERT INTO public.planner_menu_allowlist (menu_item_id, menu_code)
SELECT id, menu_code FROM public.menu_items
WHERE menu_code IN (
  'pln_settings_integrations', 'pln_settings_api_keys', 'pln_settings_webhooks',
  'pln_settings_scim', 'pln_settings_sso', 'pln_settings_api_docs'
)
ON CONFLICT (menu_code) DO NOTHING;

INSERT INTO public.menu_item_placements (id, menu_item_id, placement_key, section_code, sort_order, scope, created_at, updated_at)
SELECT gen_random_uuid(), mi.id, 'pmo_organisation', COALESCE(mi.default_section_code, 'project_setup'), COALESCE(mi.sort_order, 70), 'organisation', NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code IN (
  'plat_org_integrations', 'plat_org_api_keys', 'plat_org_api_docs',
  'plat_org_webhooks', 'plat_org_scim', 'plat_org_sso'
)
AND NOT EXISTS (
  SELECT 1 FROM public.menu_item_placements p
  WHERE p.menu_item_id = mi.id AND p.placement_key = 'pmo_organisation'
);

-- ── Assertion tests (run after v1585–v1588) ─────────────────────────────────
DO $$
BEGIN
  ASSERT to_regclass('public.api_credentials') IS NOT NULL, 'api_credentials missing';
  ASSERT to_regclass('public.api_request_log') IS NOT NULL, 'api_request_log missing';
  ASSERT to_regclass('public.api_rate_counters') IS NOT NULL, 'api_rate_counters missing';
  ASSERT to_regclass('public.api_idempotency_keys') IS NOT NULL, 'api_idempotency_keys missing';
  ASSERT to_regclass('public.webhook_endpoints') IS NOT NULL, 'webhook_endpoints missing';
  ASSERT to_regclass('public.webhook_outbox') IS NOT NULL, 'webhook_outbox missing';
  ASSERT to_regclass('public.webhook_deliveries') IS NOT NULL, 'webhook_deliveries missing';
  ASSERT to_regclass('public.scim_settings') IS NOT NULL, 'scim_settings missing';
  ASSERT to_regclass('public.scim_group_mappings') IS NOT NULL, 'scim_group_mappings missing';
  ASSERT to_regclass('public.scim_identities') IS NOT NULL, 'scim_identities missing';
  ASSERT to_regclass('public.sso_connections') IS NOT NULL, 'sso_connections missing';
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_service_account'
  ), 'users.is_service_account missing';
  ASSERT EXISTS (
    SELECT 1 FROM public.background_jobs WHERE code IN ('webhooks.deliver', 'api.purge_idempotency_and_counters', 'sso.domain_recheck')
  ), 'v1356 background jobs missing';
  ASSERT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_org_integrations'), 'plat_org_integrations menu missing';
  RAISE NOTICE 'v1589: API / SCIM / SSO assertions passed';
END $$;
