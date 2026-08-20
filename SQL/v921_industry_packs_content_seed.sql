-- ============================================================================
-- v921: SaaS Industry-Aware Tenant Provisioning — Phase 1d (industry_packs content seed)
-- ============================================================================
-- See projectplan/v918_saas_industry_tenant_provisioning_plan.md, Phase 1 risk note 3.
--
-- Seeds one industry_packs row per industry_categories row (including "Cross-Industry" as
-- the General Project Management / fallback pack — reuses the existing row rather than
-- creating a duplicate industry category for it) and derives EVERY pack's menu-item content
-- directly from the 100 already industry-tagged built-in roles' existing role_menu_items
-- grants (v906-v913) — not hand-picked/guessed. A role tagged "Financial Services" already
-- has a curated, reviewed set of menu grants; the union of those grants across every
-- Financial-Services-tagged built-in role becomes the Financial Services pack's content.
-- This keeps pack curation data-driven and traceable to already-approved reference data,
-- per the brief's "do not seed uncontrolled dummy/sample data" instruction.
--
-- Idempotent: ON CONFLICT DO NOTHING throughout; safe to re-run after v906-v913 role/menu
-- grants change (re-running will pick up newly-tagged roles' grants, never remove existing
-- pack membership — pack curation only grows via this seed, shrinking is a deliberate Admin
-- action against industry_pack_menu_items directly, not something this seed does).
-- Prerequisites: v920 (industry_packs schema), v906-v913 (industry_category_id-tagged roles
-- and their role_menu_items grants)
-- ============================================================================

-- ── 1. One industry_packs row per industry_categories row ──────────────────

INSERT INTO public.industry_packs (industry_category_id, pack_code, pack_name, description)
SELECT
  ic.id,
  CASE WHEN ic.name = 'Cross-Industry' THEN 'general_pm'
       ELSE lower(regexp_replace(regexp_replace(ic.name, '[^a-zA-Z0-9]+', '_', 'g'), '^_+|_+$', '', 'g'))
  END,
  CASE WHEN ic.name = 'Cross-Industry' THEN 'General Project Management'
       ELSE ic.name || ' Pack'
  END,
  CASE WHEN ic.name = 'Cross-Industry'
       THEN 'The generic PM core — always available regardless of which industries an organisation selects.'
       ELSE 'Menu items and capabilities relevant to ' || ic.name || ' organisations.'
  END
FROM public.industry_categories ic
WHERE ic.is_active = TRUE
ON CONFLICT (pack_code) DO UPDATE SET
  pack_name = EXCLUDED.pack_name,
  description = EXCLUDED.description,
  is_active = TRUE,
  updated_at = NOW();

-- ── 2. Derive pack menu-item content from existing industry-tagged built-in role grants ────

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT DISTINCT ip.id, rmi.menu_item_id
FROM public.industry_packs ip
JOIN public.roles r
  ON r.industry_category_id = ip.industry_category_id
 AND r.account_id IS NULL
 AND r.is_active = TRUE
JOIN public.role_menu_items rmi
  ON rmi.role_id = r.id
 AND rmi.is_active = TRUE
JOIN public.menu_items mi
  ON mi.id = rmi.menu_item_id
 AND mi.is_active = TRUE
 AND mi.is_visible = TRUE
 AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

-- ── 3. Database table registration already covered by v920 — no new tables here ─────────

DO $$
DECLARE
  v_pack_count INT;
  v_item_count INT;
BEGIN
  SELECT COUNT(*) INTO v_pack_count FROM public.industry_packs;
  SELECT COUNT(*) INTO v_item_count FROM public.industry_pack_menu_items;
  RAISE NOTICE 'v921: % industry packs seeded, % pack-menu-item grants derived from existing role_menu_items', v_pack_count, v_item_count;
END $$;
