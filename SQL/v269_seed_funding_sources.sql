-- ================================================
-- File: v269_seed_funding_sources.sql
-- Description: Prepopulate funding_sources with best-practice categories per organisation.
-- Prerequisites: v268_funding_sources_and_budget_categories.sql (funding_sources table, accounts table).
-- Safe to re-run: only inserts where (account_id, code) does not already exist.
-- ================================================

-- Seed best-practice funding source categories for every existing account
-- Each INSERT adds one category for each account that doesn't already have that code

INSERT INTO funding_sources (account_id, name, code, description, is_active, is_deleted)
SELECT a.id, 'Donors', 'DONORS', 'Donor funding and contributions', true, false
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM funding_sources f WHERE f.account_id = a.id AND f.code = 'DONORS');

INSERT INTO funding_sources (account_id, name, code, description, is_active, is_deleted)
SELECT a.id, 'Government Grant', 'GOV_GRANT', 'Government grants and subsidies', true, false
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM funding_sources f WHERE f.account_id = a.id AND f.code = 'GOV_GRANT');

INSERT INTO funding_sources (account_id, name, code, description, is_active, is_deleted)
SELECT a.id, 'Internal / Corporate Budget', 'INTERNAL', 'Internal or corporate budget allocation', true, false
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM funding_sources f WHERE f.account_id = a.id AND f.code = 'INTERNAL');

INSERT INTO funding_sources (account_id, name, code, description, is_active, is_deleted)
SELECT a.id, 'Client / Customer', 'CLIENT', 'Client or customer funding', true, false
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM funding_sources f WHERE f.account_id = a.id AND f.code = 'CLIENT');

INSERT INTO funding_sources (account_id, name, code, description, is_active, is_deleted)
SELECT a.id, 'Loan / Financing', 'LOAN', 'Bank loan or other financing', true, false
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM funding_sources f WHERE f.account_id = a.id AND f.code = 'LOAN');

INSERT INTO funding_sources (account_id, name, code, description, is_active, is_deleted)
SELECT a.id, 'Partner / Consortium', 'PARTNER', 'Partner or consortium funding', true, false
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM funding_sources f WHERE f.account_id = a.id AND f.code = 'PARTNER');

INSERT INTO funding_sources (account_id, name, code, description, is_active, is_deleted)
SELECT a.id, 'Sponsorship', 'SPONSOR', 'Sponsorship income', true, false
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM funding_sources f WHERE f.account_id = a.id AND f.code = 'SPONSOR');

INSERT INTO funding_sources (account_id, name, code, description, is_active, is_deleted)
SELECT a.id, 'Retained Earnings / Self-funded', 'RETAINED', 'Retained earnings or self-funding', true, false
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM funding_sources f WHERE f.account_id = a.id AND f.code = 'RETAINED');

INSERT INTO funding_sources (account_id, name, code, description, is_active, is_deleted)
SELECT a.id, 'EU / International Grant', 'EU_GRANT', 'EU or international grant', true, false
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM funding_sources f WHERE f.account_id = a.id AND f.code = 'EU_GRANT');

INSERT INTO funding_sources (account_id, name, code, description, is_active, is_deleted)
SELECT a.id, 'Foundation / NGO', 'FOUNDATION', 'Foundation or NGO grant', true, false
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM funding_sources f WHERE f.account_id = a.id AND f.code = 'FOUNDATION');

INSERT INTO funding_sources (account_id, name, code, description, is_active, is_deleted)
SELECT a.id, 'IT Department Budget', 'IT_DEPT', 'IT department budget allocation', true, false
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM funding_sources f WHERE f.account_id = a.id AND f.code = 'IT_DEPT');

INSERT INTO funding_sources (account_id, name, code, description, is_active, is_deleted)
SELECT a.id, 'Capital Expenditure (CapEx)', 'CAPEX', 'Capital expenditure allocation', true, false
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM funding_sources f WHERE f.account_id = a.id AND f.code = 'CAPEX');

INSERT INTO funding_sources (account_id, name, code, description, is_active, is_deleted)
SELECT a.id, 'Operational Expenditure (OpEx)', 'OPEX', 'Operational expenditure allocation', true, false
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM funding_sources f WHERE f.account_id = a.id AND f.code = 'OPEX');
