-- ================================================
-- File: v272_seed_budget_categories.sql
-- Description: Seed best-practice budget category labels per organisation.
-- Prerequisites: v271_budget_categories_master.sql (budget_categories table).
-- Safe to re-run: only inserts where (account_id, code) does not already exist.
-- ================================================

INSERT INTO budget_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Labour', 'LABOUR', 'Labour and personnel costs', 1, true, false
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM budget_categories b WHERE b.account_id = a.id AND b.code = 'LABOUR');

INSERT INTO budget_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Machinery & Equipment', 'MACHINERY', 'Machinery, plant and equipment', 2, true, false
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM budget_categories b WHERE b.account_id = a.id AND b.code = 'MACHINERY');

INSERT INTO budget_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Materials', 'MATERIALS', 'Raw materials and consumables', 3, true, false
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM budget_categories b WHERE b.account_id = a.id AND b.code = 'MATERIALS');

INSERT INTO budget_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Overhead', 'OVERHEAD', 'Indirect and overhead costs', 4, true, false
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM budget_categories b WHERE b.account_id = a.id AND b.code = 'OVERHEAD');

INSERT INTO budget_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Contingency', 'CONTINGENCY', 'Contingency reserve', 5, true, false
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM budget_categories b WHERE b.account_id = a.id AND b.code = 'CONTINGENCY');

INSERT INTO budget_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Travel', 'TRAVEL', 'Travel and subsistence', 6, true, false
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM budget_categories b WHERE b.account_id = a.id AND b.code = 'TRAVEL');

INSERT INTO budget_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Training', 'TRAINING', 'Training and development', 7, true, false
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM budget_categories b WHERE b.account_id = a.id AND b.code = 'TRAINING');

INSERT INTO budget_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Software & Licences', 'SOFTWARE', 'Software, licences and subscriptions', 8, true, false
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM budget_categories b WHERE b.account_id = a.id AND b.code = 'SOFTWARE');

INSERT INTO budget_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'External Consultants', 'CONSULTANTS', 'External consultancy and professional services', 9, true, false
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM budget_categories b WHERE b.account_id = a.id AND b.code = 'CONSULTANTS');

INSERT INTO budget_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Facilities & Premises', 'FACILITIES', 'Facilities, premises and utilities', 10, true, false
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM budget_categories b WHERE b.account_id = a.id AND b.code = 'FACILITIES');

INSERT INTO budget_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Marketing & Communications', 'MARKETING', 'Marketing and communications', 11, true, false
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM budget_categories b WHERE b.account_id = a.id AND b.code = 'MARKETING');

INSERT INTO budget_categories (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Other', 'OTHER', 'Other budget items', 12, true, false
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM budget_categories b WHERE b.account_id = a.id AND b.code = 'OTHER');
