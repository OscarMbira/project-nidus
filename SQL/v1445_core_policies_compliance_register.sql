-- ============================================================================
-- v1445: Policies & Compliance → register engine (Core PM wave 3)
-- ============================================================================
-- PRD/plan v1340, wave 3 (decisions D3, D4; CLAUDE.md rule 74 — a thin hand-built form moves to the
-- register engine). Prerequisite: v1444 (adds scope 'organisation' and the organisation isolation
-- policy). Run v1444 first.
--
-- 1. System register core_policies_compliance, scope 'organisation' (every member of an organisation
--    may read and add policies, as before; each record is limited to its own organisation by v1444).
--    Tabs: Details · Scope & Applicability · Requirements & Controls · Review & Attestation · Notes.
--    Statuses: Draft · Under Review · Active · Retired.
-- 2. Existing public.policies_compliance rows are copied (same id) to the register under the
--    organisation of the user who created them. Old 'archived' becomes Retired. A category that is
--    not in the new list becomes Other, and the original text is kept in Notes. Rows whose creator
--    has no organisation stay in the old table and are counted at the end.
-- 3. Menu Governance → Policies & Compliance (plat_pm_s_policies) now opens the register.
-- 4. Security fix: the old table let every signed-in user of every organisation read and change
--    every policy. Its policies now allow the creator only. The table is kept (read-only fallback
--    for rollback), not dropped.
-- Platform only: the Simulator has no Policies & Compliance menu. Idempotent.
-- Register id 00000000-0000-4000-9100-000000000001 (Core PM block).
-- ============================================================================

-- ── 1. Register definition ──────────────────────────────────────────────────────
INSERT INTO public.local_registers (id, register_key, label, icon, description, scope_level, account_id, status_workflow, is_system_defined, is_active, created_at, updated_at)
VALUES (
  '00000000-0000-4000-9100-000000000001', 'core_policies_compliance', 'Policies & Compliance', 'file-check',
  'The organisation''s policies, standards and procedures, the controls that enforce them and when each is next reviewed',
  'organisation', NULL,
  '[{"key":"draft","label":"Draft"},{"key":"under_review","label":"Under Review"},{"key":"active","label":"Active"},{"key":"retired","label":"Retired"}]'::jsonb,
  TRUE, TRUE, NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, scope_level = EXCLUDED.scope_level,
  status_workflow = EXCLUDED.status_workflow, is_active = TRUE, updated_at = NOW();

INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9100-000000000001'::uuid, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  -- Details (with Title, Description, Status). The first four are the list columns.
  ('policy_reference', 'Policy Reference', 'text', false, 0, NULL, NULL),
  ('category', 'Category', 'dropdown', true, 1, NULL,
    '[{"value":"governance","label":"Governance"},{"value":"information_security","label":"Information Security"},{"value":"data_protection","label":"Data Protection & Privacy"},{"value":"health_safety","label":"Health & Safety"},{"value":"financial","label":"Financial"},{"value":"procurement","label":"Procurement"},{"value":"people","label":"People / HR"},{"value":"environmental","label":"Environmental"},{"value":"quality","label":"Quality"},{"value":"legal_regulatory","label":"Legal & Regulatory"},{"value":"other","label":"Other"}]'),
  ('policy_owner', 'Policy Owner', 'text', false, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('document_type', 'Document Type', 'dropdown', false, 4, NULL,
    '[{"value":"policy","label":"Policy"},{"value":"standard","label":"Standard"},{"value":"procedure","label":"Procedure"},{"value":"guideline","label":"Guideline"},{"value":"regulation","label":"External Regulation"}]'),
  ('version', 'Version', 'text', false, 5, NULL, NULL),
  ('effective_date', 'Effective Date', 'date', false, 6, NULL, NULL),
  ('approved_by', 'Approved By', 'text', false, 7, NULL, NULL),
  ('approval_date', 'Approval Date', 'date', false, 8, NULL, NULL),

  -- Scope & Applicability
  ('purpose', 'Purpose', 'long_text', false, 9, 'Scope & Applicability', NULL),
  ('applies_to', 'Applies To', 'multi_line', false, 10, 'Scope & Applicability', NULL),
  ('exclusions', 'Exclusions', 'multi_line', false, 11, 'Scope & Applicability', NULL),
  ('regulatory_references', 'Regulatory & Standard References', 'table', false, 12, 'Scope & Applicability',
    '[{"value":"source","label":"Regulation / Standard"},{"value":"clause","label":"Clause"},{"value":"summary","label":"What it requires"}]'),

  -- Requirements & Controls
  ('requirements', 'Requirements', 'multi_line', false, 13, 'Requirements & Controls', NULL),
  ('controls', 'Controls', 'table', false, 14, 'Requirements & Controls',
    '[{"value":"control","label":"Control"},{"value":"owner","label":"Owner"},{"value":"frequency","label":"Frequency","type":"select","options":["Continuous","Daily","Weekly","Monthly","Quarterly","Annually","Per event"]},{"value":"evidence","label":"Evidence"}]'),
  ('exceptions_process', 'Exceptions Process', 'long_text', false, 15, 'Requirements & Controls', NULL),
  ('non_compliance_consequences', 'Consequences of Non-Compliance', 'long_text', false, 16, 'Requirements & Controls', NULL),

  -- Review & Attestation
  ('review_frequency', 'Review Frequency', 'dropdown', false, 17, 'Review & Attestation',
    '[{"value":"quarterly","label":"Quarterly"},{"value":"six_monthly","label":"Every 6 months"},{"value":"annually","label":"Annually"},{"value":"two_yearly","label":"Every 2 years"},{"value":"on_change","label":"When something changes"}]'),
  ('last_review_date', 'Last Review Date', 'date', false, 18, 'Review & Attestation', NULL),
  ('compliance_status', 'Compliance Status', 'dropdown', false, 19, 'Review & Attestation',
    '[{"value":"not_assessed","label":"Not Assessed"},{"value":"compliant","label":"Compliant"},{"value":"partially_compliant","label":"Partially Compliant"},{"value":"non_compliant","label":"Non-Compliant"}]'),
  ('last_assessment_date', 'Last Assessment Date', 'date', false, 20, 'Review & Attestation', NULL),
  ('attestation_required', 'Staff Attestation Required', 'boolean', false, 21, 'Review & Attestation', NULL),
  ('attestation_frequency', 'Attestation Frequency', 'dropdown', false, 22, 'Review & Attestation',
    '[{"value":"on_joining","label":"On joining"},{"value":"annually","label":"Annually"},{"value":"on_change","label":"When the policy changes"}]'),

  -- Notes
  ('related_documents', 'Related Documents', 'table', false, 23, 'Notes',
    '[{"value":"document","label":"Document"},{"value":"reference","label":"Reference"}]'),
  ('version_history', 'Version History', 'table', false, 24, 'Notes',
    '[{"value":"version","label":"Version"},{"value":"date","label":"Date","type":"date"},{"value":"author","label":"Author"},{"value":"change","label":"Change"}]'),
  ('notes', 'Notes', 'long_text', false, 25, 'Notes', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── 2. Copy existing policies (same id) under the creator's organisation ─────────
WITH src AS (
  SELECT pc.*,
    COALESCE(
      (SELECT a.id FROM public.accounts a
        WHERE a.owner_user_id = pc.created_by AND COALESCE(a.is_deleted, FALSE) = FALSE
        ORDER BY a.created_at LIMIT 1),
      (SELECT oi.organisation_id FROM public.organisation_invitations oi
        WHERE oi.invitation_status = 'accepted' AND COALESCE(oi.is_deleted, FALSE) = FALSE
          AND (oi.accepted_by_user_id = pc.created_by OR oi.invited_user_id = pc.created_by)
        ORDER BY oi.created_at LIMIT 1),
      (SELECT p.account_id FROM public.user_roles ur JOIN public.projects p ON p.id = ur.project_id
        WHERE ur.user_id = pc.created_by AND ur.is_active = TRUE AND p.account_id IS NOT NULL
        ORDER BY ur.created_at LIMIT 1)
    ) AS org_id,
    CASE
      WHEN lower(COALESCE(pc.category, '')) LIKE '%secur%' THEN 'information_security'
      WHEN lower(COALESCE(pc.category, '')) LIKE '%privacy%' OR lower(COALESCE(pc.category, '')) LIKE '%data%' THEN 'data_protection'
      WHEN lower(COALESCE(pc.category, '')) LIKE '%health%' OR lower(COALESCE(pc.category, '')) LIKE '%safety%' THEN 'health_safety'
      WHEN lower(COALESCE(pc.category, '')) LIKE '%financ%' THEN 'financial'
      WHEN lower(COALESCE(pc.category, '')) LIKE '%procure%' THEN 'procurement'
      WHEN lower(COALESCE(pc.category, '')) LIKE '%hr%' OR lower(COALESCE(pc.category, '')) LIKE '%people%' OR lower(COALESCE(pc.category, '')) LIKE '%human%' THEN 'people'
      WHEN lower(COALESCE(pc.category, '')) LIKE '%environ%' THEN 'environmental'
      WHEN lower(COALESCE(pc.category, '')) LIKE '%quality%' THEN 'quality'
      WHEN lower(COALESCE(pc.category, '')) LIKE '%legal%' OR lower(COALESCE(pc.category, '')) LIKE '%regulat%' OR lower(COALESCE(pc.category, '')) LIKE '%complian%' THEN 'legal_regulatory'
      WHEN lower(COALESCE(pc.category, '')) LIKE '%govern%' THEN 'governance'
      ELSE 'other'
    END AS category_key
  FROM public.policies_compliance pc
  WHERE COALESCE(pc.is_deleted, FALSE) = FALSE
)
INSERT INTO public.local_register_records
  (id, register_id, display_id, title, description, status, field_values, account_id,
   created_at, created_by, updated_at, updated_by)
SELECT s.id, '00000000-0000-4000-9100-000000000001'::uuid, '', s.policy_name, s.description,
  CASE s.status WHEN 'active' THEN 'active' WHEN 'archived' THEN 'retired' ELSE 'draft' END,
  jsonb_strip_nulls(jsonb_build_object(
    'category', s.category_key,
    'policy_owner', NULLIF(s.compliance_owner, ''),
    'next_review_date', s.review_date::text,
    'requirements', NULLIF(s.requirements, ''),
    'notes', NULLIF(concat_ws(E'\n\n',
                NULLIF(s.notes, ''),
                CASE WHEN s.category_key = 'other' AND NULLIF(s.category, '') IS NOT NULL
                     THEN 'Original category: ' || s.category END), '')
  )),
  s.org_id, COALESCE(s.created_at, NOW()), s.created_by, COALESCE(s.updated_at, NOW()), s.updated_by
FROM src s
WHERE s.org_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- ── 3. Menu: Governance → Policies & Compliance opens the register ──────────────
UPDATE public.menu_items
SET route_path = '/platform/local-registers/00000000-0000-4000-9100-000000000001',
    menu_description = 'The organisation''s policies, standards and procedures, their controls and review dates',
    updated_at = NOW()
WHERE menu_code = 'plat_pm_s_policies';

-- ── 4. Close the old table's cross-organisation access (creator only) ───────────
DROP POLICY IF EXISTS "policies_select" ON public.policies_compliance;
DROP POLICY IF EXISTS "policies_insert" ON public.policies_compliance;
DROP POLICY IF EXISTS "policies_update" ON public.policies_compliance;

CREATE POLICY "policies_select" ON public.policies_compliance FOR SELECT TO authenticated
  USING (is_deleted = FALSE AND created_by IN (SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()));
CREATE POLICY "policies_insert" ON public.policies_compliance FOR INSERT TO authenticated
  WITH CHECK (created_by IN (SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()));
CREATE POLICY "policies_update" ON public.policies_compliance FOR UPDATE TO authenticated
  USING (created_by IN (SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()))
  WITH CHECK (created_by IN (SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()));

COMMENT ON TABLE public.policies_compliance IS
  'v687, superseded by v1445: policies now live in the register core_policies_compliance (local_register_records). Kept read-only for rollback; creator-only access.';

-- Check: fields and tabs, copied policies, and policies left behind (creator has no organisation).
SELECT
  (SELECT count(*) FROM public.local_register_fields WHERE register_id = '00000000-0000-4000-9100-000000000001') AS fields_expected_26,
  (SELECT count(DISTINCT field_group) FROM public.local_register_fields WHERE register_id = '00000000-0000-4000-9100-000000000001' AND field_group IS NOT NULL) AS tabs_expected_4,
  (SELECT count(*) FROM public.policies_compliance WHERE COALESCE(is_deleted, FALSE) = FALSE) AS old_policies,
  (SELECT count(*) FROM public.local_register_records WHERE register_id = '00000000-0000-4000-9100-000000000001' AND is_deleted = FALSE) AS register_policies,
  (SELECT count(*) FROM public.policies_compliance pc
    WHERE COALESCE(pc.is_deleted, FALSE) = FALSE
      AND NOT EXISTS (SELECT 1 FROM public.local_register_records r WHERE r.id = pc.id)) AS not_copied,
  (SELECT route_path FROM public.menu_items WHERE menu_code = 'plat_pm_s_policies') AS menu_route;

NOTIFY pgrst, 'reload schema';
