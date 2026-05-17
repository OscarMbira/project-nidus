-- ============================================================================
-- v524_platform_entity_codes_backfill.sql
-- Phase 12 — Back-fill NULL/empty human-readable codes (Platform public schema)
-- Run after: core project/programme/portfolio/risk/issue/CR tables exist.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- projects.project_code  (PRJ-NNNN)
-- ---------------------------------------------------------------------------
WITH mx AS (
  SELECT COALESCE(MAX(
    CASE
      WHEN project_code ~ '^PRJ-[0-9]+$' THEN SUBSTRING(project_code FROM 5)::INT
    END
  ), 0) AS n
  FROM projects
),
ranked AS (
  SELECT p.id,
         ROW_NUMBER() OVER (ORDER BY p.created_at NULLS LAST, p.id) AS rn
  FROM projects p
  WHERE COALESCE(TRIM(p.project_code), '') = ''
    AND COALESCE(p.is_deleted, FALSE) = FALSE
)
UPDATE projects p
SET project_code = 'PRJ-' || LPAD((mx.n + ranked.rn)::TEXT, 4, '0'),
    updated_at = COALESCE(p.updated_at, NOW())
FROM mx, ranked
WHERE p.id = ranked.id;

-- ---------------------------------------------------------------------------
-- programmes.programme_code  (PROG-NNNN)
-- ---------------------------------------------------------------------------
WITH mx AS (
  SELECT COALESCE(MAX(
    CASE
      WHEN programme_code ~ '^PROG-[0-9]+$' THEN SUBSTRING(programme_code FROM 6)::INT
    END
  ), 0) AS n
  FROM programmes
),
ranked AS (
  SELECT p.id,
         ROW_NUMBER() OVER (ORDER BY p.created_at NULLS LAST, p.id) AS rn
  FROM programmes p
  WHERE COALESCE(TRIM(p.programme_code), '') = ''
    AND COALESCE(p.is_deleted, FALSE) = FALSE
)
UPDATE programmes p
SET programme_code = 'PROG-' || LPAD((mx.n + ranked.rn)::TEXT, 4, '0'),
    updated_at = COALESCE(p.updated_at, NOW())
FROM mx, ranked
WHERE p.id = ranked.id;

-- ---------------------------------------------------------------------------
-- portfolios.portfolio_code  (PORT-NNNN)
-- ---------------------------------------------------------------------------
WITH mx AS (
  SELECT COALESCE(MAX(
    CASE
      WHEN portfolio_code ~ '^PORT-[0-9]+$' THEN SUBSTRING(portfolio_code FROM 6)::INT
    END
  ), 0) AS n
  FROM portfolios
),
ranked AS (
  SELECT p.id,
         ROW_NUMBER() OVER (ORDER BY p.created_at NULLS LAST, p.id) AS rn
  FROM portfolios p
  WHERE COALESCE(TRIM(p.portfolio_code), '') = ''
    AND COALESCE(p.is_deleted, FALSE) = FALSE
)
UPDATE portfolios p
SET portfolio_code = 'PORT-' || LPAD((mx.n + ranked.rn)::TEXT, 4, '0'),
    updated_at = COALESCE(p.updated_at, NOW())
FROM mx, ranked
WHERE p.id = ranked.id;

-- ---------------------------------------------------------------------------
-- change_requests.change_reference  (CR-NNNN)
-- ---------------------------------------------------------------------------
WITH mx AS (
  SELECT COALESCE(MAX(
    CASE
      WHEN change_reference ~ '^CR-[0-9]+$' THEN SUBSTRING(change_reference FROM 4)::INT
    END
  ), 0) AS n
  FROM change_requests
),
ranked AS (
  SELECT c.id,
         ROW_NUMBER() OVER (ORDER BY c.created_at NULLS LAST, c.id) AS rn
  FROM change_requests c
  WHERE COALESCE(TRIM(c.change_reference), '') = ''
    AND COALESCE(c.is_deleted, FALSE) = FALSE
)
UPDATE change_requests c
SET change_reference = 'CR-' || LPAD((mx.n + ranked.rn)::TEXT, 4, '0'),
    updated_at = COALESCE(c.updated_at, NOW())
FROM mx, ranked
WHERE c.id = ranked.id;

-- ---------------------------------------------------------------------------
-- risks.risk_code  (per project, RISK-NNNN)
-- ---------------------------------------------------------------------------
WITH ranked AS (
  SELECT r.id,
         r.project_id,
         ROW_NUMBER() OVER (PARTITION BY r.project_id ORDER BY r.created_at NULLS LAST, r.id) AS rn
  FROM risks r
  WHERE COALESCE(TRIM(r.risk_code), '') = ''
    AND COALESCE(r.is_deleted, FALSE) = FALSE
),
mx AS (
  SELECT r.project_id,
         COALESCE(MAX(
           CASE
             WHEN r.risk_code ~ '^RISK-[0-9]+$' THEN SUBSTRING(r.risk_code FROM 6)::INT
           END
         ), 0) AS n
  FROM risks r
  GROUP BY r.project_id
)
UPDATE risks r
SET risk_code = 'RISK-' || LPAD((COALESCE(mx.n, 0) + ranked.rn)::TEXT, 4, '0'),
    updated_at = COALESCE(r.updated_at, NOW())
FROM ranked
LEFT JOIN mx ON mx.project_id = ranked.project_id
WHERE r.id = ranked.id;

-- ---------------------------------------------------------------------------
-- issues.issue_code  (per project, ISS-NNNN)
-- ---------------------------------------------------------------------------
WITH ranked AS (
  SELECT i.id,
         i.project_id,
         ROW_NUMBER() OVER (PARTITION BY i.project_id ORDER BY i.created_at NULLS LAST, i.id) AS rn
  FROM issues i
  WHERE COALESCE(TRIM(i.issue_code), '') = ''
    AND COALESCE(i.is_deleted, FALSE) = FALSE
),
mx AS (
  SELECT i.project_id,
         COALESCE(MAX(
           CASE
             WHEN i.issue_code ~ '^ISS-[0-9]+$' THEN SUBSTRING(i.issue_code FROM 5)::INT
           END
         ), 0) AS n
  FROM issues i
  GROUP BY i.project_id
)
UPDATE issues i
SET issue_code = 'ISS-' || LPAD((COALESCE(mx.n, 0) + ranked.rn)::TEXT, 4, '0'),
    updated_at = COALESCE(i.updated_at, NOW())
FROM ranked
LEFT JOIN mx ON mx.project_id = ranked.project_id
WHERE i.id = ranked.id;

DO $$
BEGIN
  RAISE NOTICE 'v524_platform_entity_codes_backfill.sql applied';
END $$;
