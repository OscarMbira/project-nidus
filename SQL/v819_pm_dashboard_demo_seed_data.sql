-- =============================================================================
-- v819: Demo seed data for the PM Dashboard stat cards, for every project
-- Plan: projectplan/v817_pm_dashboard_project_selector_and_enrichment_plan.md
-- Companion seed file per CLAUDE.md rule 18.2 — explicit user request, not
-- auto-inserted. Idempotent: each row's id is a deterministic uuid_generate_v5()
-- derived from (project_id, fixed label), so re-running this file is a no-op via
-- ON CONFLICT (id) DO NOTHING rather than accumulating duplicates.
--
-- Seeds, per project (WHERE projects.is_deleted = FALSE), 10 rows in every
-- category so each dashboard stat card reads 10 (Upcoming Deadlines is
-- unaffected — already working, left at its original 2 milestones):
--   - 10 work_packages      (status in_progress/authorized -> "Active Work Packages")
--   - 10 risks              (status identified/assessed    -> "Open Risks")
--   - 10 issues             (status new/in_progress        -> "Open Issues")
--   - 10 quality activities (5 quality_reviews + 5 quality_inspections
--                             -> "Quality Activities", via quality_activities_view,
--                             SQL/v184_quality_register_enhancements.sql)
--   - 10 checkpoint_reports (status draft                  -> "Pending Reports")
--   - 10 lessons_learned                                    -> "Lessons Logged"
--
-- v2: the Supabase SQL Editor's Results panel does not surface RAISE NOTICE/
-- WARNING output at all (confirmed) — v1's diagnostics were invisible by design
-- of that UI, not because nothing failed. This version logs every category's
-- outcome (OK + row count, or FAILED + the exact Postgres error) into a real
-- temp table, then SELECTs it at the end so the result is visible in the
-- normal Results grid. Each category still runs in its own BEGIN/EXCEPTION so
-- one failing category can never block the others (v1's isolation fix, kept).
-- =============================================================================

CREATE TEMP TABLE IF NOT EXISTS v819_seed_log (
  project_name TEXT,
  category TEXT,
  outcome TEXT,
  detail TEXT
);

DO $$
DECLARE
  proj RECORD;
  seed_user_id UUID;
  i INT;
BEGIN
  FOR proj IN SELECT id, project_name FROM projects WHERE is_deleted = FALSE LOOP

    SELECT COALESCE(
      proj_lookup.project_manager_user_id,
      proj_lookup.owner_user_id,
      (SELECT up.user_id FROM user_projects up
         WHERE up.project_id = proj.id AND up.is_deleted = FALSE
         ORDER BY CASE up.access_level WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END
         LIMIT 1),
      (SELECT u.id FROM users u WHERE u.is_active = TRUE AND u.is_deleted = FALSE LIMIT 1)
    )
    INTO seed_user_id
    FROM projects proj_lookup
    WHERE proj_lookup.id = proj.id;

    IF seed_user_id IS NULL THEN
      INSERT INTO v819_seed_log VALUES (proj.project_name, 'ALL', 'SKIPPED', 'no resolvable seed user for this project');
      CONTINUE;
    END IF;

    -- Work packages ("Active Work Packages") -------------------------------
    BEGIN
      FOR i IN 1..10 LOOP
        INSERT INTO work_packages (id, project_id, work_package_name, work_description, status, created_by, planned_start_date, planned_end_date)
        VALUES (
          uuid_generate_v5(proj.id, 'seed-wp-' || i), proj.id,
          'Work Package ' || i || ' — ' || proj.project_name,
          'Seed data: delivery scope item ' || i || ' for ' || proj.project_name,
          CASE WHEN i % 3 = 0 THEN 'authorized' WHEN i % 3 = 1 THEN 'in_progress' ELSE 'accepted' END,
          seed_user_id, CURRENT_DATE - (i * 3), CURRENT_DATE + (30 - i * 2)
        )
        ON CONFLICT (id) DO NOTHING;
      END LOOP;
      INSERT INTO v819_seed_log VALUES (proj.project_name, 'work_packages', 'OK', '10 rows attempted');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO v819_seed_log VALUES (proj.project_name, 'work_packages', 'FAILED', SQLERRM);
    END;

    -- Risks ("Open Risks") ---------------------------------------------------
    BEGIN
      FOR i IN 1..10 LOOP
        INSERT INTO risks (id, project_id, risk_title, risk_description, status, identified_by_user_id, probability, impact, identified_date)
        VALUES (
          uuid_generate_v5(proj.id, 'seed-risk-' || i), proj.id,
          'Risk ' || i || ' — ' || proj.project_name,
          'Seed data: risk scenario ' || i || ' for ' || proj.project_name,
          CASE WHEN i % 2 = 0 THEN 'assessed' ELSE 'identified' END,
          seed_user_id, 1 + (i % 5), 1 + ((i + 2) % 5), CURRENT_DATE - i
        )
        ON CONFLICT (id) DO NOTHING;
      END LOOP;
      INSERT INTO v819_seed_log VALUES (proj.project_name, 'risks', 'OK', '10 rows attempted');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO v819_seed_log VALUES (proj.project_name, 'risks', 'FAILED', SQLERRM);
    END;

    -- Issues ("Open Issues") -------------------------------------------------
    BEGIN
      FOR i IN 1..10 LOOP
        INSERT INTO issues (id, project_id, issue_title, issue_description, status, reported_by_user_id)
        VALUES (
          uuid_generate_v5(proj.id, 'seed-issue-' || i), proj.id,
          'Issue ' || i || ' — ' || proj.project_name,
          'Seed data: issue scenario ' || i || ' for ' || proj.project_name,
          CASE WHEN i % 2 = 0 THEN 'in_progress' ELSE 'new' END,
          seed_user_id
        )
        ON CONFLICT (id) DO NOTHING;
      END LOOP;
      INSERT INTO v819_seed_log VALUES (proj.project_name, 'issues', 'OK', '10 rows attempted');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO v819_seed_log VALUES (proj.project_name, 'issues', 'FAILED', SQLERRM);
    END;

    -- Quality activities (5 reviews + 5 inspections -> "Quality Activities") -
    BEGIN
      FOR i IN 1..5 LOOP
        INSERT INTO quality_reviews (id, project_id, review_title, review_type, planned_date, review_status)
        VALUES (
          uuid_generate_v5(proj.id, 'seed-qreview-' || i), proj.id,
          'Quality Review ' || i || ' — ' || proj.project_name,
          'peer-review', CURRENT_DATE + i, CASE WHEN i % 2 = 0 THEN 'completed' ELSE 'planned' END
        )
        ON CONFLICT (id) DO NOTHING;
      END LOOP;
      INSERT INTO v819_seed_log VALUES (proj.project_name, 'quality_reviews', 'OK', '5 rows attempted');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO v819_seed_log VALUES (proj.project_name, 'quality_reviews', 'FAILED', SQLERRM);
    END;

    BEGIN
      FOR i IN 1..5 LOOP
        INSERT INTO quality_inspections (id, project_id, inspection_title, inspection_date, inspection_result, inspection_completed)
        VALUES (
          uuid_generate_v5(proj.id, 'seed-qinspect-' || i), proj.id,
          'Quality Inspection ' || i || ' — ' || proj.project_name,
          CURRENT_DATE - i, 'passed', TRUE
        )
        ON CONFLICT (id) DO NOTHING;
      END LOOP;
      INSERT INTO v819_seed_log VALUES (proj.project_name, 'quality_inspections', 'OK', '5 rows attempted');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO v819_seed_log VALUES (proj.project_name, 'quality_inspections', 'FAILED', SQLERRM);
    END;

    -- Checkpoint reports ("Pending Reports") ---------------------------------
    BEGIN
      FOR i IN 1..10 LOOP
        INSERT INTO checkpoint_reports (id, project_id, reported_by_user_id, checkpoint_date, report_title, status)
        VALUES (
          uuid_generate_v5(proj.id, 'seed-cpr-' || i), proj.id, seed_user_id,
          CURRENT_DATE - (i * 7),
          'Checkpoint Report ' || i || ' — ' || proj.project_name,
          CASE WHEN i % 2 = 0 THEN 'submitted' ELSE 'draft' END
        )
        ON CONFLICT (id) DO NOTHING;
      END LOOP;
      INSERT INTO v819_seed_log VALUES (proj.project_name, 'checkpoint_reports', 'OK', '10 rows attempted');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO v819_seed_log VALUES (proj.project_name, 'checkpoint_reports', 'FAILED', SQLERRM);
    END;

    -- Lessons learned ("Lessons Logged") -------------------------------------
    BEGIN
      FOR i IN 1..10 LOOP
        INSERT INTO lessons_learned (id, project_id, lesson_title, lesson_date, situation_description, what_happened, lesson_learned, recommendations)
        VALUES (
          uuid_generate_v5(proj.id, 'seed-lesson-' || i), proj.id,
          'Lesson ' || i || ' — ' || proj.project_name,
          CURRENT_DATE - (i * 4),
          'Seed data: situation ' || i || ' for ' || proj.project_name,
          'Seed data: what happened in scenario ' || i || '.',
          'Seed data: lesson learned from scenario ' || i || '.',
          'Seed data: recommendation arising from scenario ' || i || '.'
        )
        ON CONFLICT (id) DO NOTHING;
      END LOOP;
      INSERT INTO v819_seed_log VALUES (proj.project_name, 'lessons_learned', 'OK', '10 rows attempted');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO v819_seed_log VALUES (proj.project_name, 'lessons_learned', 'FAILED', SQLERRM);
    END;

    -- Milestones ("Upcoming Deadlines" widget) — unchanged from v1, already working
    BEGIN
      INSERT INTO project_milestones (id, project_id, milestone_name, milestone_date, milestone_type)
      VALUES
        (uuid_generate_v5(proj.id, 'seed-milestone-1'), proj.id, 'Stage Gate Review', CURRENT_DATE + 14, 'phase_gate'),
        (uuid_generate_v5(proj.id, 'seed-milestone-2'), proj.id, 'Key Deliverable Handover', CURRENT_DATE + 45, 'deliverable')
      ON CONFLICT (id) DO NOTHING;
      INSERT INTO v819_seed_log VALUES (proj.project_name, 'project_milestones', 'OK', '2 rows attempted');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO v819_seed_log VALUES (proj.project_name, 'project_milestones', 'FAILED', SQLERRM);
    END;

  END LOOP;
END $$;

-- This SELECT is what actually shows up in the Results grid — look for any
-- 'FAILED' rows and share the whole grid (or just the FAILED rows) back.
SELECT * FROM v819_seed_log ORDER BY project_name, category;
