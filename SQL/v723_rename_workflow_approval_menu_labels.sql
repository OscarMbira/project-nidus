-- =============================================================================
-- v723: Rename Workflows & Approvals leaf labels (pmo_admin sidebar)
--   Mandate Pending Approvals  → Mandate Approvals
--   Brief Pending Approvals    → Project Brief Approvals
-- =============================================================================

UPDATE public.menu_items
SET menu_label = 'Mandate Approvals',
    updated_at = NOW()
WHERE menu_code IN (
  'plat_wf_mandate_approvals',
  'pmo_workflows_mandate_pending',
  'pmo-workflows-mandate-approvals'
)
AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET menu_label = 'Project Brief Approvals',
    updated_at = NOW()
WHERE menu_code IN (
  'plat_wf_brief_approvals',
  'pmo_workflows_brief_pending',
  'pmo-workflows-brief-approvals'
)
AND COALESCE(is_deleted, FALSE) = FALSE;

-- Legacy rows matched by label only (orphan duplicates)
UPDATE public.menu_items
SET menu_label = 'Mandate Approvals',
    updated_at = NOW()
WHERE menu_label = 'Mandate Pending Approvals'
  AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET menu_label = 'Project Brief Approvals',
    updated_at = NOW()
WHERE menu_label = 'Brief Pending Approvals'
  AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v723_rename_workflow_approval_menu_labels.sql applied'; END $$;
