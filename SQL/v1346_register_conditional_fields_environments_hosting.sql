-- ============================================================================
-- v1346: Conditional register fields + Environments form split by hosting model (cloud / non-cloud)
-- ============================================================================
-- Owner request 2026-11-08: on the Environments form (FIN pack, Core Banking) the user chooses
-- cloud or non-cloud hosting and only the tabs / fields for that choice are shown.
--
-- 1. Engine (public + sim): local_register_fields.visible_when JSONB — { "field": "<key>",
--    "in": ["<value>", …] }. The field shows only while the controlling field's value (any value,
--    for a multi-select) is in the list; a tab whose fields are all hidden disappears. Applied to
--    the form, the record view, exports and the complete document
--    (packages/shared/src/utils/registerFieldGroups.js). Hidden values are kept, not deleted.
-- 2. Environments (…9001-…00a):
--    Details: new Hosting Model (Non-cloud · Cloud · Hybrid); "Hosting Site" becomes
--      "Data Centre / Site" (non-cloud / hybrid only).
--    Cloud / hybrid: Cloud Setup tab (provider, service model, deployment type, region,
--      subscription / account, resource group / network, instance size, auto-scaling, network
--      connectivity, estimated monthly cost) and Cloud Compliance tab (data residency, regulatory
--      cloud approval + reference, encryption at rest, key management, backup / DR region);
--      Database tab gains Managed Database Service.
--    Non-cloud / hybrid: Infrastructure tab (server type, operating system, CPU cores, memory,
--      storage, rack / room location, hardware support until); Host / Server Name, IP Address and
--      Mount Point on Connection Details.
--    Common to both: ports and application URL, Database, Availability & Refresh, Access, Notes.
--    Cloud provider is free text (no product or trademark names in the options — rule 26).
-- 3. Existing records: Hosting Model filled from the old Hosting Site (cloud → Cloud, data
--    centre / vendor site → Non-cloud). Nothing else changes.
-- Prerequisites: v1297 (tabs), v1310 (Environments fields). Idempotent.
-- ============================================================================

-- ── 1. Engine: conditional fields ───────────────────────────────────────────────────
ALTER TABLE public.local_register_fields ADD COLUMN IF NOT EXISTS visible_when JSONB;
ALTER TABLE sim.local_register_fields ADD COLUMN IF NOT EXISTS visible_when JSONB;
COMMENT ON COLUMN public.local_register_fields.visible_when IS
  'v1346: optional condition { "field": "<field_key>", "in": [values] } — the field (and a tab left empty) is shown only while the controlling field has one of the values.';
COMMENT ON COLUMN sim.local_register_fields.visible_when IS
  'v1346: optional condition { "field": "<field_key>", "in": [values] } — the field (and a tab left empty) is shown only while the controlling field has one of the values.';

-- ── 2. Environments: fields, tabs and conditions ────────────────────────────────────
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, visible_when)
SELECT '00000000-0000-4000-9001-00000000000a'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group,
       v.dropdown_options::jsonb,
       CASE v.shown_for
         WHEN 'cloud' THEN '{"field":"hosting_model","in":["cloud","hybrid"]}'::jsonb
         WHEN 'non_cloud' THEN '{"field":"hosting_model","in":["on_premise","hybrid"]}'::jsonb
       END
FROM (VALUES
  -- Details
  ('environment', 'Environment', 'dropdown', 0, NULL, NULL, NULL),
  ('component', 'Component', 'dropdown', 1, NULL, NULL, NULL),
  ('used_by', 'Used By', 'text', 2, NULL, NULL, NULL),
  ('hosting_model', 'Hosting Model', 'dropdown', 3, NULL, '[{"value":"on_premise","label":"Non-cloud (on premise / data centre)"},{"value":"cloud","label":"Cloud"},{"value":"hybrid","label":"Hybrid (cloud and data centre)"}]', NULL),
  ('site', 'Data Centre / Site', 'dropdown', 4, NULL, '[{"value":"primary_dc","label":"Primary data centre"},{"value":"secondary_dc","label":"Secondary data centre"},{"value":"vendor","label":"Vendor / co-location data centre"}]', 'non_cloud'),
  ('environment_owner', 'Environment Owner', 'user_picker', 5, NULL, NULL, NULL),

  -- Cloud Setup (cloud / hybrid)
  ('cloud_provider', 'Cloud Provider', 'text', 6, 'Cloud Setup', NULL, 'cloud'),
  ('cloud_service_model', 'Service Model', 'dropdown', 7, 'Cloud Setup', '[{"value":"iaas","label":"Infrastructure as a service (IaaS)"},{"value":"paas","label":"Platform as a service (PaaS)"},{"value":"saas","label":"Software as a service (SaaS)"}]', 'cloud'),
  ('cloud_deployment_type', 'Deployment Type', 'dropdown', 8, 'Cloud Setup', '[{"value":"public","label":"Public cloud"},{"value":"private","label":"Private cloud"},{"value":"community","label":"Community / sector cloud"}]', 'cloud'),
  ('cloud_region', 'Region / Availability Zones', 'text', 9, 'Cloud Setup', NULL, 'cloud'),
  ('cloud_account', 'Subscription / Account / Tenant', 'text', 10, 'Cloud Setup', NULL, 'cloud'),
  ('cloud_network', 'Resource Group / Virtual Network', 'text', 11, 'Cloud Setup', NULL, 'cloud'),
  ('instance_size', 'Instance Type / Size', 'text', 12, 'Cloud Setup', NULL, 'cloud'),
  ('auto_scaling', 'Auto-Scaling Enabled', 'boolean', 13, 'Cloud Setup', NULL, 'cloud'),
  ('network_connectivity', 'Connectivity to the Bank', 'dropdown', 14, 'Cloud Setup', '[{"value":"private_link","label":"Dedicated private connection"},{"value":"vpn","label":"Site-to-site VPN"},{"value":"internet","label":"Public internet (TLS)"}]', 'cloud'),
  ('monthly_cost', 'Estimated Monthly Cost', 'currency', 15, 'Cloud Setup', NULL, 'cloud'),

  -- Cloud Compliance (cloud / hybrid)
  ('data_residency', 'Data Residency (where data is stored)', 'text', 16, 'Cloud Compliance', NULL, 'cloud'),
  ('regulatory_approval', 'Regulatory Cloud Approval Obtained', 'boolean', 17, 'Cloud Compliance', NULL, 'cloud'),
  ('regulatory_approval_reference', 'Approval Reference', 'text', 18, 'Cloud Compliance', NULL, 'cloud'),
  ('encryption_at_rest', 'Encryption at Rest', 'boolean', 19, 'Cloud Compliance', NULL, 'cloud'),
  ('key_management', 'Key Management', 'dropdown', 20, 'Cloud Compliance', '[{"value":"provider_managed","label":"Provider-managed keys"},{"value":"customer_managed","label":"Bank-managed keys"},{"value":"hsm","label":"Bank hardware security module"}]', 'cloud'),
  ('backup_dr_region', 'Backup / DR Region', 'text', 21, 'Cloud Compliance', NULL, 'cloud'),

  -- Infrastructure (non-cloud / hybrid)
  ('server_type', 'Server Type', 'dropdown', 22, 'Infrastructure', '[{"value":"physical","label":"Physical server"},{"value":"virtual","label":"Virtual machine"},{"value":"appliance","label":"Appliance"}]', 'non_cloud'),
  ('operating_system', 'Operating System / Version', 'text', 23, 'Infrastructure', NULL, 'non_cloud'),
  ('cpu_cores', 'CPU Cores', 'number', 24, 'Infrastructure', NULL, 'non_cloud'),
  ('memory_gb', 'Memory (GB)', 'number', 25, 'Infrastructure', NULL, 'non_cloud'),
  ('storage_gb', 'Storage (GB)', 'number', 26, 'Infrastructure', NULL, 'non_cloud'),
  ('rack_location', 'Rack / Room Location', 'text', 27, 'Infrastructure', NULL, 'non_cloud'),
  ('hardware_support_until', 'Hardware Support Until', 'date', 28, 'Infrastructure', NULL, 'non_cloud'),

  -- Connection Details (server name, IP and mount point only for non-cloud / hybrid)
  ('host_name', 'Host / Server Name', 'text', 29, 'Connection Details', NULL, 'non_cloud'),
  ('ip_address', 'IP Address', 'text', 30, 'Connection Details', NULL, 'non_cloud'),
  ('mount_point', 'Mount Point', 'text', 31, 'Connection Details', NULL, 'non_cloud'),
  ('http_port', 'HTTP Port', 'number', 32, 'Connection Details', NULL, NULL),
  ('https_port', 'HTTPS Port', 'number', 33, 'Connection Details', NULL, NULL),
  ('application_url', 'Application URL', 'text', 34, 'Connection Details', NULL, NULL),

  -- Database
  ('db_host', 'Database Host / IP Address', 'text', 35, 'Database', NULL, NULL),
  ('db_port', 'Database Port', 'number', 36, 'Database', NULL, NULL),
  ('db_name', 'Database Name', 'text', 37, 'Database', NULL, NULL),
  ('db_engine', 'Database Engine / Version', 'text', 38, 'Database', NULL, NULL),
  ('managed_database_service', 'Managed Database Service', 'text', 39, 'Database', NULL, 'cloud'),

  -- Availability & Refresh, Access, Notes
  ('requested_date', 'Requested Date', 'date', 40, 'Availability & Refresh', NULL, NULL),
  ('provisioned_date', 'Provisioned Date', 'date', 41, 'Availability & Refresh', NULL, NULL),
  ('available_from', 'Available From', 'date', 42, 'Availability & Refresh', NULL, NULL),
  ('available_to', 'Available To', 'date', 43, 'Availability & Refresh', NULL, NULL),
  ('refresh_frequency', 'Refresh Frequency', 'dropdown', 44, 'Availability & Refresh', NULL, NULL),
  ('last_refresh_date', 'Last Refresh Date', 'date', 45, 'Availability & Refresh', NULL, NULL),
  ('deployed_build', 'Deployed Build / Release', 'text', 46, 'Availability & Refresh', NULL, NULL),
  ('user_access', 'Teams / Users with Access', 'multi_line', 47, 'Access', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 48, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, shown_for)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000000a'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  -- Existing fields listed with NULL options keep their options (environment, component, refresh frequency).
  dropdown_options = COALESCE(EXCLUDED.dropdown_options, public.local_register_fields.dropdown_options),
  visible_when = EXCLUDED.visible_when,
  updated_at = NOW();

-- ── 3. Existing records: Hosting Model from the old Hosting Site ─────────────────────
UPDATE public.local_register_records
SET field_values = field_values || jsonb_build_object('hosting_model',
      CASE WHEN field_values ->> 'site' = 'cloud' THEN 'cloud' ELSE 'on_premise' END),
    updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-00000000000a'::uuid
  AND NOT (field_values ? 'hosting_model')
  AND COALESCE(field_values ->> 'site', '') <> '';

-- Check: tabs per hosting model.
SELECT COALESCE(field_group, 'Details') AS tab,
       count(*) FILTER (WHERE visible_when IS NULL) AS always,
       count(*) FILTER (WHERE visible_when -> 'in' ? 'cloud') AS cloud,
       count(*) FILTER (WHERE visible_when -> 'in' ? 'on_premise') AS non_cloud
FROM public.local_register_fields
WHERE register_id = '00000000-0000-4000-9001-00000000000a'::uuid
GROUP BY 1 ORDER BY min(display_order);
