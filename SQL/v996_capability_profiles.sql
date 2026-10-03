-- ============================================================================
-- v996: Capability Profiles — Phase 6 of v982 SaaS User Journey (brief §12)
-- ============================================================================
-- projectplan/v982_phase6_capability_profiles_plan.md, task A.
--
-- Layers a new tiered "Capability Profile" concept on top of (not replacing) v918's existing
-- industry_packs/industry_pack_menu_items entitlement model. Per the plan's own decisions
-- (accepted by default per user authorization):
--   1. Tier names: Essential / Standard / Advanced / Comprehensive — "Comprehensive" instead of
--      the brief's suggested "Enterprise", which collides with the already-shipped
--      subscription_plans.plan_type = 'enterprise' value (an unrelated concept).
--   2. Scope: menu-visibility gating ONLY, exactly like industry packs. No new feature-flag
--      enforcement layer — reuses the existing organisation_disabled_capabilities override
--      mechanism (v920) end to end, per task B.
--   3. A profile is a one-time bulk-set starting point, not an ongoing enforced ceiling — an org
--      can freely diverge item-by-item afterward via the same existing capability toggle UI.
--
-- STRUCTURAL HONESTY NOTE (read before adjusting seed content): organisation_disabled_
-- capabilities.industry_pack_menu_item_id REFERENCES industry_pack_menu_items(id) — it can only
-- disable a menu item that is reachable through SOME industry pack the account has selected.
-- A Capability Profile therefore can only CURATE (show/hide within) the set of menu items an
-- account's industry packs already make reachable — it cannot grant visibility into a menu item
-- outside any of the account's selected industry packs (there is deliberately no "enable outside
-- my packs" mechanism, per v920's own design — this phase does not add one, per decision 2).
-- capability_profile_menu_items is therefore an INDUSTRY-AGNOSTIC tier classification (keyed by
-- raw menu_item_id, not by industry_pack_menu_items.id, since the same menu item can appear in
-- several packs) — applyProfileToAccount() (capabilityProfileService.js) reconciles it against
-- whichever of those items the account can actually reach.
--
-- Prerequisites: public.menu_items, public.industry_pack_menu_items (v920), public.accounts.
-- ============================================================================

-- ── 1. capability_profiles ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.capability_profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_code    VARCHAR(30) UNIQUE NOT NULL,
  tier_name    VARCHAR(100) NOT NULL,
  tier_order   INTEGER NOT NULL,
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.capability_profiles IS
  'v996/v982 Phase 6: the 4 Capability Profile tiers (Essential/Standard/Advanced/Comprehensive) '
  '— an organisational default starting point (PRD decision 3: bulk-set once, not an ongoing '
  'ceiling), purely organisational (PRD Phase 6 open decision 8: no subscription-tier gating, '
  'consistent with industry_packs'' own free/ungated precedent, v920).';

CREATE UNIQUE INDEX IF NOT EXISTS uq_capability_profiles_tier_order ON public.capability_profiles(tier_order);

INSERT INTO public.capability_profiles (tier_code, tier_name, tier_order, description, is_active)
VALUES
  ('essential', 'Essential', 1, 'The core basics — dashboard, projects, tasks, teams, and calendar. Best for a small team or a first project.', TRUE),
  ('standard', 'Standard', 2, 'Essential plus delivery controls: planning, RAID, stakeholders, documents, and reports. Best for a typical, actively-managed project.', TRUE),
  ('advanced', 'Advanced', 3, 'Standard plus organisation-wide coordination: change control, resources, cost management, governance, testing, and closure. Best for a maturing PMO.', TRUE),
  ('comprehensive', 'Comprehensive', 4, 'Everything Advanced includes, plus every remaining capability across all of your selected industries. Best for a full-scope PMO.', TRUE)
ON CONFLICT (tier_code) DO UPDATE SET
  tier_name = EXCLUDED.tier_name,
  tier_order = EXCLUDED.tier_order,
  description = EXCLUDED.description,
  is_active = TRUE,
  updated_at = NOW();

-- ── 2. capability_profile_menu_items ─────────────────────────────────────────
-- Industry-agnostic tier classification, keyed by raw menu_item_id (see header note).

CREATE TABLE IF NOT EXISTS public.capability_profile_menu_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capability_profile_id UUID NOT NULL REFERENCES public.capability_profiles(id) ON DELETE CASCADE,
  menu_item_id          UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.capability_profile_menu_items IS
  'v996/v982 Phase 6: which menu_items belong to a Capability Profile tier''s default set. '
  'Mirrors industry_pack_menu_items'' join shape (task A) but keys by raw menu_item_id, not an '
  'industry_pack_menu_items.id — a profile''s tier classification is industry-agnostic (the same '
  'menu item can appear in several industry packs at once).';

CREATE UNIQUE INDEX IF NOT EXISTS uq_capability_profile_menu_items_profile_item
  ON public.capability_profile_menu_items(capability_profile_id, menu_item_id);
CREATE INDEX IF NOT EXISTS idx_capability_profile_menu_items_profile
  ON public.capability_profile_menu_items(capability_profile_id);
CREATE INDEX IF NOT EXISTS idx_capability_profile_menu_items_item
  ON public.capability_profile_menu_items(menu_item_id);

-- ── 3. accounts.capability_profile_id ────────────────────────────────────────

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS capability_profile_id UUID REFERENCES public.capability_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS capability_profile_applied_at TIMESTAMPTZ;
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS capability_profile_applied_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.accounts.capability_profile_id IS
  'v996/v982 Phase 6: the Capability Profile this account last applied as a starting point. '
  'Purely informational/bulk-set (PRD decision 3) — NOT an enforced ceiling; the account''s real '
  'menu visibility is still organisation_disabled_capabilities (v920), which the org can freely '
  'diverge from item-by-item after applying a profile. NULL = no profile ever applied.';
COMMENT ON COLUMN public.accounts.capability_profile_applied_at IS
  'v996/v982 Phase 6: when capability_profile_id was last set — the Audit tab on the Capability '
  'Profile picker page reads this (rule 63.1: an account-level state change worth an audit trail).';
COMMENT ON COLUMN public.accounts.capability_profile_applied_by IS
  'v996/v982 Phase 6: who last applied a capability profile to this account.';

-- ── 4. RLS ──────────────────────────────────────────────────────────────────────
-- Reference data, same broad-read shape as industry_packs (v920) — no direct-client write
-- policy; capabilityProfileService.js's applyProfileToAccount() writes only through the existing
-- toggle_organisation_capability RPC (v920) against organisation_disabled_capabilities, never
-- directly against these two new tables (which are fixed reference content, not per-account data).

ALTER TABLE public.capability_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capability_profile_menu_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.capability_profiles TO authenticated, anon;
GRANT SELECT ON public.capability_profile_menu_items TO authenticated;
GRANT ALL ON public.capability_profiles TO service_role;
GRANT ALL ON public.capability_profile_menu_items TO service_role;

DROP POLICY IF EXISTS policy_capability_profiles_select_all ON public.capability_profiles;
CREATE POLICY policy_capability_profiles_select_all
  ON public.capability_profiles FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS policy_capability_profile_menu_items_authenticated_read ON public.capability_profile_menu_items;
CREATE POLICY policy_capability_profile_menu_items_authenticated_read
  ON public.capability_profile_menu_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.capability_profiles p
      WHERE p.id = capability_profile_menu_items.capability_profile_id AND p.is_active = TRUE
    )
  );

-- ── 5. database_tables registry (mandatory) ─────────────────────────────────────

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('capability_profiles', 'The 4 Capability Profile tiers (Essential/Standard/Advanced/Comprehensive) an org can apply as a menu-visibility starting point (v982 Phase 6)', false, true),
  ('capability_profile_menu_items', 'Which menu_items belong to each Capability Profile tier''s default set (v982 Phase 6)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v996_capability_profiles.sql applied successfully'; END $$;
