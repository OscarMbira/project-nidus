-- ============================================================================
-- v1391: Requirements Specification — two system templates (BRD and FRS)
-- ============================================================================
-- PRD / plan v1338, Slice 9 — decision D10.
-- Two shipped, read-only templates for ict_requirements_specification (v1387):
--   * Business Requirements Document           (00000000-0000-4000-b391-000000000001)
--   * Functional Requirements Specification    (00000000-0000-4000-b391-000000000002)
-- Document text only, vendor-neutral (rule 26), [placeholders] for organisation-specific values.
-- The requirement chapters and use cases are NOT in the templates: they are shown from the
-- Requirements register and the Use Cases register for the project the record is created in (D2).
-- Organisations copy and customise them from the register's Templates tab (v1336).
-- Re-runnable: rows are upserted (version + 1 when content changes). Records already created from a
-- template are independent copies and are not touched. Display ID left blank (rule 16.2).
-- Run after: v1336, v1337 (template tables and functions), v1387.
-- ============================================================================

BEGIN;

INSERT INTO public.local_register_templates
  (id, display_id, register_key, template_scope, account_id, name, description, version,
   record_title, record_description, record_status, field_values)
VALUES
(
  '00000000-0000-4000-b391-000000000001'::uuid, '', 'ict_requirements_specification', 'system', NULL,
  $t$Business Requirements Document$t$,
  $t$What the business needs and why: purpose, scope, business objectives, assumptions, constraints and dependencies. Requirements and use cases come from the project's registers. Fill the bracketed placeholders.$t$,
  1,
  $t$Business Requirements Document – [Initiative Name]$t$,
  $t$The business requirements for [Initiative Name]: the problem being solved, what is in and out of scope, and the business, functional and non-functional requirements agreed with [Business Owner].$t$,
  'draft',
  $t${
  "document_type": "brd",
  "document_reference": "[Document Reference]",
  "document_version": "0.1",
  "document_owner": "[Business Analyst]",
  "business_owner": "[Business Owner]",
  "purpose": "This document sets out the business requirements for [Initiative Name]. It explains the business problem, the outcomes [Organisation] expects, and the requirements the solution must meet. Once signed it is the baseline for design, testing and change control.",
  "requirements_overview": "[Initiative Name] is needed because [business problem]. The requirements below were gathered in [number] workshops with [business areas] between [start date] and [end date], and are recorded in the project's Requirements register so design, testing and traceability use the same list.",
  "in_scope": "[Business process or product in scope]\n[Customer or user group in scope]\n[Channel or location in scope]\n[Report or regulatory obligation in scope]",
  "out_of_scope": "[Process or product not covered]\n[Change handled by another initiative]\n[Future phase item]",
  "summary_of_requirements": "There are [number] business requirements, [number] functional requirements and [number] non-functional requirements. [number] are Must, [number] Should, [number] Could and [number] Won't (this release). The highest-risk areas are [area] and [area].",
  "assumptions": "[Business sponsor] is available to approve requirements within [number] working days\nCurrent business rules are documented and up to date\n[Supporting system] remains available during the project\nUsers are available for workshops and acceptance testing",
  "constraints": "Go-live must be by [date]\nThe budget is fixed at [amount]\n[Regulation or policy] applies to all customer data\nNo change to [system] during the [freeze period]",
  "dependencies": "[Other initiative] delivers [capability] by [date]\n[Supplier] confirms [service] by [date]\nData owners sign off data definitions before design",
  "glossary": "BRD\tBusiness Requirements Document — what the business needs and why\nFRS\tFunctional Requirements Specification — how the solution behaves to meet the business requirements\nMoSCoW\tPriority scale: Must, Should, Could, Won't (this release)\nNon-functional requirement\tA quality the solution must have, such as performance, availability or security\nUse case\tA step-by-step description of how a user or system achieves a goal with the solution",
  "appendices": "Current process maps\t[Reference / Link]\nWorkshop notes\t[Reference / Link]\nStakeholder list\t[Reference / Link]",
  "version_history": "0.1\t[Date]\t[Business Analyst]\tFirst draft from the template",
  "related_documents": "[Business Case reference] – Business Case\n[Project Brief reference] – Project Brief\n[Functional Requirements Specification reference] – Functional Requirements Specification"
}$t$::jsonb
),
(
  '00000000-0000-4000-b391-000000000002'::uuid, '', 'ict_requirements_specification', 'system', NULL,
  $t$Functional Requirements Specification$t$,
  $t$How the solution must behave: overview and scope of the functional requirements, assumptions, and the non-functional requirements by area (volumes, performance, security, migration, data, data protection, enquiry and reports, availability, usability, audit). Requirements and use cases come from the project's registers. Fill the bracketed placeholders.$t$,
  1,
  $t$Functional Requirements Specification – [Solution Name]$t$,
  $t$The functional and non-functional requirements for [Solution Name], derived from the signed Business Requirements Document [BRD reference].$t$,
  'draft',
  $t${
  "document_type": "frs",
  "document_reference": "[Document Reference]",
  "document_version": "0.1",
  "document_owner": "[Solution Analyst]",
  "business_owner": "[Business Owner]",
  "purpose": "This document specifies how [Solution Name] must behave to meet the business requirements in [BRD reference]. It is the basis for solution design, build and system testing; every requirement is traceable to a business requirement and to the tests that prove it.",
  "requirements_overview": "The functional requirements describe what [Solution Name] does for [user groups]: [main capability], [main capability] and [main capability]. Non-functional requirements set the volumes, performance, security, migration, data, data protection, reporting, availability, usability and audit standards the solution must meet.",
  "in_scope": "[Module or capability in scope]\n[Interface in scope]\n[Report or enquiry in scope]\n[Data migration of [data set]]",
  "out_of_scope": "[Module or capability not covered]\n[Interface delivered by another project]\n[Manual process that stays as is]",
  "summary_of_requirements": "[number] functional requirements across [number] capabilities, and [number] non-functional requirements across [number] areas. [number] requirements are Must. Use cases cover the [number] main user journeys.",
  "assumptions": "The Business Requirements Document [BRD reference] is signed\nThe target platform supports [standard feature] without customisation\nTest environments are available from [date]\nVolumes are based on [period] figures plus [percentage] growth",
  "constraints": "The solution must run on [approved platform]\nPersonal data must stay in [region]\nInterfaces must use [approved integration standard]\nThe solution must meet [accessibility standard]",
  "dependencies": "[Interface owner] provides [interface specification] by [date]\nData mapping is agreed before build\n[Security team] approves the access model",
  "glossary": "FRS\tFunctional Requirements Specification — how the solution behaves to meet the business requirements\nNon-functional requirement\tA quality the solution must have, such as performance, availability or security\nUse case\tA step-by-step description of how a user or system achieves a goal with the solution\nVerification method\tHow a requirement is shown to be met: test, inspection, demonstration or analysis\nRPO / RTO\tRecovery point objective (data loss allowed) and recovery time objective (downtime allowed)",
  "appendices": "Data dictionary\t[Reference / Link]\nInterface catalogue\t[Reference / Link]\nScreen and report mock-ups\t[Reference / Link]",
  "version_history": "0.1\t[Date]\t[Solution Analyst]\tFirst draft from the template",
  "related_documents": "[BRD reference] – Business Requirements Document\n[Solution Architecture reference] – Solution Architecture\n[Test Strategy reference] – Test Strategy"
}$t$::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name               = EXCLUDED.name,
  description        = EXCLUDED.description,
  record_title       = EXCLUDED.record_title,
  record_description = EXCLUDED.record_description,
  record_status      = EXCLUDED.record_status,
  version            = public.local_register_templates.version
                       + CASE WHEN public.local_register_templates.field_values IS DISTINCT FROM EXCLUDED.field_values THEN 1 ELSE 0 END,
  field_values       = EXCLUDED.field_values,
  is_archived        = FALSE,
  updated_at         = NOW();

COMMIT;

-- Check: two system templates for the Requirements Specification.
SELECT id, name, version, field_values ->> 'document_type' AS document_type
FROM public.local_register_templates
WHERE register_key = 'ict_requirements_specification' AND template_scope = 'system'
ORDER BY name;
