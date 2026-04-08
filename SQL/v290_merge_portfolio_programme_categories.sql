-- =============================================================================
-- v290: Merge Portfolio & Programme Categories
-- Purpose: Align portfolio_categories with programme best-practice categories.
--          Where both lists had the same concept, programme names take precedence.
--          New programme-specific categories are added to all accounts.
-- Safe to re-run: UPDATE uses WHERE name = old_name; INSERT uses ON CONFLICT.
-- =============================================================================

-- =============================================================================
-- SECTION 1: Rename existing categories where programme name takes precedence
-- =============================================================================

-- IT & Technology  →  Technology & IT
UPDATE portfolio_categories
SET name = 'Technology & IT', updated_at = NOW()
WHERE name = 'IT & Technology' AND is_deleted = FALSE;

-- Innovation  →  Digital Innovation
UPDATE portfolio_categories
SET name = 'Digital Innovation', updated_at = NOW()
WHERE name = 'Innovation' AND is_deleted = FALSE;

-- Infrastructure  →  Infrastructure & Facilities
UPDATE portfolio_categories
SET name = 'Infrastructure & Facilities', updated_at = NOW()
WHERE name = 'Infrastructure' AND is_deleted = FALSE;

-- Compliance & Risk  →  Regulatory & Compliance
UPDATE portfolio_categories
SET name = 'Regulatory & Compliance', updated_at = NOW()
WHERE name = 'Compliance & Risk' AND is_deleted = FALSE;

-- Product  →  Product Development
UPDATE portfolio_categories
SET name = 'Product Development', updated_at = NOW()
WHERE name = 'Product' AND is_deleted = FALSE;

-- Customer & Marketing  →  Customer Experience
UPDATE portfolio_categories
SET name = 'Customer Experience', updated_at = NOW()
WHERE name = 'Customer & Marketing' AND is_deleted = FALSE;

-- Strategic Initiatives  →  Strategic Growth
UPDATE portfolio_categories
SET name = 'Strategic Growth', updated_at = NOW()
WHERE name = 'Strategic Initiatives' AND is_deleted = FALSE;

-- =============================================================================
-- SECTION 2: Move "Other" to the end (sort_order = 99)
-- =============================================================================

UPDATE portfolio_categories
SET sort_order = 99, updated_at = NOW()
WHERE code = 'OTHER' AND is_deleted = FALSE;

-- =============================================================================
-- SECTION 3: Add programme-specific categories to all accounts
-- =============================================================================

-- Business Transformation
INSERT INTO portfolio_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Business Transformation', 'BIZ_TRANSFORM',
       'Programmes driving fundamental change in business models or operations', 12, true, false
FROM accounts a
WHERE (a.is_deleted = FALSE OR a.is_deleted IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM portfolio_categories pc
    WHERE pc.account_id = a.id AND pc.code = 'BIZ_TRANSFORM' AND pc.is_deleted = FALSE
  );

-- Operational Excellence
INSERT INTO portfolio_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Operational Excellence', 'OPS_EXCELLENCE',
       'Programmes focused on improving efficiency, quality and performance', 13, true, false
FROM accounts a
WHERE (a.is_deleted = FALSE OR a.is_deleted IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM portfolio_categories pc
    WHERE pc.account_id = a.id AND pc.code = 'OPS_EXCELLENCE' AND pc.is_deleted = FALSE
  );

-- Merger & Acquisition
INSERT INTO portfolio_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Merger & Acquisition', 'M_AND_A',
       'Programmes related to mergers, acquisitions and integrations', 14, true, false
FROM accounts a
WHERE (a.is_deleted = FALSE OR a.is_deleted IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM portfolio_categories pc
    WHERE pc.account_id = a.id AND pc.code = 'M_AND_A' AND pc.is_deleted = FALSE
  );

-- Sustainability & ESG
INSERT INTO portfolio_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Sustainability & ESG', 'ESG',
       'Environmental, social and governance programmes', 15, true, false
FROM accounts a
WHERE (a.is_deleted = FALSE OR a.is_deleted IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM portfolio_categories pc
    WHERE pc.account_id = a.id AND pc.code = 'ESG' AND pc.is_deleted = FALSE
  );

-- Human Capital & Workforce
INSERT INTO portfolio_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Human Capital & Workforce', 'HR_WORKFORCE',
       'Programmes related to talent, workforce development and HR transformation', 16, true, false
FROM accounts a
WHERE (a.is_deleted = FALSE OR a.is_deleted IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM portfolio_categories pc
    WHERE pc.account_id = a.id AND pc.code = 'HR_WORKFORCE' AND pc.is_deleted = FALSE
  );

-- Finance & Cost Optimisation
INSERT INTO portfolio_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Finance & Cost Optimisation', 'FINANCE',
       'Programmes focused on financial management and cost reduction', 17, true, false
FROM accounts a
WHERE (a.is_deleted = FALSE OR a.is_deleted IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM portfolio_categories pc
    WHERE pc.account_id = a.id AND pc.code = 'FINANCE' AND pc.is_deleted = FALSE
  );

-- Cybersecurity
INSERT INTO portfolio_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Cybersecurity', 'CYBER',
       'Programmes related to information security and cyber resilience', 18, true, false
FROM accounts a
WHERE (a.is_deleted = FALSE OR a.is_deleted IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM portfolio_categories pc
    WHERE pc.account_id = a.id AND pc.code = 'CYBER' AND pc.is_deleted = FALSE
  );

-- Data & Analytics
INSERT INTO portfolio_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Data & Analytics', 'DATA_ANALYTICS',
       'Programmes related to data management, BI and analytics platforms', 19, true, false
FROM accounts a
WHERE (a.is_deleted = FALSE OR a.is_deleted IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM portfolio_categories pc
    WHERE pc.account_id = a.id AND pc.code = 'DATA_ANALYTICS' AND pc.is_deleted = FALSE
  );

-- Market Expansion
INSERT INTO portfolio_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Market Expansion', 'MARKET_EXP',
       'Programmes targeting new markets, geographies or customer segments', 20, true, false
FROM accounts a
WHERE (a.is_deleted = FALSE OR a.is_deleted IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM portfolio_categories pc
    WHERE pc.account_id = a.id AND pc.code = 'MARKET_EXP' AND pc.is_deleted = FALSE
  );

-- Risk & Governance
INSERT INTO portfolio_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Risk & Governance', 'RISK_GOV',
       'Programmes focused on enterprise risk management and governance frameworks', 21, true, false
FROM accounts a
WHERE (a.is_deleted = FALSE OR a.is_deleted IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM portfolio_categories pc
    WHERE pc.account_id = a.id AND pc.code = 'RISK_GOV' AND pc.is_deleted = FALSE
  );

-- =============================================================================
-- Verification
-- =============================================================================

DO $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT name) INTO v_count
  FROM portfolio_categories WHERE is_deleted = FALSE AND is_active = TRUE;
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v290 Portfolio/Programme Categories Merged';
  RAISE NOTICE 'Distinct active category names: %', v_count;
  RAISE NOTICE '================================================';
END $$;
