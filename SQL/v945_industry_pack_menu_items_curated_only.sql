-- ============================================================================
-- v945: Structural fix — industry_pack_menu_items keeps ONLY genuinely curated content
-- ============================================================================
-- Supersedes v944 (do not run v944 — run this instead). Every prior attempt (v939/v940/v943/
-- v944) tried to identify "generic" items to exclude via a heuristic or an explicit code list —
-- each round found more mis-classified items than the last, because the actual root cause was
-- never the specific items, it was the DERIVATION METHOD itself.
--
-- SQL/v921 populated industry_pack_menu_items by deriving pack membership from role_menu_items
-- grants on industry-tagged built-in roles. But those roles (SQL/v907/v913) were seeded by
-- COPYING their entire grant set from an existing generic tier_source role (e.g.
-- it_programme_manager copies programme_manager's full grants) — correct for RBAC, but it means
-- there is NO genuine industry-specific signal anywhere in role_menu_items to derive from. Every
-- item an industry-tagged role can see, its generic counterpart can see too. No query against
-- that data can ever correctly separate "generic" from "industry-specific", because the
-- distinction was never encoded there in the first place.
--
-- The ONE part of this system with a real, hand-authored, per-industry curation table is the
-- Local Register Engine: SQL/v931/v933 built 28 registers with deliberate industry_category
-- relevance (Permits for Construction, Clinical Trials for Healthcare, etc.), recorded in
-- local_register_industry_packs — an actual curation table, not an inference. SQL/v934 links
-- their menu items into industry_pack_menu_items from that same table.
--
-- Fix: industry_pack_menu_items keeps ONLY rows that trace back to local_register_industry_packs
-- (the real curation source). Every row that came from v921's role-grant derivation is removed —
-- not by guessing which ones are "generic", but by removing the entire untrustworthy source and
-- keeping only the trustworthy one. groupMenuTreeByIndustryPack()'s owner lookup already falls
-- through to 'core' for anything not classified, so every non-curated menu item (all of Template
-- Library, Organisational Templates, Field Templates, and everything else that was never
-- genuinely industry-specific) correctly reappears under "Core Project Management" — with no
-- item list to maintain, in this migration or in application code.
--
-- Going forward: new genuinely industry-specific menu content must be added by creating a real
-- curation link (the local_register_industry_packs pattern, or an equivalent purpose-built
-- table) — never by re-deriving from role_menu_items. If SQL/v921 or SQL/v934 are ever re-run,
-- re-run this file immediately after; v921's derivation step is not safe to rely on again.
-- ============================================================================

DO $$
DECLARE
  v_removed INT;
  v_remaining INT;
BEGIN
  WITH curated AS (
    SELECT DISTINCT lrip.industry_pack_id, mi.id AS menu_item_id
    FROM public.local_register_industry_packs lrip
    JOIN public.local_registers lr ON lr.id = lrip.register_id
    JOIN public.menu_items mi ON mi.route_path = '/platform/local-registers/' || lr.id::text
    WHERE COALESCE(mi.is_deleted, FALSE) = FALSE
  ),
  deleted AS (
    DELETE FROM public.industry_pack_menu_items ipmi
    WHERE NOT EXISTS (
      SELECT 1 FROM curated c
      WHERE c.industry_pack_id = ipmi.industry_pack_id
        AND c.menu_item_id = ipmi.menu_item_id
    )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_removed FROM deleted;

  SELECT COUNT(*) INTO v_remaining FROM public.industry_pack_menu_items;

  RAISE NOTICE 'v945: removed % uncurated (role-derived) industry_pack_menu_items rows; % genuinely-curated rows remain (all Local Register Engine content)', v_removed, v_remaining;
END $$;

-- Read-only verification — every remaining row should trace to a real local register.
SELECT ic.name AS industry, mi.menu_label, lr.label AS source_register
FROM public.industry_pack_menu_items ipmi
JOIN public.industry_packs ip ON ip.id = ipmi.industry_pack_id
JOIN public.industry_categories ic ON ic.id = ip.industry_category_id
JOIN public.menu_items mi ON mi.id = ipmi.menu_item_id
LEFT JOIN public.local_registers lr ON mi.route_path = '/platform/local-registers/' || lr.id::text
ORDER BY ic.name, mi.menu_label;
