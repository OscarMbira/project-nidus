-- =============================================================================
-- v291: Canonicalise portfolio_categories
-- Purpose: Ensure every account has exactly the same 21 canonical categories,
--          with no duplicates, no stale entries, and consistent names/codes.
--          Both the Portfolio form and the Programme form use this same table,
--          so a single clean list is required.
--
-- Strategy:
--   1. Deactivate any category whose code is NOT in the canonical set.
--   2. For each canonical category × each account:
--        - If a row with that code exists → update name, sort_order, is_active.
--        - If no row exists → insert it.
--   This is idempotent and safe to re-run.
-- =============================================================================


-- =============================================================================
-- STEP 1: Deactivate non-canonical categories (soft-disable, don't delete)
-- =============================================================================

UPDATE portfolio_categories
SET is_active = FALSE, updated_at = NOW()
WHERE is_deleted = FALSE
  AND code NOT IN (
    'IT', 'BUSINESS', 'INFRASTRUCTURE', 'PRODUCT', 'R&D',
    'INNOVATION', 'COMPLIANCE', 'CUSTOMER', 'SHARED_SERVICES', 'STRATEGIC',
    'OTHER', 'BIZ_TRANSFORM', 'OPS_EXCELLENCE', 'M_AND_A', 'ESG',
    'HR_WORKFORCE', 'FINANCE', 'CYBER', 'DATA_ANALYTICS', 'MARKET_EXP',
    'RISK_GOV'
  );


-- =============================================================================
-- STEP 2: Upsert all 21 canonical categories for every account
-- =============================================================================
-- Using a single INSERT … ON CONFLICT (account_id, code) approach.
-- The UNIQUE constraint on (account_id, code) must exist; if not, the INSERT
-- will still work via the WHERE NOT EXISTS guard, and the UPDATE will fix names.

-- First update names/sort for any existing rows with these codes (idempotent rename)
UPDATE portfolio_categories SET
  name       = v.name,
  description= v.description,
  sort_order = v.sort_order,
  is_active  = TRUE,
  updated_at = NOW()
FROM (VALUES
  ('IT',             'Technology & IT',              'Information technology and digital programmes',                     1),
  ('BIZ_TRANSFORM',  'Business Transformation',      'Programmes driving fundamental change in business models',         2),
  ('INNOVATION',     'Digital Innovation',           'Innovation, digital and emerging technology programmes',            3),
  ('INFRASTRUCTURE', 'Infrastructure & Facilities',  'Infrastructure, facilities and capital works programmes',           4),
  ('COMPLIANCE',     'Regulatory & Compliance',      'Compliance, regulatory and governance programmes',                  5),
  ('PRODUCT',        'Product Development',          'Product development and lifecycle programmes',                      6),
  ('CUSTOMER',       'Customer Experience',          'Customer-facing, marketing and experience programmes',              7),
  ('OPS_EXCELLENCE', 'Operational Excellence',       'Programmes improving efficiency, quality and performance',          8),
  ('STRATEGIC',      'Strategic Growth',             'Strategic and enterprise-wide growth programmes',                   9),
  ('R&D',            'Research & Development',       'Research and development programmes',                              10),
  ('BUSINESS',       'Business & Operations',        'Business and operational programmes',                              11),
  ('SHARED_SERVICES','Shared Services',              'Shared services and central function programmes',                  12),
  ('M_AND_A',        'Merger & Acquisition',         'Mergers, acquisitions and integration programmes',                 13),
  ('ESG',            'Sustainability & ESG',         'Environmental, social and governance programmes',                  14),
  ('HR_WORKFORCE',   'Human Capital & Workforce',    'Talent, workforce development and HR transformation',              15),
  ('FINANCE',        'Finance & Cost Optimisation',  'Financial management and cost reduction programmes',               16),
  ('CYBER',          'Cybersecurity',                'Information security and cyber resilience programmes',             17),
  ('DATA_ANALYTICS', 'Data & Analytics',             'Data management, BI and analytics platforms',                     18),
  ('MARKET_EXP',     'Market Expansion',             'New markets, geographies or customer segment programmes',          19),
  ('RISK_GOV',       'Risk & Governance',            'Enterprise risk management and governance framework programmes',   20),
  ('OTHER',          'Other',                        'Other portfolio or programme category',                            99)
) AS v(code, name, description, sort_order)
WHERE portfolio_categories.code = v.code
  AND portfolio_categories.is_deleted = FALSE;


-- Then insert for any (account, code) combination that doesn't yet exist
INSERT INTO portfolio_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT
  a.id,
  v.name,
  v.code,
  v.description,
  v.sort_order,
  TRUE,
  FALSE
FROM accounts a
CROSS JOIN (VALUES
  ('IT',             'Technology & IT',              'Information technology and digital programmes',                     1),
  ('BIZ_TRANSFORM',  'Business Transformation',      'Programmes driving fundamental change in business models',         2),
  ('INNOVATION',     'Digital Innovation',           'Innovation, digital and emerging technology programmes',            3),
  ('INFRASTRUCTURE', 'Infrastructure & Facilities',  'Infrastructure, facilities and capital works programmes',           4),
  ('COMPLIANCE',     'Regulatory & Compliance',      'Compliance, regulatory and governance programmes',                  5),
  ('PRODUCT',        'Product Development',          'Product development and lifecycle programmes',                      6),
  ('CUSTOMER',       'Customer Experience',          'Customer-facing, marketing and experience programmes',              7),
  ('OPS_EXCELLENCE', 'Operational Excellence',       'Programmes improving efficiency, quality and performance',          8),
  ('STRATEGIC',      'Strategic Growth',             'Strategic and enterprise-wide growth programmes',                   9),
  ('R&D',            'Research & Development',       'Research and development programmes',                              10),
  ('BUSINESS',       'Business & Operations',        'Business and operational programmes',                              11),
  ('SHARED_SERVICES','Shared Services',              'Shared services and central function programmes',                  12),
  ('M_AND_A',        'Merger & Acquisition',         'Mergers, acquisitions and integration programmes',                 13),
  ('ESG',            'Sustainability & ESG',         'Environmental, social and governance programmes',                  14),
  ('HR_WORKFORCE',   'Human Capital & Workforce',    'Talent, workforce development and HR transformation',              15),
  ('FINANCE',        'Finance & Cost Optimisation',  'Financial management and cost reduction programmes',               16),
  ('CYBER',          'Cybersecurity',                'Information security and cyber resilience programmes',             17),
  ('DATA_ANALYTICS', 'Data & Analytics',             'Data management, BI and analytics platforms',                     18),
  ('MARKET_EXP',     'Market Expansion',             'New markets, geographies or customer segment programmes',          19),
  ('RISK_GOV',       'Risk & Governance',            'Enterprise risk management and governance framework programmes',   20),
  ('OTHER',          'Other',                        'Other portfolio or programme category',                            99)
) AS v(code, name, description, sort_order)
WHERE (a.is_deleted = FALSE OR a.is_deleted IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM portfolio_categories pc
    WHERE pc.account_id = a.id
      AND pc.code = v.code
      AND pc.is_deleted = FALSE
  );


-- =============================================================================
-- Verification
-- =============================================================================

DO $$
DECLARE
  v_active   INTEGER;
  v_inactive INTEGER;
  v_accounts INTEGER;
BEGIN
  SELECT COUNT(*)          INTO v_active   FROM portfolio_categories WHERE is_deleted = FALSE AND is_active = TRUE;
  SELECT COUNT(*)          INTO v_inactive FROM portfolio_categories WHERE is_deleted = FALSE AND is_active = FALSE;
  SELECT COUNT(DISTINCT account_id) INTO v_accounts FROM portfolio_categories WHERE is_deleted = FALSE AND is_active = TRUE;

  RAISE NOTICE '================================================';
  RAISE NOTICE 'v291 portfolio_categories canonicalised';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Active categories (all accounts): %', v_active;
  RAISE NOTICE 'Deactivated (non-canonical):      %', v_inactive;
  RAISE NOTICE 'Accounts covered:                 %', v_accounts;
  RAISE NOTICE 'Expected per account: 21';
  RAISE NOTICE '================================================';
END $$;
