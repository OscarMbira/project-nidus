-- =============================================================================
-- SUPERSEDED — DO NOT RUN.
--
-- This script hand-rolled pm_template_nodes/form_templates rows directly, bypassing the
-- real publish pipeline (admin.global_template_library -> admin.publish_global_template ->
-- public.sync_global_template_node). Rows created this way have no source_global_template_id
-- link, are invisible to Admin, and don't match how form_templates content is actually keyed
-- (by payload.template_code via sync_global_template_node's _sync_global_form_template_catalog
-- helper, not an ad-hoc sequential F0xx counter as this file assumed).
--
-- Corrected approach: project-nidus-admin/SQL/v198_standards_based_global_template_clone.sql
-- (clones admin.global_template_library rows + calls admin.publish_global_template for each,
-- the same path a real admin Publish action takes). See projectplan/v827_standards_based_form_template_parity_plan.md
-- for the full history of why this file was abandoned.
-- =============================================================================

-- =============================================================================
-- v828: Clone Structured Global form_template masters as Standards-Based
-- Plan: projectplan/v827_standards_based_form_template_parity_plan.md
--
-- Standards-Based methodology never got a real template catalog the way Structured and
-- Agile did (SQL/v786_structured_agile_form_template_seeds.sql) — the Global Template Library
-- shows "0 of 410 templates" whenever filtered to Standards-Based. The original PMBOK-specific
-- content (F001-F068, backfilled to methodology='pmbok'->'standards_based' by Admin's
-- v185c/v196) could not be recovered from any SQL file in either repo — it was never captured
-- in a versioned migration, only ever created live through the Admin app UI. This clones the
-- existing Structured masters as Standards-Based siblings instead: same generic content,
-- re-tagged, giving Standards-Based full catalog parity.
--
-- Scope: form_template domain only (Business Case, Checkpoint Report, Benefits Review Plan,
-- etc.). process_template ("Closing Process Master" family) deliberately NOT attempted here —
-- it's spread across ~24 different tables via a polymorphic process_template_node_links
-- lookup; too much risk of an unverified migration touching that many table shapes without
-- live DB access to test against. Follow-up, not this pass.
--
-- pm_template_nodes.account_id is NOT NULL — Global masters are duplicated PER ACCOUNT, not a
-- shared singleton — so this loops over every account that currently has a Structured row.
--
-- Idempotent: skips any (account_id, tier, computed name) combination that already has a
-- current Standards-Based clone, so safe to re-run.
-- Prerequisites: v764 (pm_template_nodes), v785 (methodology column), v798 (standards_based
-- literal), v786 (form_templates rows to clone from)
-- =============================================================================

-- ============================================================
-- public schema
-- ============================================================
DO $$
DECLARE
  r RECORD;
  v_new_name TEXT;
  v_new_form_name TEXT;
  v_next_num INT;
  v_new_code TEXT;
  v_new_form_id UUID;
  v_new_node_id UUID;
  v_cloned INT := 0;
  v_skipped INT := 0;
BEGIN
  FOR r IN
    SELECT n.id, n.account_id, n.tier, n.domain, n.scope_entity_type, n.scope_entity_id,
           n.name, n.description, n.category, n.status, n.created_by, n.domain_ref_id,
           f.name AS form_name, f.process_group AS form_process_group, f.is_active AS form_is_active
    FROM public.pm_template_nodes n
    JOIN public.form_templates f ON f.id = n.domain_ref_id
    WHERE n.is_system_synced = TRUE
      AND n.is_current = TRUE
      AND n.methodology = 'structured'
      AND n.domain = 'form_template'
  LOOP
    v_new_name := REPLACE(r.name, '(Structured)', '(Standards-Based)');

    IF EXISTS (
      SELECT 1 FROM public.pm_template_nodes existing
      WHERE existing.is_system_synced = TRUE
        AND existing.is_current = TRUE
        AND existing.methodology = 'standards_based'
        AND existing.domain = 'form_template'
        AND existing.account_id = r.account_id
        AND existing.tier = r.tier
        AND existing.name = v_new_name
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Skip templates with no current version content rather than clone an empty form.
    IF NOT EXISTS (
      SELECT 1 FROM public.form_template_versions
      WHERE template_id = r.domain_ref_id AND is_current = TRUE
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    SELECT COALESCE(MAX((regexp_match(template_code, '^F(\d+)$'))[1]::int), 0) + 1
      INTO v_next_num
      FROM public.form_templates;
    v_new_code := 'F' || LPAD(v_next_num::text, 3, '0');
    v_new_form_name := REPLACE(r.form_name, '(Structured)', '(Standards-Based)');

    INSERT INTO public.form_templates (template_code, name, process_group, is_active)
    VALUES (v_new_code, v_new_form_name, r.form_process_group, r.form_is_active)
    RETURNING id INTO v_new_form_id;

    INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
    SELECT v_new_form_id, 1, schema, TRUE
    FROM public.form_template_versions
    WHERE template_id = r.domain_ref_id AND is_current = TRUE
    LIMIT 1;

    INSERT INTO public.pm_template_nodes (
      account_id, tier, domain, domain_ref_id, parent_node_id,
      scope_entity_type, scope_entity_id, name, description, category,
      status, version, is_current, is_system_synced, methodology, created_by
    )
    VALUES (
      r.account_id, r.tier, r.domain, v_new_form_id, NULL,
      r.scope_entity_type, r.scope_entity_id, v_new_name, r.description, r.category,
      r.status, 1, TRUE, TRUE, 'standards_based', r.created_by
    )
    RETURNING id INTO v_new_node_id;

    UPDATE public.form_templates SET pm_template_node_id = v_new_node_id WHERE id = v_new_form_id;

    v_cloned := v_cloned + 1;
  END LOOP;

  RAISE NOTICE 'public: cloned % Standards-Based form_template masters, skipped % (already existed or no content)', v_cloned, v_skipped;
END $$;

-- ============================================================
-- sim schema
-- ============================================================
DO $$
DECLARE
  r RECORD;
  v_new_name TEXT;
  v_new_form_name TEXT;
  v_next_num INT;
  v_new_code TEXT;
  v_new_form_id UUID;
  v_new_node_id UUID;
  v_cloned INT := 0;
  v_skipped INT := 0;
BEGIN
  FOR r IN
    SELECT n.id, n.account_id, n.tier, n.domain, n.scope_entity_type, n.scope_entity_id,
           n.name, n.description, n.category, n.status, n.created_by, n.domain_ref_id,
           f.name AS form_name, f.process_group AS form_process_group, f.is_active AS form_is_active
    FROM sim.pm_template_nodes n
    JOIN sim.form_templates f ON f.id = n.domain_ref_id
    WHERE n.is_system_synced = TRUE
      AND n.is_current = TRUE
      AND n.methodology = 'structured'
      AND n.domain = 'form_template'
  LOOP
    v_new_name := REPLACE(r.name, '(Structured)', '(Standards-Based)');

    IF EXISTS (
      SELECT 1 FROM sim.pm_template_nodes existing
      WHERE existing.is_system_synced = TRUE
        AND existing.is_current = TRUE
        AND existing.methodology = 'standards_based'
        AND existing.domain = 'form_template'
        AND existing.account_id = r.account_id
        AND existing.tier = r.tier
        AND existing.name = v_new_name
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM sim.form_template_versions
      WHERE template_id = r.domain_ref_id AND is_current = TRUE
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    SELECT COALESCE(MAX((regexp_match(template_code, '^F(\d+)$'))[1]::int), 0) + 1
      INTO v_next_num
      FROM sim.form_templates;
    v_new_code := 'F' || LPAD(v_next_num::text, 3, '0');
    v_new_form_name := REPLACE(r.form_name, '(Structured)', '(Standards-Based)');

    INSERT INTO sim.form_templates (template_code, name, process_group, is_active)
    VALUES (v_new_code, v_new_form_name, r.form_process_group, r.form_is_active)
    RETURNING id INTO v_new_form_id;

    INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
    SELECT v_new_form_id, 1, schema, TRUE
    FROM sim.form_template_versions
    WHERE template_id = r.domain_ref_id AND is_current = TRUE
    LIMIT 1;

    INSERT INTO sim.pm_template_nodes (
      account_id, tier, domain, domain_ref_id, parent_node_id,
      scope_entity_type, scope_entity_id, name, description, category,
      status, version, is_current, is_system_synced, methodology, created_by
    )
    VALUES (
      r.account_id, r.tier, r.domain, v_new_form_id, NULL,
      r.scope_entity_type, r.scope_entity_id, v_new_name, r.description, r.category,
      r.status, 1, TRUE, TRUE, 'standards_based', r.created_by
    )
    RETURNING id INTO v_new_node_id;

    UPDATE sim.form_templates SET pm_template_node_id = v_new_node_id WHERE id = v_new_form_id;

    v_cloned := v_cloned + 1;
  END LOOP;

  RAISE NOTICE 'sim: cloned % Standards-Based form_template masters, skipped % (already existed or no content)', v_cloned, v_skipped;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'v828_standards_based_form_template_clone.sql applied';
END $$;
