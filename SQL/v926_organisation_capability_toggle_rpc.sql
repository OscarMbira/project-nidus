-- ============================================================================
-- v926: SaaS Industry-Aware Tenant Provisioning — Phase 7 (capability toggle RPC)
-- ============================================================================
-- See projectprd/v918_saas_industry_tenant_provisioning_PRD.md, decision 11.
--
-- organisation_disabled_capabilities only grants SELECT to `authenticated` (v920) — no
-- direct-client INSERT/DELETE policy exists, by design (rule 42: RLS stays the write gate,
-- not bypassed). This RPC is the only write path for an org admin opting a specific
-- industry-pack menu item out of (or back into) their organisation's available menu, from
-- the Organisation Settings "Modules & Capabilities" panel (Phase 7).
--
-- Authorization mirrors provision_organisation_tenant() (v923): account owner OR
-- user_can_manage_org_roles() (v903) — the same boundary already used for every other
-- org-config write this feature introduces.
-- Prerequisites: v920 (organisation_disabled_capabilities, industry_pack_menu_items),
-- v903 (user_can_manage_org_roles)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.toggle_organisation_capability(
  p_account_id UUID,
  p_industry_pack_menu_item_id UUID,
  p_disabled BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_user_id UUID;
BEGIN
  SELECT id INTO v_caller_user_id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE;
  IF v_caller_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE id = p_account_id AND owner_user_id = v_caller_user_id AND is_deleted = FALSE
    )
    OR public.user_can_manage_org_roles(v_caller_user_id, p_account_id)
  ) THEN
    RAISE EXCEPTION 'You do not have permission to manage this organisation''s capabilities';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM industry_pack_menu_items WHERE id = p_industry_pack_menu_item_id) THEN
    RAISE EXCEPTION 'Unknown industry pack menu item %', p_industry_pack_menu_item_id;
  END IF;

  IF p_disabled THEN
    INSERT INTO organisation_disabled_capabilities (account_id, industry_pack_menu_item_id, disabled_by)
    VALUES (p_account_id, p_industry_pack_menu_item_id, v_caller_user_id)
    ON CONFLICT (account_id, industry_pack_menu_item_id) DO NOTHING;
  ELSE
    DELETE FROM organisation_disabled_capabilities
    WHERE account_id = p_account_id AND industry_pack_menu_item_id = p_industry_pack_menu_item_id;
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_organisation_capability(UUID, UUID, BOOLEAN) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'v926: toggle_organisation_capability() installed';
END $$;
