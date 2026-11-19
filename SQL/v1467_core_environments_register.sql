-- ============================================================================
-- v1467: One Environments register for every project (v1342, slice 2)
-- ============================================================================
-- PRD projectprd/v1342_merged_environments_register_PRD.md, plan projectplan/v1342_…_plan.md
-- (D1–D10, owner approval 2026-11-14; CLAUDE.md rule 74 — a thin hand-built form moves to the
-- register engine).
--
-- System register core_environments (…9100-…002), scope 'project', used by every project
-- whatever its industry. It holds every generic field of the Banking Environments register
-- (v1307 / v1346) and the IT Environments register (v1411), once each, worded for any industry:
--   Details · Cloud Setup* · Cloud Compliance* · Infrastructure* · Connection Details · Database ·
--   Availability & Refresh · Access & Bookings · Health & Issues · Banking† · Notes
--   * by Hosting Model (as v1346)   † Banking & Financial Services projects only (visible_when
--   project_industry, engine change in v1342 slice 1)
-- Statuses: Not Provisioned · Provisioned · Ready · In Use · Issue · Decommissioned.
-- The built-in Title is the environment name and the built-in Description its purpose.
-- This file only defines the register. Records move across in v1468; menus change in v1469.
-- Simulator: practice projects use this same public definition (is_system_register).
-- Idempotent.
-- ============================================================================

INSERT INTO public.local_registers (id, register_key, label, icon, description, scope_level, account_id, status_workflow, is_system_defined, is_active, created_at, updated_at)
VALUES (
  '00000000-0000-4000-9100-000000000002', 'core_environments', 'Environments', 'server',
  'The project''s environments (development, test, UAT, production, DR and others): where each is hosted, how to reach it, when it is available and who uses it',
  'project', NULL,
  '[{"key":"not_provisioned","label":"Not Provisioned"},{"key":"provisioned","label":"Provisioned"},{"key":"ready","label":"Ready"},{"key":"in_use","label":"In Use"},{"key":"issue","label":"Issue"},{"key":"decommissioned","label":"Decommissioned"}]'::jsonb,
  TRUE, TRUE, NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, icon = EXCLUDED.icon,
  scope_level = EXCLUDED.scope_level, status_workflow = EXCLUDED.status_workflow,
  is_system_defined = TRUE, is_active = TRUE, updated_at = NOW();

INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, visible_when)
SELECT '00000000-0000-4000-9100-000000000002'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group,
       v.dropdown_options::jsonb,
       CASE v.shown_for
         WHEN 'cloud' THEN '{"field":"hosting_model","in":["cloud","hybrid"]}'::jsonb
         WHEN 'non_cloud' THEN '{"field":"hosting_model","in":["on_premise","hybrid"]}'::jsonb
         WHEN 'banking' THEN '{"project_industry":["Banking & Financial Services"]}'::jsonb
       END
FROM (VALUES
  -- Details
  ('environment_type', 'Environment Type', 'dropdown', 0, NULL,
    '[{"value":"development","label":"Development"},{"value":"test","label":"System Test"},{"value":"sit","label":"SIT"},{"value":"uat","label":"UAT"},{"value":"performance","label":"Performance"},{"value":"migration","label":"Migration Rehearsal"},{"value":"training","label":"Training"},{"value":"pre_production","label":"Pre-Production"},{"value":"production","label":"Production"},{"value":"dr","label":"Disaster Recovery"}]', NULL),
  ('environment_code', 'Environment Code', 'text', 1, NULL, NULL, NULL),
  ('used_by', 'Used By', 'text', 2, NULL, NULL, NULL),
  ('hosting_model', 'Hosting Model', 'dropdown', 3, NULL,
    '[{"value":"on_premise","label":"Non-cloud (on premise / data centre)"},{"value":"cloud","label":"Cloud"},{"value":"hybrid","label":"Hybrid (cloud and data centre)"}]', NULL),
  ('site', 'Data Centre / Site', 'dropdown', 4, NULL,
    '[{"value":"primary_dc","label":"Primary data centre"},{"value":"secondary_dc","label":"Secondary data centre"},{"value":"vendor","label":"Vendor / co-location data centre"}]', 'non_cloud'),
  ('environment_owner', 'Environment Owner', 'user_picker', 5, NULL, NULL, NULL),

  -- Cloud Setup (cloud / hybrid)
  ('cloud_provider', 'Cloud Provider', 'text', 10, 'Cloud Setup', NULL, 'cloud'),
  ('cloud_service_model', 'Service Model', 'dropdown', 11, 'Cloud Setup',
    '[{"value":"iaas","label":"Infrastructure as a service (IaaS)"},{"value":"paas","label":"Platform as a service (PaaS)"},{"value":"saas","label":"Software as a service (SaaS)"}]', 'cloud'),
  ('cloud_deployment_type', 'Deployment Type', 'dropdown', 12, 'Cloud Setup',
    '[{"value":"public","label":"Public cloud"},{"value":"private","label":"Private cloud"},{"value":"community","label":"Community / sector cloud"}]', 'cloud'),
  ('cloud_region', 'Region / Availability Zones', 'text', 13, 'Cloud Setup', NULL, 'cloud'),
  ('cloud_account', 'Subscription / Account / Tenant', 'text', 14, 'Cloud Setup', NULL, 'cloud'),
  ('cloud_network', 'Resource Group / Virtual Network', 'text', 15, 'Cloud Setup', NULL, 'cloud'),
  ('instance_size', 'Instance Type / Size', 'text', 16, 'Cloud Setup', NULL, 'cloud'),
  ('auto_scaling', 'Auto-Scaling Enabled', 'boolean', 17, 'Cloud Setup', NULL, 'cloud'),
  ('network_connectivity', 'Connectivity to the Organisation', 'dropdown', 18, 'Cloud Setup',
    '[{"value":"private_link","label":"Dedicated private connection"},{"value":"vpn","label":"Site-to-site VPN"},{"value":"internet","label":"Public internet (TLS)"}]', 'cloud'),

  -- Cloud Compliance (cloud / hybrid)
  ('data_residency', 'Data Residency (where data is stored)', 'text', 20, 'Cloud Compliance', NULL, 'cloud'),
  ('regulatory_approval', 'Regulatory / Compliance Approval Obtained', 'boolean', 21, 'Cloud Compliance', NULL, 'cloud'),
  ('regulatory_approval_reference', 'Approval Reference', 'text', 22, 'Cloud Compliance', NULL, 'cloud'),
  ('encryption_at_rest', 'Encryption at Rest', 'boolean', 23, 'Cloud Compliance', NULL, 'cloud'),
  ('key_management', 'Key Management', 'dropdown', 24, 'Cloud Compliance',
    '[{"value":"provider_managed","label":"Provider-managed keys"},{"value":"customer_managed","label":"Organisation-managed keys"},{"value":"hsm","label":"Organisation hardware security module"}]', 'cloud'),
  ('backup_dr_region', 'Backup / DR Region', 'text', 25, 'Cloud Compliance', NULL, 'cloud'),

  -- Infrastructure (non-cloud / hybrid)
  ('server_type', 'Server Type', 'dropdown', 30, 'Infrastructure',
    '[{"value":"physical","label":"Physical server"},{"value":"virtual","label":"Virtual machine"},{"value":"appliance","label":"Appliance"}]', 'non_cloud'),
  ('operating_system', 'Operating System / Version', 'text', 31, 'Infrastructure', NULL, 'non_cloud'),
  ('cpu_cores', 'CPU Cores', 'number', 32, 'Infrastructure', NULL, 'non_cloud'),
  ('memory_gb', 'Memory (GB)', 'number', 33, 'Infrastructure', NULL, 'non_cloud'),
  ('storage_gb', 'Storage (GB)', 'number', 34, 'Infrastructure', NULL, 'non_cloud'),
  ('rack_location', 'Rack / Room Location', 'text', 35, 'Infrastructure', NULL, 'non_cloud'),
  ('hardware_support_until', 'Hardware Support Until', 'date', 36, 'Infrastructure', NULL, 'non_cloud'),

  -- Connection Details (server name, IP and mount point for non-cloud / hybrid)
  ('host_name', 'Host / Server Name', 'text', 40, 'Connection Details', NULL, 'non_cloud'),
  ('ip_address', 'IP Address', 'text', 41, 'Connection Details', NULL, 'non_cloud'),
  ('mount_point', 'Mount Point', 'text', 42, 'Connection Details', NULL, 'non_cloud'),
  ('http_port', 'HTTP Port', 'number', 43, 'Connection Details', NULL, NULL),
  ('https_port', 'HTTPS Port', 'number', 44, 'Connection Details', NULL, NULL),
  ('application_url', 'Application URL', 'text', 45, 'Connection Details', NULL, NULL),

  -- Database
  ('db_host', 'Database Host / IP Address', 'text', 50, 'Database', NULL, NULL),
  ('db_port', 'Database Port', 'number', 51, 'Database', NULL, NULL),
  ('db_name', 'Database Name', 'text', 52, 'Database', NULL, NULL),
  ('db_engine', 'Database Engine / Version', 'text', 53, 'Database', NULL, NULL),
  ('managed_database_service', 'Managed Database Service', 'text', 54, 'Database', NULL, 'cloud'),

  -- Availability & Refresh
  ('requested_date', 'Requested Date', 'date', 60, 'Availability & Refresh', NULL, NULL),
  ('needed_by', 'Needed By', 'date', 61, 'Availability & Refresh', NULL, NULL),
  ('provisioned_date', 'Provisioned Date', 'date', 62, 'Availability & Refresh', NULL, NULL),
  ('ready_date', 'Ready Date', 'date', 63, 'Availability & Refresh', NULL, NULL),
  ('available_from', 'Available From', 'date', 64, 'Availability & Refresh', NULL, NULL),
  ('available_to', 'Available To', 'date', 65, 'Availability & Refresh', NULL, NULL),
  ('refresh_frequency', 'Refresh Frequency', 'dropdown', 66, 'Availability & Refresh',
    '[{"value":"none","label":"No refresh"},{"value":"on_demand","label":"On request"},{"value":"weekly","label":"Weekly"},{"value":"monthly","label":"Monthly"},{"value":"per_release","label":"Per release"},{"value":"per_mock","label":"Per mock migration"}]', NULL),
  ('last_refresh_date', 'Last Refresh Date', 'date', 67, 'Availability & Refresh', NULL, NULL),
  ('deployed_build', 'Deployed Build / Release / Version', 'text', 68, 'Availability & Refresh', NULL, NULL),
  ('test_data', 'Test Data', 'dropdown', 69, 'Availability & Refresh',
    '[{"value":"none","label":"None"},{"value":"synthetic","label":"Synthetic"},{"value":"masked_production","label":"Masked production copy"},{"value":"production","label":"Production data"}]', NULL),

  -- Access & Bookings
  ('user_access', 'Teams / Users with Access', 'multi_line', 70, 'Access & Bookings', NULL, NULL),
  ('access_approver', 'Access Approver', 'text', 71, 'Access & Bookings', NULL, NULL),
  ('named_users', 'Named Users', 'number', 72, 'Access & Bookings', NULL, NULL),
  ('bookings', 'Bookings', 'table', 73, 'Access & Bookings',
    '[{"value":"team","label":"Team"},{"value":"from","label":"From","type":"date"},{"value":"to","label":"To","type":"date"},{"value":"purpose","label":"Purpose"}]', NULL),

  -- Health & Issues
  ('availability_target', 'Availability Target (%)', 'number', 80, 'Health & Issues', NULL, NULL),
  ('monthly_cost', 'Monthly Running Cost', 'currency', 81, 'Health & Issues', NULL, NULL),
  ('components', 'Components', 'table', 82, 'Health & Issues',
    '[{"value":"component","label":"Component"},{"value":"version","label":"Version"},{"value":"notes","label":"Notes"}]', NULL),
  ('issues', 'Issues', 'table', 83, 'Health & Issues',
    '[{"value":"issue","label":"Issue"},{"value":"severity","label":"Severity","type":"select","options":["High","Medium","Low"]},{"value":"owner","label":"Owner"},{"value":"status","label":"Status","type":"select","options":["Open","In Progress","Closed"]}]', NULL),

  -- Banking (Banking & Financial Services projects only)
  ('banking_component', 'Banking Component', 'dropdown', 90, 'Banking',
    '[{"value":"core_banking","label":"Core Banking"},{"value":"channels","label":"Digital Channels"},{"value":"atm_card","label":"ATM / Card"},{"value":"integration","label":"Integration / Middleware"},{"value":"reporting","label":"Reporting / Data"},{"value":"other","label":"Other"}]', 'banking'),

  -- Notes
  ('notes', 'Notes', 'multi_line', 99, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, shown_for)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  visible_when = EXCLUDED.visible_when,
  updated_at = NOW();

-- Check: 59 fields; 10 tabs (Details has no group); 1 industry-only field.
SELECT
  (SELECT count(*) FROM public.local_register_fields WHERE register_id = '00000000-0000-4000-9100-000000000002') AS fields_expected_59,
  (SELECT count(DISTINCT field_group) FROM public.local_register_fields
    WHERE register_id = '00000000-0000-4000-9100-000000000002' AND field_group IS NOT NULL) AS tabs_expected_10,
  (SELECT count(*) FROM public.local_register_fields
    WHERE register_id = '00000000-0000-4000-9100-000000000002' AND visible_when ? 'project_industry') AS industry_only_expected_1;

NOTIFY pgrst, 'reload schema';
