-- ============================================================================
-- v1281 rollback: removes the Meeting-to-Register additions. Staging rows keep their v409 data.
-- Rows with the new statuses are reset first so the v409 status checks can be restored.
-- ============================================================================
-- Policies first: some reference columns dropped below.
DROP POLICY IF EXISTS comm_extracted_issues_file_insert ON public.comm_meeting_extracted_issues;
DROP POLICY IF EXISTS comm_extracted_risks_file_insert ON public.comm_meeting_extracted_risks;
DROP POLICY IF EXISTS comm_action_items_file_insert ON public.comm_meeting_action_items;
DROP POLICY IF EXISTS comm_action_items_file_update ON public.comm_meeting_action_items;
DROP POLICY IF EXISTS comm_meeting_summaries_file_insert ON public.comm_meeting_summaries;
DROP POLICY IF EXISTS comm_meeting_summaries_file_update ON public.comm_meeting_summaries;
DROP POLICY IF EXISTS sim_extracted_issues_file_insert ON sim.comm_meeting_extracted_issues;
DROP POLICY IF EXISTS sim_extracted_risks_file_insert ON sim.comm_meeting_extracted_risks;
DROP POLICY IF EXISTS sim_action_items_file ON sim.comm_meeting_action_items;
DROP POLICY IF EXISTS sim_meeting_summaries_file ON sim.comm_meeting_summaries;

DO $$
DECLARE s TEXT; t TEXT;
BEGIN
  FOREACH s IN ARRAY ARRAY['public', 'sim'] LOOP
    EXECUTE format('DROP TABLE IF EXISTS %I.comm_meeting_record_updates', s);
    EXECUTE format('DROP TABLE IF EXISTS %I.comm_meeting_extracted_decisions', s);
    EXECUTE format($u$UPDATE %I.comm_meeting_action_items SET status = 'pending' WHERE status IN ('enriched', 'created', 'merged')$u$, s);
    EXECUTE format($u$UPDATE %I.comm_meeting_extracted_issues SET status = 'pending_review' WHERE status = 'merged'$u$, s);
    EXECUTE format($u$UPDATE %I.comm_meeting_extracted_risks SET status = 'pending_review' WHERE status = 'merged'$u$, s);
    EXECUTE format('ALTER TABLE %I.comm_meeting_action_items DROP CONSTRAINT IF EXISTS comm_meeting_action_items_status_check', s);
    EXECUTE format($c$ALTER TABLE %I.comm_meeting_action_items ADD CONSTRAINT comm_meeting_action_items_status_check
      CHECK (status IN ('pending', 'assigned', 'converted_to_task', 'completed', 'dismissed'))$c$, s);
    FOREACH t IN ARRAY ARRAY['comm_meeting_extracted_issues', 'comm_meeting_extracted_risks'] LOOP
      EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I', s, t, t || '_status_check');
      EXECUTE format($c$ALTER TABLE %I.%I ADD CONSTRAINT %I
        CHECK (status IN ('pending_review', 'approved', 'rejected', 'enriched', 'created'))$c$, s, t, t || '_status_check');
    END LOOP;
    FOREACH t IN ARRAY ARRAY['comm_meeting_extracted_issues', 'comm_meeting_extracted_risks', 'comm_meeting_action_items'] LOOP
      EXECUTE format('ALTER TABLE %I.%I DROP COLUMN IF EXISTS duplicate_of_id, DROP COLUMN IF EXISTS duplicate_of_ref,
        DROP COLUMN IF EXISTS duplicate_title, DROP COLUMN IF EXISTS duplicate_score, DROP COLUMN IF EXISTS suggested_owner_id,
        DROP COLUMN IF EXISTS suggested_owner_name, DROP COLUMN IF EXISTS suggested_due_date, DROP COLUMN IF EXISTS mapped_values,
        DROP COLUMN IF EXISTS agent_note, DROP COLUMN IF EXISTS agent_enriched_at', s, t);
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE public.comm_meeting_action_items DROP COLUMN IF EXISTS project_id, DROP COLUMN IF EXISTS daily_log_entry_id,
  DROP COLUMN IF EXISTS reviewed_by, DROP COLUMN IF EXISTS reviewed_at;
ALTER TABLE sim.comm_meeting_action_items DROP COLUMN IF EXISTS practice_project_id, DROP COLUMN IF EXISTS daily_log_entry_id,
  DROP COLUMN IF EXISTS reviewed_by, DROP COLUMN IF EXISTS reviewed_at;

DROP FUNCTION IF EXISTS public.comm_user_can_file_meeting(UUID);
DROP FUNCTION IF EXISTS public.comm_user_can_file_meeting_sim(UUID);
DELETE FROM database_tables WHERE table_name IN ('comm_meeting_extracted_decisions', 'comm_meeting_record_updates');
NOTIFY pgrst, 'reload schema';
