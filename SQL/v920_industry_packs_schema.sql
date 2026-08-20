-- ============================================================================
-- v920: SaaS Industry-Aware Tenant Provisioning — Phase 1c (industry_packs schema)
-- ============================================================================
-- See projectprd/v918_saas_industry_tenant_provisioning_PRD.md, decisions 6-8, 11-13.
--
-- An Industry Pack is a curated set of menu_items + descriptive feature labels associated
-- with one industry. Kept as its own table (not folded into industry_categories) per the
-- brief's target model (section 27) — a pack can be toggled active independently of the
-- industry taxonomy itself, and could in principle diverge from a strict 1:1 with industries
-- later without a schema change now.
--
-- organisation_disabled_capabilities: the ONLY organisation-level override this phase
-- supports (PRD decision 7) — an org can turn OFF a pack item it doesn't want. There is no
-- "enable outside my industry packs" table; that was explicitly not approved.
--
-- tenant_provisioning_log: audit trail for the provisioning RPC (v923) — every
-- assign-industry / assign-generic-pack / assign-industry-pack / assign-default-roles step
-- gets a row, so provisioning is inspectable and retry-safe (brief section 29-30).
-- Prerequisites: v918 (account_industries), v906 (industry_categories), v05 (menu_items),
-- v903 (user_can_manage_org_roles)
-- ============================================================================

-- ── 1. industry_packs ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.industry_packs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_category_id UUID NOT NULL REFERENCES public.industry_categories(id) ON DELETE CASCADE,
  pack_code            VARCHAR(50) UNIQUE NOT NULL,
  pack_name            VARCHAR(150) NOT NULL,
  description          TEXT,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by           UUID REFERENCES public.users(id),
  updated_at           TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by           UUID REFERENCES public.users(id)
);

COMMENT ON TABLE public.industry_packs IS
  'v918/v920: a curated set of menu_items + descriptive feature labels for one industry. One '
  'pack per industry_categories row for v1 (including the General Project Management / '
  'Cross-Industry fallback pack), not schema-enforced to stay 1:1. Free for every subscription '
  'tier in this phase (PRD decision 8) — no plan-gating column exists yet by design, so a '
  'future tier requirement can be added without a redesign.';

CREATE INDEX IF NOT EXISTS idx_industry_packs_industry_category
  ON public.industry_packs(industry_category_id) WHERE is_active = TRUE;

ALTER TABLE public.industry_packs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.industry_packs TO authenticated, anon;
GRANT ALL ON public.industry_packs TO service_role;

DROP POLICY IF EXISTS policy_industry_packs_select_all ON public.industry_packs;
CREATE POLICY policy_industry_packs_select_all
  ON public.industry_packs FOR SELECT
  USING (is_active = TRUE);

-- ── 2. industry_pack_menu_items ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.industry_pack_menu_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_pack_id UUID NOT NULL REFERENCES public.industry_packs(id) ON DELETE CASCADE,
  menu_item_id     UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.industry_pack_menu_items IS
  'v918/v920: which menu_items an industry pack makes available. Consumed by the Phase 4 '
  'runtime menu-resolution layer (useMenu.js) — an org sees an item only if it is in Core, '
  'Generic PM, or one of its selected industries'' packs (minus organisation_disabled_capabilities), '
  'AND the user''s role separately grants it via role_menu_items. This table alone is never '
  'sufficient to show a menu item to a specific user.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_industry_pack_menu_items_pack_item
  ON public.industry_pack_menu_items(industry_pack_id, menu_item_id);
CREATE INDEX IF NOT EXISTS idx_industry_pack_menu_items_pack
  ON public.industry_pack_menu_items(industry_pack_id);
CREATE INDEX IF NOT EXISTS idx_industry_pack_menu_items_menu_item
  ON public.industry_pack_menu_items(menu_item_id);

ALTER TABLE public.industry_pack_menu_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.industry_pack_menu_items TO authenticated;
GRANT ALL ON public.industry_pack_menu_items TO service_role;

DROP POLICY IF EXISTS policy_industry_pack_menu_items_authenticated_read ON public.industry_pack_menu_items;
CREATE POLICY policy_industry_pack_menu_items_authenticated_read
  ON public.industry_pack_menu_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.industry_packs p
      WHERE p.id = industry_pack_menu_items.industry_pack_id AND p.is_active = TRUE
    )
  );

-- ── 3. industry_pack_features ────────────────────────────────────────────────
-- Descriptive only in this phase (no gating logic reads this) — used for the "Your workspace
-- includes" onboarding summary (Phase 9) and the capability-configuration UI's labels
-- (Phase 7), so a pack's menu items can be grouped/labelled as human-readable capabilities
-- rather than raw menu-item names.

CREATE TABLE IF NOT EXISTS public.industry_pack_features (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_pack_id UUID NOT NULL REFERENCES public.industry_packs(id) ON DELETE CASCADE,
  feature_key      VARCHAR(100) NOT NULL,
  feature_label    VARCHAR(150) NOT NULL,
  display_order    INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.industry_pack_features IS
  'v918/v920: human-readable capability labels for a pack (e.g. "Data Migration", "Cutover") '
  'used in onboarding copy and the capability-configuration UI. Descriptive only — not read by '
  'any authorization or menu-resolution logic.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_industry_pack_features_pack_key
  ON public.industry_pack_features(industry_pack_id, feature_key);

ALTER TABLE public.industry_pack_features ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.industry_pack_features TO authenticated, anon;
GRANT ALL ON public.industry_pack_features TO service_role;

DROP POLICY IF EXISTS policy_industry_pack_features_select_all ON public.industry_pack_features;
CREATE POLICY policy_industry_pack_features_select_all
  ON public.industry_pack_features FOR SELECT
  USING (true);

-- ── 4. organisation_disabled_capabilities ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organisation_disabled_capabilities (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  industry_pack_menu_item_id UUID NOT NULL REFERENCES public.industry_pack_menu_items(id) ON DELETE CASCADE,
  disabled_at               TIMESTAMP NOT NULL DEFAULT NOW(),
  disabled_by               UUID REFERENCES public.users(id)
);

COMMENT ON TABLE public.organisation_disabled_capabilities IS
  'v918/v920: an organisation opting OUT of a specific industry-pack menu item (PRD decision 7 '
  '— disable-only; there is deliberately no matching "enable outside my packs" table). Writes '
  'go through a dedicated RPC gated by the same authorization tier as other org-config '
  'screens, not direct client inserts (rule 42).';

CREATE UNIQUE INDEX IF NOT EXISTS uq_org_disabled_capabilities_account_item
  ON public.organisation_disabled_capabilities(account_id, industry_pack_menu_item_id);
CREATE INDEX IF NOT EXISTS idx_org_disabled_capabilities_account
  ON public.organisation_disabled_capabilities(account_id);

ALTER TABLE public.organisation_disabled_capabilities ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.organisation_disabled_capabilities TO authenticated;
GRANT ALL ON public.organisation_disabled_capabilities TO service_role;

DROP POLICY IF EXISTS policy_org_disabled_capabilities_authenticated_read ON public.organisation_disabled_capabilities;
CREATE POLICY policy_org_disabled_capabilities_authenticated_read
  ON public.organisation_disabled_capabilities FOR SELECT TO authenticated
  USING (true);

-- ── 5. tenant_provisioning_log ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tenant_provisioning_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  step       VARCHAR(50) NOT NULL,
  status     VARCHAR(20) NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  detail     JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tenant_provisioning_log IS
  'v918/v920: audit trail for provision_organisation_tenant() (v923) — one row per '
  'provisioning step (assign_industry, assign_generic_pack, assign_industry_packs, '
  'assign_default_roles, complete), so provisioning is inspectable, retry-safe, and never '
  'silently marks an org provisioned if a step failed (brief section 29-30).';

CREATE INDEX IF NOT EXISTS idx_tenant_provisioning_log_account
  ON public.tenant_provisioning_log(account_id, created_at);

ALTER TABLE public.tenant_provisioning_log ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.tenant_provisioning_log TO authenticated;
GRANT ALL ON public.tenant_provisioning_log TO service_role;

-- Readable by the account's own admins only (unlike the broad-read tables above, this is an
-- operational audit log, not reference/config data) — reuses user_can_manage_org_roles()
-- (v903) as the same authorization tier that already manages other org-config surfaces.
DROP POLICY IF EXISTS policy_tenant_provisioning_log_account_admin_read ON public.tenant_provisioning_log;
CREATE POLICY policy_tenant_provisioning_log_account_admin_read
  ON public.tenant_provisioning_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND public.user_can_manage_org_roles(u.id, tenant_provisioning_log.account_id)
    )
  );

-- ── 6. Database table registration (mandatory) ──────────────────────────────

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('industry_packs', 'A curated set of menu items + feature labels for one industry (v918/v920)', false, true),
  ('industry_pack_menu_items', 'Which menu_items an industry pack makes available (v918/v920)', false, true),
  ('industry_pack_features', 'Human-readable capability labels for a pack, descriptive only (v918/v920)', false, true),
  ('organisation_disabled_capabilities', 'An organisation opting out of a specific industry-pack menu item (v918/v920)', false, true),
  ('tenant_provisioning_log', 'Audit trail for the tenant provisioning RPC (v918/v920)', true, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v920: industry_packs + industry_pack_menu_items + industry_pack_features + organisation_disabled_capabilities + tenant_provisioning_log installed';
END $$;
