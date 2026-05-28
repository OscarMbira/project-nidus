-- v653: Category B lifecycle status columns (public schema)
-- @see projectplan/v639_Record_Lifecycle_Management_Plan.md

CREATE OR REPLACE FUNCTION public.ensure_lifecycle_category_b(p_table text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  live regclass := to_regclass('public.' || p_table);
BEGIN
  IF live IS NULL THEN
    RAISE NOTICE 'Skipping % — table not found', p_table;
    RETURN;
  END IF;

  PERFORM public.ensure_lifecycle_live_columns(live);

  EXECUTE format(
    'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ',
    p_table
  );
  EXECUTE format(
    'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.users(id)',
    p_table
  );
END;
$$;

SELECT public.ensure_lifecycle_category_b('projects');
SELECT public.ensure_lifecycle_category_b('project_mandates');
SELECT public.ensure_lifecycle_category_b('business_cases');
SELECT public.ensure_lifecycle_category_b('work_packages');
SELECT public.ensure_lifecycle_category_b('stage_plans');
SELECT public.ensure_lifecycle_category_b('project_decisions');
SELECT public.ensure_lifecycle_category_b('configuration_items');
SELECT public.ensure_lifecycle_category_b('benefits_review_plans');
SELECT public.ensure_lifecycle_category_b('highlight_reports');
SELECT public.ensure_lifecycle_category_b('exception_reports');
SELECT public.ensure_lifecycle_category_b('end_stage_reports');
SELECT public.ensure_lifecycle_category_b('lessons_reports');
SELECT public.ensure_lifecycle_category_b('project_initiation_documents');
SELECT public.ensure_lifecycle_category_b('product_descriptions');

DO $$ BEGIN RAISE NOTICE 'v653_category_b_status_columns.sql completed'; END $$;
