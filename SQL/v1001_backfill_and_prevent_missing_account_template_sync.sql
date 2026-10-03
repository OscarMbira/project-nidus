-- v1001_backfill_and_prevent_missing_account_template_sync.sql
--
-- Root cause: public.sync_global_template_node() (v765, latest redefinition v798) loops over
-- every account that exists AT THE TIME it runs. It has no mechanism to catch up an account
-- created AFTER the last Admin "publish" — that account simply never gets any is_system_synced
-- rows in pm_template_nodes, so its Template Library page shows "No templates yet" even though
-- Admin has genuinely published templates.
--
-- Confirmed live (2026-09-03): all 434 public.pm_template_nodes rows (and the mirrored sim.*
-- rows) with is_system_synced=true belong to exactly ONE account (created 2025-12-16, before the
-- last sync run on 2026-07-31). Two later accounts (created 2026-08-20 and 2026-09-03) have zero.
--
-- Fix, two parts:
--   1) public.sync_global_templates_to_account(p_target_account_id, p_reference_account_id) —
--      reusable function: clones every is_system_synced=true node (both public and sim schema)
--      from a reference account (defaults to whichever account currently has the most synced
--      rows) onto the target account, via the existing, already-tested per-account helper
--      public._sync_global_template_node_for_account() — so it inherits that helper's exact
--      idempotent insert-or-update behaviour and its 'fields'-domain field-link materialisation,
--      just reconstructing the payload JSONB from the reference account's own already-correct
--      pm_template_field_links + custom_field_definitions rows instead of Admin's original
--      publish-time payload (which isn't stored anywhere outside admin.global_template_library,
--      a separate repo's schema).
--   2) A one-time backfill applying it now to every account with zero synced rows.
--
-- Prevention (in application code, not this file): organisationService.js's createOrganisation()
-- now calls this RPC right after account creation, so no future signup can end up in this state
-- again. See apps/platform/src/services/organisationService.js and the Simulator mirror.

CREATE OR REPLACE FUNCTION public.sync_global_templates_to_account(
    p_target_account_id UUID,
    p_reference_account_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sim
AS $$
DECLARE
    v_reference_account UUID := p_reference_account_id;
    v_node RECORD;
    v_payload JSONB;
    v_public_count INTEGER := 0;
    v_sim_count INTEGER := 0;
BEGIN
    IF p_target_account_id IS NULL THEN
        RAISE EXCEPTION 'target_account_id is required';
    END IF;

    IF v_reference_account IS NULL THEN
        SELECT account_id INTO v_reference_account
        FROM public.pm_template_nodes
        WHERE is_system_synced = TRUE AND is_current = TRUE
        GROUP BY account_id
        ORDER BY COUNT(*) DESC
        LIMIT 1;
    END IF;

    IF v_reference_account IS NULL OR v_reference_account = p_target_account_id THEN
        -- Nothing published yet anywhere, or the target IS the reference — nothing to do.
        RETURN jsonb_build_object(
            'target_account_id', p_target_account_id,
            'reference_account_id', v_reference_account,
            'public_synced', 0,
            'sim_synced', 0,
            'skipped', TRUE
        );
    END IF;

    -- public schema
    FOR v_node IN
        SELECT * FROM public.pm_template_nodes
        WHERE account_id = v_reference_account
          AND is_system_synced = TRUE
          AND is_current = TRUE
          AND source_global_template_id IS NOT NULL
    LOOP
        v_payload := NULL;
        IF v_node.domain = 'fields' THEN
            SELECT jsonb_agg(jsonb_build_object(
                'field_code', cfd.field_code,
                'label', COALESCE(fl.label_override, cfd.label),
                'description', cfd.description,
                'guidance_text', fl.guidance_text_override,
                'field_type', cfd.field_type,
                'validation_rules', cfd.validation_rules,
                'display_order', fl.display_order,
                'required', fl.required_override,
                'default_value', fl.default_value_override
            ) ORDER BY fl.display_order)
            INTO v_payload
            FROM public.pm_template_field_links fl
            JOIN public.custom_field_definitions cfd ON cfd.id = fl.custom_field_definition_id
            WHERE fl.node_id = v_node.id AND COALESCE(fl.is_local, FALSE) = FALSE;
        END IF;

        PERFORM public._sync_global_template_node_for_account(
            'public', p_target_account_id, v_node.source_global_template_id, v_node.domain,
            v_node.name, v_node.description, v_node.category, v_node.version,
            v_payload, v_node.domain_ref_id, v_node.methodology
        );
        v_public_count := v_public_count + 1;
    END LOOP;

    -- sim schema (mirrors the original outer sync's dual-schema write)
    FOR v_node IN
        SELECT * FROM sim.pm_template_nodes
        WHERE account_id = v_reference_account
          AND is_system_synced = TRUE
          AND is_current = TRUE
          AND source_global_template_id IS NOT NULL
    LOOP
        v_payload := NULL;
        IF v_node.domain = 'fields' THEN
            SELECT jsonb_agg(jsonb_build_object(
                'field_code', cfd.field_code,
                'label', COALESCE(fl.label_override, cfd.label),
                'description', cfd.description,
                'guidance_text', fl.guidance_text_override,
                'field_type', cfd.field_type,
                'validation_rules', cfd.validation_rules,
                'display_order', fl.display_order,
                'required', fl.required_override,
                'default_value', fl.default_value_override
            ) ORDER BY fl.display_order)
            INTO v_payload
            FROM sim.pm_template_field_links fl
            JOIN sim.custom_field_definitions cfd ON cfd.id = fl.custom_field_definition_id
            WHERE fl.node_id = v_node.id AND COALESCE(fl.is_local, FALSE) = FALSE;
        END IF;

        PERFORM public._sync_global_template_node_for_account(
            'sim', p_target_account_id, v_node.source_global_template_id, v_node.domain,
            v_node.name, v_node.description, v_node.category, v_node.version,
            v_payload, v_node.domain_ref_id, v_node.methodology
        );
        v_sim_count := v_sim_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'target_account_id', p_target_account_id,
        'reference_account_id', v_reference_account,
        'public_synced', v_public_count,
        'sim_synced', v_sim_count,
        'skipped', FALSE
    );
END;
$$;

COMMENT ON FUNCTION public.sync_global_templates_to_account IS
    'Clones every is_system_synced global template (public + sim schema) from a reference '
    'account onto a target account. Used (a) to backfill an account created after the last '
    'Admin publish, and (b) called from organisationService.js right after every new account '
    'is created, so this gap can never reopen for future signups.';

GRANT EXECUTE ON FUNCTION public.sync_global_templates_to_account(UUID, UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- One-time backfill: every account with zero synced rows today catches up now.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_target RECORD;
    v_result JSONB;
BEGIN
    FOR v_target IN
        SELECT a.id, a.account_name
        FROM public.accounts a
        WHERE COALESCE(a.is_deleted, FALSE) = FALSE
          AND NOT EXISTS (
              SELECT 1 FROM public.pm_template_nodes n
              WHERE n.account_id = a.id AND n.is_system_synced = TRUE
          )
    LOOP
        v_result := public.sync_global_templates_to_account(v_target.id);
        RAISE NOTICE 'Backfilled account % (%): %', v_target.account_name, v_target.id, v_result;
    END LOOP;
END;
$$;
