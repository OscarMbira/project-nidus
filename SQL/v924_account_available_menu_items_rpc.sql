-- ============================================================================
-- v924: SaaS Industry-Aware Tenant Provisioning — Phase 4a (org-availability RPC)
-- ============================================================================
-- See projectprd/v918_saas_industry_tenant_provisioning_PRD.md, decision 11.
--
-- get_account_available_menu_item_ids() is the server-side implementation of the brief's
-- "Effective Menu = Core + Generic PM + Industry Pack + Org Overrides" formula (role
-- permissions are intersected separately, client-side in useMenu.js, exactly as they already
-- are today — this function only answers "is this menu item available to the ORGANISATION at
-- all", never "can THIS USER see it").
--
-- FAIL-OPEN BY DESIGN, and this is the single most important property of this function: a
-- menu item that has never been classified into ANY industry_pack_menu_items row (i.e.
-- nobody has industry-tagged it) is ALWAYS available, regardless of the account's industries.
-- Only a menu item that HAS been explicitly classified into some pack is gated to "does this
-- account have that industry". This means Phase 4 can only ever ADD restriction on top of
-- deliberately-curated pack content — it can never silently hide a menu item that was already
-- visible today just because nobody has gotten around to industry-tagging it yet. Given the
-- v921 seed only covers items that happened to be granted to an industry-tagged built-in role,
-- a large fraction of the menu tree (System Administration, Billing, brand-new features, etc.)
-- is untagged and stays universally visible under this function exactly as it is today.
--
-- "Generic PM" is the Cross-Industry pack's content, and is unconditionally included for
-- every account regardless of what's in account_industries — matching the brief's formula,
-- which lists Core + Generic PM as always-on layers, separate from the variable Industry Pack
-- layer. (v922's backfill still gives every pre-existing account an explicit primary industry
-- for onboarding/UX/project-inheritance purposes — that remains useful even though it is no
-- longer strictly required for baseline menu availability, since Generic PM is unconditional.)
--
-- Implemented as a single SQL function (not client-side JS) per the brief's own menu-resolution
-- performance guidance (section 35: prefer database views/functions over N+1/client-side
-- computation) — one round trip, one source of truth.
-- Prerequisites: v918 (account_industries), v920 (industry_packs, industry_pack_menu_items,
-- organisation_disabled_capabilities), v906 (industry_categories — Cross-Industry row)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_account_available_menu_item_ids(p_account_id UUID)
RETURNS TABLE(menu_item_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH org_industries AS (
    -- Whatever industries the org selected, PLUS Cross-Industry unconditionally (Generic PM
    -- baseline — brief's formula treats this as always-on, not selection-dependent).
    SELECT industry_category_id FROM public.account_industries WHERE account_id = p_account_id
    UNION
    SELECT id FROM public.industry_categories WHERE name = 'Cross-Industry' AND is_active = TRUE
  ),
  org_pack_items AS (
    SELECT DISTINCT ipmi.menu_item_id
    FROM public.industry_pack_menu_items ipmi
    JOIN public.industry_packs ip ON ip.id = ipmi.industry_pack_id AND ip.is_active = TRUE
    WHERE ip.industry_category_id IN (SELECT industry_category_id FROM org_industries)
  ),
  org_disabled_items AS (
    SELECT ipmi.menu_item_id
    FROM public.organisation_disabled_capabilities odc
    JOIN public.industry_pack_menu_items ipmi ON ipmi.id = odc.industry_pack_menu_item_id
    WHERE odc.account_id = p_account_id
  ),
  classified_items AS (
    SELECT DISTINCT ipmi2.menu_item_id FROM public.industry_pack_menu_items ipmi2
  )
  SELECT mi.id
  FROM public.menu_items mi
  WHERE mi.is_active = TRUE
    AND (
      -- fail-open: never classified into any pack -> always available
      NOT EXISTS (SELECT 1 FROM classified_items ci WHERE ci.menu_item_id = mi.id)
      OR (
        EXISTS (SELECT 1 FROM org_pack_items opi WHERE opi.menu_item_id = mi.id)
        AND NOT EXISTS (SELECT 1 FROM org_disabled_items odi WHERE odi.menu_item_id = mi.id)
      )
    );
$$;

COMMENT ON FUNCTION public.get_account_available_menu_item_ids(UUID) IS
  'v918/v924: org-level menu availability (Core + Generic PM + selected Industry Packs − '
  'organisation_disabled_capabilities), fail-open for any menu item never classified into a '
  'pack. Consumed by useMenu.js/useSimMenu.js as an ADDITIONAL filter applied strictly after '
  'the existing role-grant hydration — never expands what a role grants, only narrows it to '
  'what the organisation makes available. Answers account-level availability only; role-level '
  'authorization (role_menu_items) remains a completely separate, unchanged check.';

-- No RLS-bypass concern beyond what already exists: account_industries, industry_pack_menu_items,
-- and organisation_disabled_capabilities are all already broad-authenticated-read tables (no
-- organisation-membership table exists to scope them tighter — see v918/v920's own RLS notes),
-- so this function doesn't expose anything a caller couldn't already query directly.
GRANT EXECUTE ON FUNCTION public.get_account_available_menu_item_ids(UUID) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'v924: get_account_available_menu_item_ids() installed';
END $$;
