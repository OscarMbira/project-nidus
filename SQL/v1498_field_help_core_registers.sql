-- ============================================================================
-- v1498: Field help — Core registers, wave 2 (v1345 slice 2, S2-D2)
-- ============================================================================
-- Register-specific help for the two Core registers:
--   core_environments        (Environments, v1467)
--   core_policies_compliance (Policies & Compliance, v1445)
-- Fields already covered by the common help (v1497: notes, issues, requested_date, approved_by,
-- approval_date, purpose, next_review_date, related_documents, version_history …) are not repeated,
-- except "category" for policies, whose common example does not fit.
-- Examples follow CLAUDE.md rule 77: no real people, organisations or brands; familiar places;
-- reserved addresses (192.0.2.x documentation range, example.com).
-- Drafted by Claude for owner sample review (G-D5). Idempotent. Prerequisite: v1490, v1497.
-- ============================================================================

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  -- ── Environments: overview ──
  ('register:core_environments:environment_type', 'Environment type', 'What the environment is used for in the delivery lifecycle.', E'- Development\n- UAT (user acceptance testing)\n- Production', NULL, NULL, 'registers_core'),
  ('register:core_environments:environment_code', 'Environment code', 'A short code people use to refer to this environment.', E'- UAT1\n- PRD-LON', NULL, 'Keep it short and unique within the project.', 'registers_core'),
  ('register:core_environments:used_by', 'Used by', 'Which teams or activities use this environment.', E'- Testing team for system testing\n- Trainers in Dubai', NULL, NULL, 'registers_core'),
  ('register:core_environments:hosting_model', 'Hosting model', 'Where the environment runs: on your own servers, in the cloud, or both.', E'- On-premises\n- Cloud\n- Hybrid', NULL, 'The Cloud and Infrastructure tabs ask for the matching details.', 'registers_core'),
  ('register:core_environments:site', 'Data centre / site', 'The data centre or site that hosts the environment.', E'- Primary data centre, London\n- Disaster recovery site, Dubai', NULL, NULL, 'registers_core'),
  ('register:core_environments:environment_owner', 'Environment owner', 'The person accountable for the environment: access, availability and changes.', E'- Infrastructure Manager\n- Test Environment Manager', NULL, NULL, 'registers_core'),
  -- ── Environments: cloud ──
  ('register:core_environments:cloud_provider', 'Cloud provider', 'The company that provides the cloud service.', E'- Example Cloud Co.', NULL, NULL, 'registers_core'),
  ('register:core_environments:cloud_service_model', 'Service model', 'How much of the stack the cloud provider manages.', E'- IaaS: you manage the servers\n- PaaS: you manage the application only\n- SaaS: the provider runs everything', NULL, NULL, 'registers_core'),
  ('register:core_environments:cloud_deployment_type', 'Deployment type', 'Whether the cloud is shared, private or a mix.', E'- Public cloud\n- Private cloud', NULL, NULL, 'registers_core'),
  ('register:core_environments:cloud_region', 'Region / availability zones', 'The cloud region and zones where the environment runs.', E'- Europe (London), zones A and B\n- Middle East (Dubai)', NULL, NULL, 'registers_core'),
  ('register:core_environments:cloud_account', 'Subscription / account / tenant', 'The cloud subscription or account the environment is billed and managed under.', E'- Project UAT subscription', NULL, 'Do not record passwords or secret keys here.', 'registers_core'),
  ('register:core_environments:cloud_network', 'Resource group / virtual network', 'The resource group or virtual network that holds the environment.', E'- rg-uat-london\n- vnet-uat-01', NULL, NULL, 'registers_core'),
  ('register:core_environments:instance_size', 'Instance type / size', 'The size of the cloud machines used.', E'- 4 CPU / 16 GB memory', NULL, NULL, 'registers_core'),
  ('register:core_environments:auto_scaling', 'Auto-scaling enabled', 'Tick if the environment adds capacity automatically when load rises.', E'- Ticked for a performance test environment', NULL, NULL, 'registers_core'),
  ('register:core_environments:network_connectivity', 'Connectivity to the organisation', 'How the environment connects to your organisation''s network.', E'- Site-to-site VPN\n- Private dedicated link', NULL, NULL, 'registers_core'),
  ('register:core_environments:data_residency', 'Data residency', 'The country or region where the data is stored, which matters for data protection rules.', E'- United Kingdom\n- United Arab Emirates', NULL, NULL, 'registers_core'),
  ('register:core_environments:regulatory_approval', 'Regulatory / compliance approval obtained', 'Tick once any approval needed to host this data or system has been obtained.', E'- Ticked after the regulator approved cloud hosting', NULL, 'Record the approval reference in the next field.', 'registers_core'),
  ('register:core_environments:regulatory_approval_reference', 'Approval reference', 'The reference of the regulatory or compliance approval.', E'- REG-APP-2027-004', NULL, NULL, 'registers_core'),
  ('register:core_environments:encryption_at_rest', 'Encryption at rest', 'Tick if stored data is encrypted.', E'- Ticked: disks and backups are encrypted', NULL, NULL, 'registers_core'),
  ('register:core_environments:key_management', 'Key management', 'Who manages the encryption keys.', E'- Provider-managed keys\n- Customer-managed keys', NULL, NULL, 'registers_core'),
  ('register:core_environments:backup_dr_region', 'Backup / DR region', 'Where backups and the disaster-recovery copy are kept.', E'- Middle East (Dubai)', NULL, NULL, 'registers_core'),
  -- ── Environments: infrastructure ──
  ('register:core_environments:server_type', 'Server type', 'The kind of server the environment runs on.', E'- Virtual machine\n- Physical server\n- Container platform', NULL, NULL, 'registers_core'),
  ('register:core_environments:operating_system', 'Operating system / version', 'The operating system and its version.', E'- Open-source server OS, version 9', NULL, NULL, 'registers_core'),
  ('register:core_environments:cpu_cores', 'CPU cores', 'The number of processor cores.', E'- 8', NULL, NULL, 'registers_core'),
  ('register:core_environments:memory_gb', 'Memory (GB)', 'The amount of memory in gigabytes.', E'- 32', NULL, NULL, 'registers_core'),
  ('register:core_environments:storage_gb', 'Storage (GB)', 'The amount of disk storage in gigabytes.', E'- 500', NULL, NULL, 'registers_core'),
  ('register:core_environments:rack_location', 'Rack / room location', 'Where the hardware sits in the data centre.', E'- Room 2, rack B4', NULL, NULL, 'registers_core'),
  ('register:core_environments:hardware_support_until', 'Hardware support until', 'The date the hardware vendor stops supporting this equipment.', E'- {example_date}', 'Dates show as {date_format}.', 'Plan a replacement before this date.', 'registers_core'),
  ('register:core_environments:host_name', 'Host / server name', 'The network name of the server.', E'- uat-app-01.example.com', NULL, NULL, 'registers_core'),
  ('register:core_environments:ip_address', 'IP address', 'The server''s network address.', E'- 192.0.2.15', NULL, NULL, 'registers_core'),
  ('register:core_environments:mount_point', 'Mount point', 'The folder where shared storage is attached on the server.', E'- /data/uat', NULL, NULL, 'registers_core'),
  -- ── Environments: access and database ──
  ('register:core_environments:http_port', 'HTTP port', 'The port for unencrypted web traffic, if used.', E'- 80\n- 8080', NULL, NULL, 'registers_core'),
  ('register:core_environments:https_port', 'HTTPS port', 'The port for encrypted web traffic.', E'- 443', NULL, NULL, 'registers_core'),
  ('register:core_environments:application_url', 'Application URL', 'The web address users open to reach the application in this environment.', E'- https://uat.example.com', NULL, NULL, 'registers_core'),
  ('register:core_environments:db_host', 'Database host / IP address', 'The server name or address of the database.', E'- uat-db-01.example.com\n- 192.0.2.20', NULL, NULL, 'registers_core'),
  ('register:core_environments:db_port', 'Database port', 'The port the database listens on.', E'- 5432', NULL, NULL, 'registers_core'),
  ('register:core_environments:db_name', 'Database name', 'The name of the database the application uses.', E'- core_uat', NULL, 'Do not record passwords here.', 'registers_core'),
  ('register:core_environments:db_engine', 'Database engine / version', 'The type and version of database software.', E'- Relational database, version 16', NULL, NULL, 'registers_core'),
  ('register:core_environments:managed_database_service', 'Managed database service', 'The cloud database service used, if the provider runs the database.', E'- Example Cloud managed SQL service', NULL, NULL, 'registers_core'),
  -- ── Environments: availability and refresh ──
  ('register:core_environments:needed_by', 'Needed by', 'The date the environment must be ready for use.', E'- {example_date}', 'Dates show as {date_format}.', NULL, 'registers_core'),
  ('register:core_environments:provisioned_date', 'Provisioned date', 'The date the environment was built.', E'- {example_date}', 'Dates show as {date_format}.', NULL, 'registers_core'),
  ('register:core_environments:ready_date', 'Ready date', 'The date the environment was confirmed ready for use.', E'- {example_date}', 'Dates show as {date_format}.', NULL, 'registers_core'),
  ('register:core_environments:available_from', 'Available from', 'The first date the environment can be used.', E'- {example_date}', 'Dates show as {date_format}.', NULL, 'registers_core'),
  ('register:core_environments:available_to', 'Available to', 'The last date the environment can be used before it is released or rebuilt.', E'- {example_date}', 'Dates show as {date_format}.', NULL, 'registers_core'),
  ('register:core_environments:refresh_frequency', 'Refresh frequency', 'How often the environment''s data is refreshed from a source.', E'- Weekly\n- Before each test cycle', NULL, NULL, 'registers_core'),
  ('register:core_environments:last_refresh_date', 'Last refresh date', 'When the data was last refreshed.', E'- {example_date}', 'Dates show as {date_format}.', NULL, 'registers_core'),
  ('register:core_environments:deployed_build', 'Deployed build / release / version', 'The software version currently deployed here.', E'- Release 2.4, build 118', NULL, NULL, 'registers_core'),
  ('register:core_environments:test_data', 'Test data', 'What kind of data the environment holds.', E'- Masked copy of production\n- Synthetic data', NULL, 'Never use unmasked personal data outside production.', 'registers_core'),
  ('register:core_environments:user_access', 'Teams / users with access', 'Who may use the environment.', E'- Testing team\n- Trainers, Cairo office', NULL, 'One team per line.', 'registers_core'),
  ('register:core_environments:access_approver', 'Access approver', 'Who approves requests for access to this environment.', E'- Test Environment Manager', NULL, NULL, 'registers_core'),
  ('register:core_environments:named_users', 'Named users', 'How many named people have access.', E'- 25', NULL, NULL, 'registers_core'),
  ('register:core_environments:bookings', 'Bookings', 'Who has booked the environment and when, one booking per row.', E'- Regression testing – Test Team – {example_date}', NULL, 'Add one booking per row; check for overlaps before booking.', 'registers_core'),
  ('register:core_environments:availability_target', 'Availability target (%)', 'How much of the time the environment must be up, as a percentage.', E'- 99.5 for production\n- 95 for UAT', NULL, NULL, 'registers_core'),
  ('register:core_environments:monthly_cost', 'Monthly running cost', 'What the environment costs to run each month.', E'- 4,500', 'Amounts show in {currency}.', NULL, 'registers_core'),
  ('register:core_environments:components', 'Components', 'The applications and services installed in the environment, one per row.', E'- Core application – 2.4 – Running', NULL, 'Add one component per row.', 'registers_core'),
  ('register:core_environments:banking_component', 'Banking component', 'Which part of the banking platform this environment serves.', E'- Core banking\n- Payments', NULL, 'Shown only for projects in the banking industry.', 'registers_core'),

  -- ── Policies & Compliance ──
  ('register:core_policies_compliance:policy_reference', 'Policy reference', 'The unique reference of the policy.', E'- POL-IS-001', NULL, NULL, 'registers_core'),
  ('register:core_policies_compliance:category', 'Category', 'The subject area of the policy, used for filtering and reports.', E'- Information security\n- Health and safety\n- Procurement', NULL, NULL, 'registers_core'),
  ('register:core_policies_compliance:policy_owner', 'Policy owner', 'The person responsible for keeping the policy current and answering questions about it.', E'- Chief Information Security Officer\n- Head of Procurement', NULL, NULL, 'registers_core'),
  ('register:core_policies_compliance:document_type', 'Document type', 'Whether this is a policy, a standard, a procedure or a guideline.', E'- Policy: what must be done\n- Procedure: how to do it step by step', NULL, NULL, 'registers_core'),
  ('register:core_policies_compliance:version', 'Version', 'The version number of the policy.', E'- 1.0\n- 2.1', NULL, 'Increase it each time the policy is reissued.', 'registers_core'),
  ('register:core_policies_compliance:effective_date', 'Effective date', 'The date the policy starts to apply.', E'- {example_date}', 'Dates show as {date_format}.', NULL, 'registers_core'),
  ('register:core_policies_compliance:applies_to', 'Applies to', 'Who or what the policy covers.', E'- All staff\n- Contractors working on London sites', NULL, 'One group per line.', 'registers_core'),
  ('register:core_policies_compliance:exclusions', 'Exclusions', 'Who or what the policy does not cover.', E'- Temporary visitors', NULL, 'One exclusion per line.', 'registers_core'),
  ('register:core_policies_compliance:regulatory_references', 'Regulatory & standard references', 'The laws, regulations or standards the policy supports, one per row.', E'- Data protection law – Article 32 – Security of processing', NULL, 'Add one reference per row.', 'registers_core'),
  ('register:core_policies_compliance:requirements', 'Requirements', 'What the policy requires people to do.', E'- Lock screens when away from the desk\n- Report incidents within 24 hours', NULL, 'One requirement per line.', 'registers_core'),
  ('register:core_policies_compliance:controls', 'Controls', 'The checks in place to make sure the policy is followed, one per row.', E'- Quarterly access review – IT Security – Quarterly', NULL, 'Add one control per row.', 'registers_core'),
  ('register:core_policies_compliance:exceptions_process', 'Exceptions process', 'How someone asks for permission not to follow the policy, and who decides.', E'- Request through the service desk; approved by the policy owner for up to 3 months', NULL, NULL, 'registers_core'),
  ('register:core_policies_compliance:non_compliance_consequences', 'Consequences of non-compliance', 'What happens if the policy is not followed.', E'- Access removed until training is completed', NULL, NULL, 'registers_core'),
  ('register:core_policies_compliance:review_frequency', 'Review frequency', 'How often the policy must be reviewed.', E'- Annually\n- Every two years', NULL, NULL, 'registers_core'),
  ('register:core_policies_compliance:last_review_date', 'Last review date', 'When the policy was last reviewed.', E'- {example_date}', 'Dates show as {date_format}.', NULL, 'registers_core'),
  ('register:core_policies_compliance:compliance_status', 'Compliance status', 'How well the organisation currently follows the policy.', E'- Compliant\n- Partially compliant', NULL, NULL, 'registers_core'),
  ('register:core_policies_compliance:last_assessment_date', 'Last assessment date', 'When compliance with the policy was last checked.', E'- {example_date}', 'Dates show as {date_format}.', NULL, 'registers_core'),
  ('register:core_policies_compliance:attestation_required', 'Staff attestation required', 'Tick if staff must confirm they have read and understood the policy.', E'- Ticked for the information security policy', NULL, NULL, 'registers_core'),
  ('register:core_policies_compliance:attestation_frequency', 'Attestation frequency', 'How often staff must confirm the policy again.', E'- Annually\n- On joining only', NULL, NULL, 'registers_core')
ON CONFLICT (help_key, form_key, locale) DO UPDATE SET
  title = EXCLUDED.title,
  purpose = EXCLUDED.purpose,
  examples = EXCLUDED.examples,
  format_notes = EXCLUDED.format_notes,
  extra_notes = EXCLUDED.extra_notes,
  module_code = EXCLUDED.module_code,
  is_active = TRUE;

-- Check: every field of the two Core registers now has help (specific or common)
SELECT r.register_key,
       count(*) AS fields,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.field_help h
                                      WHERE h.is_active
                                        AND h.help_key IN ('register:' || r.register_key || ':' || f.field_key,
                                                           'register:*:' || f.field_key))) AS with_help
FROM public.local_register_fields f
JOIN public.local_registers r ON r.id = f.register_id
WHERE r.register_key IN ('core_environments', 'core_policies_compliance')
GROUP BY r.register_key
ORDER BY 1;
