-- =============================================================================
-- v305: Seed Portfolio, Programme, Projects and assign stakeholders
-- 1a) Portfolios (incl. sub-portfolios): 10 records
-- 1b) Programmes: 15 records
-- 1c) Projects: 20 total (5 independent, 15 linked to portfolio/programme)
-- 2) Randomly assign 53 stakeholders to the 20 projects; leave 7 unassigned
-- Prerequisites: v36 (portfolios), v37 (programmes), v04 (projects), v304.2/v304.6 (stakeholders)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1a) PORTFOLIOS (10): 4 parent + 6 sub-portfolios
-- -----------------------------------------------------------------------------
INSERT INTO portfolios (portfolio_code, portfolio_name, portfolio_description, portfolio_type, portfolio_status, parent_portfolio_id, portfolio_level, is_deleted)
VALUES
  ('SEED-PORT-01', 'Enterprise Technology Portfolio', 'Core IT and digital portfolio', 'strategic', 'active', NULL, 1, false),
  ('SEED-PORT-02', 'Business Transformation Portfolio', 'Change and transformation initiatives', 'strategic', 'active', NULL, 1, false),
  ('SEED-PORT-03', 'Operations & Compliance Portfolio', 'Operational and regulatory programmes', 'operational', 'active', NULL, 1, false),
  ('SEED-PORT-04', 'Innovation & Product Portfolio', 'R&D and product development', 'innovation', 'active', NULL, 1, false)
ON CONFLICT (portfolio_code) DO NOTHING;

-- Sub-portfolios (under first two parents)
INSERT INTO portfolios (portfolio_code, portfolio_name, portfolio_description, portfolio_type, portfolio_status, parent_portfolio_id, portfolio_level, is_deleted)
SELECT 'SEED-PORT-05', 'Cloud & Infrastructure Sub-Portfolio', 'Cloud and infra under Enterprise Tech', 'operational', 'active', p.id, 2, false
FROM portfolios p WHERE p.portfolio_code = 'SEED-PORT-01' AND p.is_deleted = false LIMIT 1
ON CONFLICT (portfolio_code) DO NOTHING;

INSERT INTO portfolios (portfolio_code, portfolio_name, portfolio_description, portfolio_type, portfolio_status, parent_portfolio_id, portfolio_level, is_deleted)
SELECT 'SEED-PORT-06', 'Applications Sub-Portfolio', 'Application delivery under Enterprise Tech', 'operational', 'active', p.id, 2, false
FROM portfolios p WHERE p.portfolio_code = 'SEED-PORT-01' AND p.is_deleted = false LIMIT 1
ON CONFLICT (portfolio_code) DO NOTHING;

INSERT INTO portfolios (portfolio_code, portfolio_name, portfolio_description, portfolio_type, portfolio_status, parent_portfolio_id, portfolio_level, is_deleted)
SELECT 'SEED-PORT-07', 'Process Excellence Sub-Portfolio', 'Process improvement under Transformation', 'operational', 'active', p.id, 2, false
FROM portfolios p WHERE p.portfolio_code = 'SEED-PORT-02' AND p.is_deleted = false LIMIT 1
ON CONFLICT (portfolio_code) DO NOTHING;

INSERT INTO portfolios (portfolio_code, portfolio_name, portfolio_description, portfolio_type, portfolio_status, parent_portfolio_id, portfolio_level, is_deleted)
SELECT 'SEED-PORT-08', 'Customer Experience Sub-Portfolio', 'CX initiatives under Transformation', 'innovation', 'active', p.id, 2, false
FROM portfolios p WHERE p.portfolio_code = 'SEED-PORT-02' AND p.is_deleted = false LIMIT 1
ON CONFLICT (portfolio_code) DO NOTHING;

INSERT INTO portfolios (portfolio_code, portfolio_name, portfolio_description, portfolio_type, portfolio_status, parent_portfolio_id, portfolio_level, is_deleted)
SELECT 'SEED-PORT-09', 'Regulatory Programmes Sub-Portfolio', 'Compliance under Ops & Compliance', 'compliance', 'active', p.id, 2, false
FROM portfolios p WHERE p.portfolio_code = 'SEED-PORT-03' AND p.is_deleted = false LIMIT 1
ON CONFLICT (portfolio_code) DO NOTHING;

INSERT INTO portfolios (portfolio_code, portfolio_name, portfolio_description, portfolio_type, portfolio_status, parent_portfolio_id, portfolio_level, is_deleted)
SELECT 'SEED-PORT-10', 'New Product Development Sub-Portfolio', 'NPD under Innovation', 'innovation', 'active', p.id, 2, false
FROM portfolios p WHERE p.portfolio_code = 'SEED-PORT-04' AND p.is_deleted = false LIMIT 1
ON CONFLICT (portfolio_code) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 1b) PROGRAMMES (15)
-- -----------------------------------------------------------------------------
INSERT INTO programmes (programme_code, programme_name, programme_description, programme_type, programme_status, portfolio_id, is_deleted)
SELECT 'SEED-PROG-01', 'Digital Workplace Programme', 'Modern workplace and collaboration', 'technology', 'active', p.id, false FROM portfolios p WHERE p.portfolio_code = 'SEED-PORT-01' AND p.is_deleted = false LIMIT 1
ON CONFLICT (programme_code) DO NOTHING;
INSERT INTO programmes (programme_code, programme_name, programme_description, programme_type, programme_status, portfolio_id, is_deleted)
SELECT 'SEED-PROG-02', 'Data & Analytics Programme', 'Enterprise data and BI', 'technology', 'active', p.id, false FROM portfolios p WHERE p.portfolio_code = 'SEED-PORT-01' AND p.is_deleted = false LIMIT 1
ON CONFLICT (programme_code) DO NOTHING;
INSERT INTO programmes (programme_code, programme_name, programme_description, programme_type, programme_status, portfolio_id, is_deleted)
SELECT 'SEED-PROG-03', 'ERP Transformation Programme', 'Core ERP replacement', 'business_transformation', 'active', p.id, false FROM portfolios p WHERE p.portfolio_code = 'SEED-PORT-02' AND p.is_deleted = false LIMIT 1
ON CONFLICT (programme_code) DO NOTHING;
INSERT INTO programmes (programme_code, programme_name, programme_description, programme_type, programme_status, portfolio_id, is_deleted)
SELECT 'SEED-PROG-04', 'Customer Journey Programme', 'End-to-end customer journey', 'business_transformation', 'active', p.id, false FROM portfolios p WHERE p.portfolio_code = 'SEED-PORT-02' AND p.is_deleted = false LIMIT 1
ON CONFLICT (programme_code) DO NOTHING;
INSERT INTO programmes (programme_code, programme_name, programme_description, programme_type, programme_status, portfolio_id, is_deleted)
SELECT 'SEED-PROG-05', 'Risk & Control Programme', 'Risk and control framework', 'regulatory', 'active', p.id, false FROM portfolios p WHERE p.portfolio_code = 'SEED-PORT-03' AND p.is_deleted = false LIMIT 1
ON CONFLICT (programme_code) DO NOTHING;
INSERT INTO programmes (programme_code, programme_name, programme_description, programme_type, programme_status, portfolio_id, is_deleted)
SELECT 'SEED-PROG-06', 'Quality & Audit Programme', 'Quality and audit initiatives', 'compliance', 'active', p.id, false FROM portfolios p WHERE p.portfolio_code = 'SEED-PORT-03' AND p.is_deleted = false LIMIT 1
ON CONFLICT (programme_code) DO NOTHING;
INSERT INTO programmes (programme_code, programme_name, programme_description, programme_type, programme_status, portfolio_id, is_deleted)
SELECT 'SEED-PROG-07', 'Product Roadmap Programme', 'Product lifecycle and roadmap', 'product', 'active', p.id, false FROM portfolios p WHERE p.portfolio_code = 'SEED-PORT-04' AND p.is_deleted = false LIMIT 1
ON CONFLICT (programme_code) DO NOTHING;
INSERT INTO programmes (programme_code, programme_name, programme_description, programme_type, programme_status, portfolio_id, is_deleted)
SELECT 'SEED-PROG-08', 'Cloud Migration Programme', 'Cloud adoption and migration', 'technology', 'active', p.id, false FROM portfolios p WHERE p.portfolio_code = 'SEED-PORT-05' AND p.is_deleted = false LIMIT 1
ON CONFLICT (programme_code) DO NOTHING;
INSERT INTO programmes (programme_code, programme_name, programme_description, programme_type, programme_status, portfolio_id, is_deleted)
SELECT 'SEED-PROG-09', 'API & Integration Programme', 'API and integration platform', 'technology', 'active', p.id, false FROM portfolios p WHERE p.portfolio_code = 'SEED-PORT-06' AND p.is_deleted = false LIMIT 1
ON CONFLICT (programme_code) DO NOTHING;
INSERT INTO programmes (programme_code, programme_name, programme_description, programme_type, programme_status, portfolio_id, is_deleted)
SELECT 'SEED-PROG-10', 'Process Automation Programme', 'RPA and process automation', 'business_transformation', 'active', p.id, false FROM portfolios p WHERE p.portfolio_code = 'SEED-PORT-07' AND p.is_deleted = false LIMIT 1
ON CONFLICT (programme_code) DO NOTHING;
INSERT INTO programmes (programme_code, programme_name, programme_description, programme_type, programme_status, portfolio_id, is_deleted)
SELECT 'SEED-PROG-11', 'CX Design Programme', 'Customer experience design', 'product', 'active', p.id, false FROM portfolios p WHERE p.portfolio_code = 'SEED-PORT-08' AND p.is_deleted = false LIMIT 1
ON CONFLICT (programme_code) DO NOTHING;
INSERT INTO programmes (programme_code, programme_name, programme_description, programme_type, programme_status, portfolio_id, is_deleted)
SELECT 'SEED-PROG-12', 'Regulatory Reporting Programme', 'Regulatory reporting and submissions', 'regulatory', 'active', p.id, false FROM portfolios p WHERE p.portfolio_code = 'SEED-PORT-09' AND p.is_deleted = false LIMIT 1
ON CONFLICT (programme_code) DO NOTHING;
INSERT INTO programmes (programme_code, programme_name, programme_description, programme_type, programme_status, portfolio_id, is_deleted)
SELECT 'SEED-PROG-13', 'New Product Launch Programme', 'NPD and launch pipeline', 'product', 'active', p.id, false FROM portfolios p WHERE p.portfolio_code = 'SEED-PORT-10' AND p.is_deleted = false LIMIT 1
ON CONFLICT (programme_code) DO NOTHING;
INSERT INTO programmes (programme_code, programme_name, programme_description, programme_type, programme_status, portfolio_id, is_deleted)
VALUES ('SEED-PROG-14', 'Standalone Security Programme', 'Security and resilience', 'technology', 'planning', NULL, false)
ON CONFLICT (programme_code) DO NOTHING;
INSERT INTO programmes (programme_code, programme_name, programme_description, programme_type, programme_status, portfolio_id, is_deleted)
VALUES ('SEED-PROG-15', 'Standalone Sustainability Programme', 'Sustainability and ESG', 'regulatory', 'planning', NULL, false)
ON CONFLICT (programme_code) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 1c) PROJECTS (20): 5 independent + 15 to be linked to portfolio/programme
-- -----------------------------------------------------------------------------
INSERT INTO projects (project_code, project_name, project_description, is_deleted)
VALUES
  ('SEED-PP-01', 'Digital Workspace Rollout', 'Company-wide digital workspace', false),
  ('SEED-PP-02', 'BI Platform Implementation', 'Enterprise BI and reporting', false),
  ('SEED-PP-03', 'ERP Phase 1', 'ERP implementation phase 1', false),
  ('SEED-PP-04', 'CRM Enhancement', 'CRM upgrade and CX', false),
  ('SEED-PP-05', 'Control Framework Update', 'Risk control framework', false),
  ('SEED-PP-06', 'Audit System Replacement', 'New audit management system', false),
  ('SEED-PP-07', 'Product Backlog Modernisation', 'Product backlog and prioritisation', false),
  ('SEED-PP-08', 'Cloud Landing Zone', 'Cloud foundation project', false),
  ('SEED-PP-09', 'Integration Hub', 'Central integration platform', false),
  ('SEED-PP-10', 'RPA Pilot', 'RPA pilot processes', false),
  ('SEED-PP-11', 'Journey Mapping', 'Customer journey mapping', false),
  ('SEED-PP-12', 'Regulatory Returns Automation', 'Automated regulatory returns', false),
  ('SEED-PP-13', 'Product Alpha Launch', 'First product alpha', false),
  ('SEED-PP-14', 'Security Awareness', 'Security awareness programme', false),
  ('SEED-PP-15', 'Carbon Reporting', 'Carbon and ESG reporting', false),
  ('SEED-IND-01', 'Independent Research Project', 'Standalone research initiative', false),
  ('SEED-IND-02', 'Independent Process Review', 'Ad-hoc process review', false),
  ('SEED-IND-03', 'Independent Feasibility Study', 'Feasibility and options', false),
  ('SEED-IND-04', 'Independent Training Rollout', 'Training and enablement', false),
  ('SEED-IND-05', 'Independent Legacy Decommission', 'Legacy system decommission', false)
ON CONFLICT (project_code) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Link 15 projects to portfolios (SEED-PP-01..15; exclude SEED-IND-*)
-- Use WHERE NOT EXISTS to avoid ON CONFLICT constraint mismatch across schemas.
-- -----------------------------------------------------------------------------
INSERT INTO portfolio_projects (portfolio_id, project_id, assignment_status, portfolio_priority, is_deleted)
SELECT port.id, proj.id, 'active', 'high', false
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY portfolio_code) AS rn FROM portfolios WHERE portfolio_code LIKE 'SEED-PORT-%' AND is_deleted = false) port,
     (SELECT id, ROW_NUMBER() OVER (ORDER BY project_code) AS rn FROM projects WHERE project_code LIKE 'SEED-PP-%' AND is_deleted = false) proj
WHERE port.rn = ((proj.rn - 1) % 10) + 1
  AND NOT EXISTS (
    SELECT 1 FROM portfolio_projects pp
    WHERE pp.portfolio_id = port.id AND pp.project_id = proj.id AND (pp.is_deleted = false OR pp.is_deleted IS NULL)
  );

-- -----------------------------------------------------------------------------
-- Link 15 projects to programmes (one project per programme for first 15 programmes)
-- Use WHERE NOT EXISTS to avoid ON CONFLICT constraint mismatch across schemas.
-- -----------------------------------------------------------------------------
INSERT INTO programme_projects (programme_id, project_id, assignment_status, programme_priority, is_deleted)
SELECT prog.id, proj.id, 'active', 'high', false
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY programme_code) AS rn FROM programmes WHERE programme_code LIKE 'SEED-PROG-%' AND is_deleted = false LIMIT 15) prog,
     (SELECT id, ROW_NUMBER() OVER (ORDER BY project_code) AS rn FROM projects WHERE project_code LIKE 'SEED-PP-%' AND is_deleted = false) proj
WHERE prog.rn = proj.rn
  AND NOT EXISTS (
    SELECT 1 FROM programme_projects prp
    WHERE prp.programme_id = prog.id AND prp.project_id = proj.id AND (prp.is_deleted = false OR prp.is_deleted IS NULL)
  );

-- -----------------------------------------------------------------------------
-- 2) Assign 53 stakeholders to the 20 projects at random; leave 7 unassigned
-- -----------------------------------------------------------------------------
WITH to_assign AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY random()) AS rn
  FROM stakeholders
  WHERE is_deleted = false AND project_id IS NULL
  LIMIT 53
),
proj_pool AS (
  SELECT id FROM projects WHERE is_deleted = false AND (project_code LIKE 'SEED-PP-%' OR project_code LIKE 'SEED-IND-%')
),
random_projs AS (
  SELECT (SELECT id FROM proj_pool ORDER BY random() LIMIT 1) AS proj_id, g.n AS rn
  FROM generate_series(1, 53) g(n)
),
assignments AS (
  SELECT t.id AS stake_id, r.proj_id
  FROM to_assign t
  JOIN random_projs r ON t.rn = r.rn
)
UPDATE stakeholders st
SET project_id = a.proj_id
FROM assignments a
WHERE st.id = a.stake_id;
