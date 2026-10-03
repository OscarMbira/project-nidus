-- =============================================================================
-- v935: Local Register Engine — align local_register_records with the record-lifecycle
-- module's actual column/value conventions
-- =============================================================================
-- v931's local_register_records used record_status DEFAULT 'authorised' and was missing
-- several columns public.lifecycle_blocked_columns() (SQL/v751) expects on any table that
-- participates in transition_record_status(): archived_by, archived_at, moved_to_history_at,
-- deleted_at, deleted_by. The established convention's "normal, active" state is 'live', not
-- 'authorised' (LIFECYCLE_STATUSES in recordLifecycleRegistry.js: live/unauthorised/history/
-- archived) — fixed here before any record-lifecycle wiring goes live, since it's still the
-- default for every record.
--
-- Prerequisites: v931_local_register_engine_schema.sql, v751_record_lifecycle_defer_apply_functions.sql
-- =============================================================================

ALTER TABLE public.local_register_records
  ALTER COLUMN record_status SET DEFAULT 'live';

UPDATE public.local_register_records SET record_status = 'live' WHERE record_status = 'authorised';

ALTER TABLE public.local_register_records
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS moved_to_history_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id);

-- requires_approval on the register definition — which registers actually gate on approval
-- (v931 PRD section h flagged Product Configuration, Parameterisation, Bill of Materials,
-- Go-Live specifically; most registers don't need it).
UPDATE public.local_registers
SET requires_approval = TRUE, updated_at = NOW()
WHERE id IN (
  '00000000-0000-4000-8000-000000000006', -- Product Configuration
  '00000000-0000-4000-8000-000000000007', -- Parameterisation
  '00000000-0000-4000-8000-000000000012', -- Bill of Materials
  '00000000-0000-4000-8000-000000000009'  -- Go-Live
);

DO $$ BEGIN
  RAISE NOTICE 'v935_local_register_records_lifecycle_columns.sql applied successfully';
END $$;
