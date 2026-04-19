-- ============================================================================
-- v479 — Seed tasks + teams for Executive Summary dashboard cards
-- Database: PostgreSQL 15+ (Supabase public schema)
-- ============================================================================
-- Purpose:
--   Populates public.tasks and public.teams for org projects so the Platform
--   Dashboard Executive Summary shows non-zero "Tasks" and "Teams" counts.
--   Uses task_statuses from v06 (status_code: todo, in_progress, completed, blocked).
--
-- Idempotent:
--   Removes prior rows tagged with task_code LIKE 'SEED-EXEC-%' and
--   team_name LIKE 'SEED Exec Team %', then re-inserts.
--
-- Implementation:
--   Each INSERT uses WITH (proj, cnt) — no TEMP tables. Supabase often runs
--   statements on separate connections, so TEMP tables do not persist between
--   statements in the SQL editor.
--
-- Run: Supabase SQL Editor — paste full file, or run each INSERT as its own query.
-- ============================================================================

DELETE FROM public.tasks
WHERE task_code LIKE 'SEED-EXEC-%';

DELETE FROM public.teams
WHERE team_name LIKE 'SEED Exec Team %';

-- 12 To Do (round-robin projects)
WITH proj AS (
  SELECT ROW_NUMBER() OVER (ORDER BY id)::int AS seq,
         id AS project_id
  FROM public.projects
  WHERE is_deleted = FALSE
  ORDER BY id
  LIMIT 30
),
cnt AS (
  SELECT COUNT(*)::int AS c FROM proj
)
INSERT INTO public.tasks (
  task_name,
  task_code,
  project_id,
  status_id,
  priority,
  created_by
)
SELECT
  'Executive summary seed — To Do ' || gs.n,
  'SEED-EXEC-TD-' || LPAD(gs.n::text, 3, '0'),
  p.project_id,
  (SELECT id FROM public.task_statuses WHERE status_code = 'todo' AND is_deleted = FALSE LIMIT 1),
  'medium',
  (SELECT id FROM public.users WHERE is_deleted = FALSE LIMIT 1)
FROM generate_series(1, 12) AS gs(n)
CROSS JOIN cnt
JOIN LATERAL (
  SELECT project_id
  FROM proj
  WHERE seq = (
    CASE
      WHEN cnt.c > 0 THEN (mod((gs.n)::int - 1, cnt.c) + 1)
      ELSE NULL
    END
  )
) p ON cnt.c > 0;

-- 7 In Progress
WITH proj AS (
  SELECT ROW_NUMBER() OVER (ORDER BY id)::int AS seq,
         id AS project_id
  FROM public.projects
  WHERE is_deleted = FALSE
  ORDER BY id
  LIMIT 30
),
cnt AS (
  SELECT COUNT(*)::int AS c FROM proj
)
INSERT INTO public.tasks (
  task_name,
  task_code,
  project_id,
  status_id,
  priority,
  created_by
)
SELECT
  'Executive summary seed — In Progress ' || gs.n,
  'SEED-EXEC-IP-' || LPAD(gs.n::text, 3, '0'),
  p.project_id,
  (SELECT id FROM public.task_statuses WHERE status_code = 'in_progress' AND is_deleted = FALSE LIMIT 1),
  'medium',
  (SELECT id FROM public.users WHERE is_deleted = FALSE LIMIT 1)
FROM generate_series(1, 7) AS gs(n)
CROSS JOIN cnt
JOIN LATERAL (
  SELECT project_id
  FROM proj
  WHERE seq = (
    CASE
      WHEN cnt.c > 0 THEN (mod((gs.n)::int + 1, cnt.c) + 1)
      ELSE NULL
    END
  )
) p ON cnt.c > 0;

-- 5 Completed
WITH proj AS (
  SELECT ROW_NUMBER() OVER (ORDER BY id)::int AS seq,
         id AS project_id
  FROM public.projects
  WHERE is_deleted = FALSE
  ORDER BY id
  LIMIT 30
),
cnt AS (
  SELECT COUNT(*)::int AS c FROM proj
)
INSERT INTO public.tasks (
  task_name,
  task_code,
  project_id,
  status_id,
  priority,
  created_by
)
SELECT
  'Executive summary seed — Completed ' || gs.n,
  'SEED-EXEC-DN-' || LPAD(gs.n::text, 3, '0'),
  p.project_id,
  (SELECT id FROM public.task_statuses WHERE status_code = 'completed' AND is_deleted = FALSE LIMIT 1),
  'medium',
  (SELECT id FROM public.users WHERE is_deleted = FALSE LIMIT 1)
FROM generate_series(1, 5) AS gs(n)
CROSS JOIN cnt
JOIN LATERAL (
  SELECT project_id
  FROM proj
  WHERE seq = (
    CASE
      WHEN cnt.c > 0 THEN (mod((gs.n)::int + 3, cnt.c) + 1)
      ELSE NULL
    END
  )
) p ON cnt.c > 0;

-- 3 Blocked
WITH proj AS (
  SELECT ROW_NUMBER() OVER (ORDER BY id)::int AS seq,
         id AS project_id
  FROM public.projects
  WHERE is_deleted = FALSE
  ORDER BY id
  LIMIT 30
),
cnt AS (
  SELECT COUNT(*)::int AS c FROM proj
)
INSERT INTO public.tasks (
  task_name,
  task_code,
  project_id,
  status_id,
  priority,
  created_by
)
SELECT
  'Executive summary seed — Blocked ' || gs.n,
  'SEED-EXEC-BL-' || LPAD(gs.n::text, 3, '0'),
  p.project_id,
  (SELECT id FROM public.task_statuses WHERE status_code = 'blocked' AND is_deleted = FALSE LIMIT 1),
  'high',
  (SELECT id FROM public.users WHERE is_deleted = FALSE LIMIT 1)
FROM generate_series(1, 3) AS gs(n)
CROSS JOIN cnt
JOIN LATERAL (
  SELECT project_id
  FROM proj
  WHERE seq = (
    CASE
      WHEN cnt.c > 0 THEN (mod((gs.n)::int + 5, cnt.c) + 1)
      ELSE NULL
    END
  )
) p ON cnt.c > 0;

-- 8 Teams
WITH proj AS (
  SELECT ROW_NUMBER() OVER (ORDER BY id)::int AS seq,
         id AS project_id
  FROM public.projects
  WHERE is_deleted = FALSE
  ORDER BY id
  LIMIT 30
),
cnt AS (
  SELECT COUNT(*)::int AS c FROM proj
)
INSERT INTO public.teams (
  project_id,
  team_name,
  team_description,
  team_type,
  is_active,
  created_by
)
SELECT
  p.project_id,
  'SEED Exec Team ' || gs.n,
  'Seed team for Executive Summary / Platform dashboard demo.',
  'delivery',
  TRUE,
  (SELECT id FROM public.users WHERE is_deleted = FALSE LIMIT 1)
FROM generate_series(1, 8) AS gs(n)
CROSS JOIN cnt
JOIN LATERAL (
  SELECT project_id
  FROM proj
  WHERE seq = (
    CASE
      WHEN cnt.c > 0 THEN (mod((gs.n)::int - 1, cnt.c) + 1)
      ELSE NULL
    END
  )
) p ON cnt.c > 0;
