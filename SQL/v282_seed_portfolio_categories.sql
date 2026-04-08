-- =============================================================================
-- v282: Seed portfolio categories (best practice)
-- Purpose: Insert default portfolio category options per organisation (account).
-- Prerequisites: v280_portfolio_categories_and_codes.sql (portfolio_categories table).
-- Safe to re-run: only inserts where (account_id, code) does not already exist.
-- Schema: public (platform)
-- =============================================================================

-- Best-practice portfolio categories for classifying portfolios (e.g. IT, Business, Infrastructure).
-- One row per account per code; skips accounts that already have that code.

INSERT INTO portfolio_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'IT & Technology', 'IT', 'Information technology and digital portfolios', 1, true, false
FROM accounts a
WHERE (a.is_deleted = FALSE OR a.is_deleted IS NULL)
  AND NOT EXISTS (SELECT 1 FROM portfolio_categories pc WHERE pc.account_id = a.id AND pc.code = 'IT' AND pc.is_deleted = FALSE);

INSERT INTO portfolio_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Business & Operations', 'BUSINESS', 'Business and operational portfolios', 2, true, false
FROM accounts a
WHERE (a.is_deleted = FALSE OR a.is_deleted IS NULL)
  AND NOT EXISTS (SELECT 1 FROM portfolio_categories pc WHERE pc.account_id = a.id AND pc.code = 'BUSINESS' AND pc.is_deleted = FALSE);

INSERT INTO portfolio_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Infrastructure', 'INFRASTRUCTURE', 'Infrastructure and facilities portfolios', 3, true, false
FROM accounts a
WHERE (a.is_deleted = FALSE OR a.is_deleted IS NULL)
  AND NOT EXISTS (SELECT 1 FROM portfolio_categories pc WHERE pc.account_id = a.id AND pc.code = 'INFRASTRUCTURE' AND pc.is_deleted = FALSE);

INSERT INTO portfolio_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Product', 'PRODUCT', 'Product development and lifecycle portfolios', 4, true, false
FROM accounts a
WHERE (a.is_deleted = FALSE OR a.is_deleted IS NULL)
  AND NOT EXISTS (SELECT 1 FROM portfolio_categories pc WHERE pc.account_id = a.id AND pc.code = 'PRODUCT' AND pc.is_deleted = FALSE);

INSERT INTO portfolio_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Research & Development', 'R&D', 'Research and development portfolios', 5, true, false
FROM accounts a
WHERE (a.is_deleted = FALSE OR a.is_deleted IS NULL)
  AND NOT EXISTS (SELECT 1 FROM portfolio_categories pc WHERE pc.account_id = a.id AND pc.code = 'R&D' AND pc.is_deleted = FALSE);

INSERT INTO portfolio_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Innovation', 'INNOVATION', 'Innovation and transformation portfolios', 6, true, false
FROM accounts a
WHERE (a.is_deleted = FALSE OR a.is_deleted IS NULL)
  AND NOT EXISTS (SELECT 1 FROM portfolio_categories pc WHERE pc.account_id = a.id AND pc.code = 'INNOVATION' AND pc.is_deleted = FALSE);

INSERT INTO portfolio_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Compliance & Risk', 'COMPLIANCE', 'Compliance, risk and regulatory portfolios', 7, true, false
FROM accounts a
WHERE (a.is_deleted = FALSE OR a.is_deleted IS NULL)
  AND NOT EXISTS (SELECT 1 FROM portfolio_categories pc WHERE pc.account_id = a.id AND pc.code = 'COMPLIANCE' AND pc.is_deleted = FALSE);

INSERT INTO portfolio_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Customer & Marketing', 'CUSTOMER', 'Customer-facing and marketing portfolios', 8, true, false
FROM accounts a
WHERE (a.is_deleted = FALSE OR a.is_deleted IS NULL)
  AND NOT EXISTS (SELECT 1 FROM portfolio_categories pc WHERE pc.account_id = a.id AND pc.code = 'CUSTOMER' AND pc.is_deleted = FALSE);

INSERT INTO portfolio_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Shared Services', 'SHARED_SERVICES', 'Shared services and central functions', 9, true, false
FROM accounts a
WHERE (a.is_deleted = FALSE OR a.is_deleted IS NULL)
  AND NOT EXISTS (SELECT 1 FROM portfolio_categories pc WHERE pc.account_id = a.id AND pc.code = 'SHARED_SERVICES' AND pc.is_deleted = FALSE);

INSERT INTO portfolio_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Strategic Initiatives', 'STRATEGIC', 'Strategic and enterprise-wide initiatives', 10, true, false
FROM accounts a
WHERE (a.is_deleted = FALSE OR a.is_deleted IS NULL)
  AND NOT EXISTS (SELECT 1 FROM portfolio_categories pc WHERE pc.account_id = a.id AND pc.code = 'STRATEGIC' AND pc.is_deleted = FALSE);

INSERT INTO portfolio_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Other', 'OTHER', 'Other portfolio category', 11, true, false
FROM accounts a
WHERE (a.is_deleted = FALSE OR a.is_deleted IS NULL)
  AND NOT EXISTS (SELECT 1 FROM portfolio_categories pc WHERE pc.account_id = a.id AND pc.code = 'OTHER' AND pc.is_deleted = FALSE);
