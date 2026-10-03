-- ============================================================================
-- v995: Active workspace selection — Phase 4 of v982 SaaS User Journey
-- (Workspace Switching, brief §3, §19)
-- ============================================================================
-- projectplan/v982_phase4_workspace_switching_plan.md, task A, decision 1 (accepted by default
-- per user authorization): a DB column, not sessionStorage-only — persists a user's chosen
-- workspace across devices/sessions (matters for a freelancer consulting across multiple orgs).
--
-- No new table, no database_tables registry row needed (single column addition to the existing
-- public.users table, per this phase's own ground rule 6).
--
-- get_user_accounts() (SQL/v87/v94) already returns account_id, account_name, is_owner,
-- project_count, total_members, subscription_status per row — enough detail for a switcher UI
-- (name + owned-vs-member distinction, decision 2) without any function changes.
--
-- Prerequisites: public.users, public.accounts.
-- ============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_active_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.users.last_active_account_id IS
  'v995/v982 Phase 4: the workspace (accounts.id) this user last explicitly selected via the '
  'workspace switcher. NULL for a user who has never switched (or has only ever had one '
  'accessible workspace) — resolveAccountIdForAuthUser() falls through to its pre-v995 '
  'owner/invite/project waterfall unchanged in that case, preserving single-org behaviour exactly. '
  'Not itself a security boundary — every downstream query is still RLS-scoped; a stale value '
  '(e.g. the user lost access to that account) degrades to an empty state, never a leak, and is '
  'self-healed by the workspace switcher UI next time it loads the user''s real accessible list.';

CREATE INDEX IF NOT EXISTS idx_users_last_active_account_id ON public.users(last_active_account_id) WHERE last_active_account_id IS NOT NULL;

DO $$ BEGIN RAISE NOTICE 'v995_active_workspace_selection.sql applied successfully'; END $$;
