-- ================================================
-- File: v1189_work_plan_items_member_priority.sql
-- Description: Adds two fields to Work Plan items (v1180):
--              - member_user_id: which project/team member this planned item is for (searchable
--                dropdown sourced from project_memberships, same table getProjectMembers()
--                already reads) — distinct from project_work_plans.user_id (the plan owner); a
--                PM/lead creating or reviewing a plan may want to tag an item to a specific
--                team member.
--              - priority: fixed low/medium/high/critical set, matching the exact convention
--                already used by tasks.priority / projects.priority elsewhere in this codebase.
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

ALTER TABLE public.project_work_plan_items ADD COLUMN IF NOT EXISTS member_user_id UUID REFERENCES public.users(id);
ALTER TABLE public.project_work_plan_items ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium';

ALTER TABLE public.project_work_plan_items DROP CONSTRAINT IF EXISTS project_work_plan_items_priority_check;
ALTER TABLE public.project_work_plan_items ADD CONSTRAINT project_work_plan_items_priority_check
  CHECK (priority IS NULL OR priority IN ('low', 'medium', 'high', 'critical'));

CREATE INDEX IF NOT EXISTS idx_project_work_plan_items_member ON public.project_work_plan_items(member_user_id) WHERE member_user_id IS NOT NULL;

COMMENT ON COLUMN public.project_work_plan_items.member_user_id IS 'v1189: project/team member this item is for (public.users.id) — distinct from project_work_plans.user_id, the plan owner.';
COMMENT ON COLUMN public.project_work_plan_items.priority IS 'v1189: low/medium/high/critical — same fixed set as tasks.priority/projects.priority elsewhere in this codebase.';

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1189: project_work_plan_items.member_user_id and .priority added.';
  RAISE NOTICE '================================================';
END $$;
