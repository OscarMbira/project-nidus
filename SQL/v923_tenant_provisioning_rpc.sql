-- ============================================================================
-- v923: SaaS Industry-Aware Tenant Provisioning — Phase 3 (provisioning RPC)
-- ============================================================================
-- See projectprd/v918_saas_industry_tenant_provisioning_PRD.md, decisions 1-3, 6, 11.
--
-- provision_organisation_tenant() is the SINGLE authoritative write path for an account's
-- industry selection — used both for initial provisioning right after registration AND for
-- later changes via Organisation Settings (Phase 7). Re-provisioning IS the retry/update path;
-- there is no separate update_account_industries() RPC (that was sketched in this plan's
-- "Naming decided" section before this file was written and has been superseded by this —
-- see the plan's own Phase 3 note: "re-provisioning is exactly 'retry the same idempotent
-- function,' not a special code path").
--
-- Idempotent: account_industries writes are upserts (ON CONFLICT DO UPDATE), never plain
-- inserts — calling this twice with the same inputs produces the same end state, no
-- duplicate rows (brief section 29).
--
-- Fails visibly: no internal exception-swallowing. A bad input or authorization failure
-- raises, which Postgres/PostgREST surfaces as a normal RPC error to the caller — the
-- standard, already-used-throughout-this-codebase way "fails visibly" is satisfied, rather
-- than building bespoke autonomous-transaction audit-logging machinery for partial-failure
-- durability (Postgres has no built-in autonomous transactions; a failed call rolls back
-- everything from that call, including any log rows it would have written — accepted
-- trade-off for this phase).
--
-- Deliberately does NOT write role_menu_items grants: "Assign Generic PM Pack" / "Assign
-- Industry Pack" / "Assign Menu/Capability Access" (brief section 19's provisioning steps)
-- have no data-movement work in this architecture — menu availability is resolved LIVE from
-- account_industries + industry_pack_menu_items at render time (PRD decision 11: the runtime
-- useMenu.js layer, not a provisioning-time grant). "Assign Default Role(s)" is already
-- handled by the existing assignSystemRole() calls in createOrganisation() (account_owner +
-- pmo_admin) — not duplicated here, per "do not replace stable working capabilities
-- unnecessarily."
-- Prerequisites: v918 (account_industries), v903 (user_can_manage_org_roles), v920
-- (tenant_provisioning_log)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.provision_organisation_tenant(
  p_account_id            UUID,
  p_industry_category_ids UUID[],
  p_primary_industry_id   UUID,
  p_industry_segment_ids  UUID[] DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_user_id UUID;
  v_idx            INT;
  v_industry_id    UUID;
  v_segment_id     UUID;
BEGIN
  SELECT id INTO v_caller_user_id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE;
  IF v_caller_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Founder provisioning their own just-created account, OR an admin re-provisioning after an
  -- industry change — same dual-path authorization already used for org-config RPCs.
  IF NOT (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE id = p_account_id AND owner_user_id = v_caller_user_id AND is_deleted = FALSE
    )
    OR public.user_can_manage_org_roles(v_caller_user_id, p_account_id)
  ) THEN
    RAISE EXCEPTION 'You do not have permission to provision this organisation';
  END IF;

  IF p_industry_category_ids IS NULL OR array_length(p_industry_category_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one industry is required';
  END IF;

  IF p_primary_industry_id IS NULL OR NOT (p_primary_industry_id = ANY(p_industry_category_ids)) THEN
    RAISE EXCEPTION 'Primary industry must be one of the selected industries';
  END IF;

  IF p_industry_segment_ids IS NOT NULL
     AND array_length(p_industry_segment_ids, 1) != array_length(p_industry_category_ids, 1) THEN
    RAISE EXCEPTION 'p_industry_segment_ids must be the same length as p_industry_category_ids (use NULL entries for industries with no segment chosen)';
  END IF;

  -- Clear the old primary flag from any industry that's no longer the primary (covers the
  -- re-provisioning/industry-change case, not just first-time provisioning).
  UPDATE account_industries
  SET is_primary = FALSE
  WHERE account_id = p_account_id
    AND is_primary = TRUE
    AND industry_category_id != p_primary_industry_id;

  FOR v_idx IN 1 .. array_length(p_industry_category_ids, 1) LOOP
    v_industry_id := p_industry_category_ids[v_idx];
    v_segment_id := CASE WHEN p_industry_segment_ids IS NOT NULL THEN p_industry_segment_ids[v_idx] ELSE NULL END;

    IF v_segment_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM industry_segments
      WHERE id = v_segment_id AND industry_category_id = v_industry_id AND is_active = TRUE
    ) THEN
      RAISE EXCEPTION 'Industry segment % does not belong to industry %', v_segment_id, v_industry_id;
    END IF;

    INSERT INTO account_industries (account_id, industry_category_id, industry_segment_id, is_primary, added_by)
    VALUES (p_account_id, v_industry_id, v_segment_id, v_industry_id = p_primary_industry_id, v_caller_user_id)
    ON CONFLICT (account_id, industry_category_id) DO UPDATE
      SET is_primary = EXCLUDED.is_primary,
          industry_segment_id = EXCLUDED.industry_segment_id;
  END LOOP;

  -- Remove account_industries rows for industries that were deselected in this call (covers
  -- the industry-change/re-provisioning case — a fresh call fully replaces the selection).
  DELETE FROM account_industries
  WHERE account_id = p_account_id
    AND NOT (industry_category_id = ANY(p_industry_category_ids));

  INSERT INTO tenant_provisioning_log (account_id, step, status, detail)
  VALUES (
    p_account_id, 'complete', 'completed',
    jsonb_build_object(
      'industry_category_ids', p_industry_category_ids,
      'primary_industry_id', p_primary_industry_id,
      'note', 'menu/capability access resolved live per PRD decision 11; default roles handled by existing assignSystemRole() calls, not duplicated here'
    )
  );

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.provision_organisation_tenant(UUID, UUID[], UUID, UUID[]) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'v923: provision_organisation_tenant() installed';
END $$;
