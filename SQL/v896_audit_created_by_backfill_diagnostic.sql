-- v896: Diagnostic — how widespread is missing created_by/updated_by on project-scoped
-- process_template documents (e.g. TPL-0030 "Project Charter" for Cedar Trust Schools,
-- which showed "—" for Created by / Updated by on its Audit details tab)?
--
-- Read-only. Run in the Supabase SQL Editor and review the two result sets below.
-- If the counts are non-trivial, follow up with a scoped backfill; if it's isolated to
-- a handful of old/demo documents, a one-off per-document fix is enough.

-- 1. pm_template_nodes rows (the document's own row) missing created_by.
SELECT
  count(*) FILTER (WHERE created_by IS NULL) AS nodes_missing_created_by,
  count(*) AS total_project_process_template_nodes
FROM public.pm_template_nodes
WHERE domain = 'process_template'
  AND scope_entity_type = 'project';

-- 2. Per-table breakdown of linked content rows missing created_by/updated_by, discovered
-- via process_template_node_links (v766) so every process_template catalog table is
-- covered without hardcoding each one (project_charters, business_cases, etc.).
CREATE TEMP TABLE IF NOT EXISTS _v896_created_by_audit (
  document_table text,
  missing_created_by bigint,
  missing_updated_by bigint,
  total_rows bigint
);
TRUNCATE _v896_created_by_audit;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT l.document_table
    FROM public.process_template_node_links l
    JOIN public.pm_template_nodes n ON n.id = l.node_id
    WHERE n.scope_entity_type = 'project'
  LOOP
    EXECUTE format(
      'INSERT INTO _v896_created_by_audit
       SELECT %L, count(*) FILTER (WHERE created_by IS NULL), count(*) FILTER (WHERE updated_by IS NULL), count(*)
       FROM public.%I',
      r.document_table, r.document_table
    );
  END LOOP;
END $$;

SELECT * FROM _v896_created_by_audit ORDER BY missing_created_by DESC;
