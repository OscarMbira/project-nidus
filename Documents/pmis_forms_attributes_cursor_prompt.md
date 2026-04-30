# Cursor AI Build Prompt: PMIS Forms & Attributes Coverage Module

## 1. Context
I am building a **Project Management Information System (PMIS)** using:

- **Frontend:** React
- **Styling:** Tailwind CSS
- **Backend/Database:** Supabase PostgreSQL
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage for attachments and generated exports

The PMIS must support project management forms and attributes from a structured project management forms reference. The system must not just display static forms; it must store, manage, validate, search, report, approve, version, export, and reuse the form data across projects.

The forms are organized around the project lifecycle/process groups: **Initiating, Planning, Executing, Monitoring & Controlling, Closing, and Agile**.

Build this as a configurable module so new forms and fields can be added later without major code changes.

---

## 2. Main Objective
Create a full PMIS form-management capability that ensures every form listed below is represented in the PMIS with its key fields/attributes. The system must allow users to:

1. Create, view, update, delete, archive, and restore forms per project.
2. Create multiple versions/revisions of a form.
3. Attach files, screenshots, evidence, sign-offs, and comments to forms.
4. Search across forms by project, process group, form type, status, owner, date, priority, risk level, stakeholder, deliverable, WBS code, or approval status.
5. Convert selected forms into dashboards, registers, reports, and exports.
6. Maintain relationships between forms, such as requirements linked to deliverables, risks linked to responses, issues linked to change requests, and acceptance forms linked to deliverables.
7. Enforce role-based access and approval workflows.

---

## 3. Design Principle: Dynamic Form Engine + Strong PMIS Entities
Use a hybrid design:

### 3.1 Dynamic Form Engine
Create a configurable form engine using database-driven templates:

- `form_templates`
- `form_template_versions`
- `form_sections`
- `form_fields`
- `form_instances`
- `form_instance_values`
- `form_instance_rows` for table/repeating fields
- `form_comments`
- `form_attachments`
- `form_approvals`
- `form_version_history`

This allows the PMIS to support all forms and future custom forms.

### 3.2 Strong PMIS Tables
For high-value registers and reporting, also create normalized tables that sync with the form engine:

- `projects`
- `project_members`
- `stakeholders`
- `requirements`
- `risks`
- `issues`
- `decisions`
- `change_requests`
- `lessons_learned`
- `wbs_items`
- `activities`
- `milestones`
- `resources`
- `procurements`
- `contracts`
- `deliverables`
- `acceptance_records`
- `status_reports`
- `agile_backlog_items`
- `retrospective_items`

Use triggers or service-layer functions to keep key fields aligned between form submissions and normalized PMIS entities.

---

## 4. Required Process Groups and Forms
Implement the following form categories and form templates.

## 4.1 Initiating Forms

### 1. Project Charter
Fields/attributes:
- project_title
- project_sponsor
- date_prepared
- project_manager
- project_customer
- project_purpose
- high_level_project_description
- project_boundaries
- key_deliverables
- high_level_requirements
- overall_project_risk
- scope_objective
- scope_success_criteria
- time_objective
- time_success_criteria
- cost_objective
- cost_success_criteria
- other_objectives
- other_success_criteria
- summary_milestones: milestone, due_date
- preapproved_financial_resources
- stakeholders: stakeholder_name, role
- project_exit_criteria
- project_manager_authority_level
- staffing_decisions_authority
- budget_management_and_variance_authority
- technical_decisions_authority
- conflict_resolution_authority
- sponsor_authority
- approvals: approver_name, approver_role, signature, date

### 2. Assumption Log
Fields/attributes:
- project_title
- date_prepared
- assumption_id
- category
- assumption_or_constraint
- responsible_party
- due_date
- actions
- status
- comments
- related_risk_id
- related_issue_id
- validation_result

### 3. Stakeholder Register
Fields/attributes:
- project_title
- date_prepared
- stakeholder_name
- position_role
- contact_information
- requirements
- expectations
- classification
- organization
- influence_level
- interest_level
- preferred_communication_channel
- engagement_owner

### 4. Stakeholder Analysis
Fields/attributes:
- project_title
- date_prepared
- stakeholder_name_or_role
- interest
- influence
- attitude
- power_level
- urgency
- legitimacy
- engagement_strategy

---

## 4.2 Planning Forms

### 5. Project Management Plan
Fields/attributes:
- project_title
- date_prepared
- project_life_cycle
- phases: phase_name, key_activities, key_deliverables
- phase_reviews: phase_name, reviews, entry_criteria, exit_criteria
- development_approaches: deliverable, development_approach
- subsidiary_management_plans: plan_name, comment, document_link
- scope_variance_threshold
- scope_baseline_management
- schedule_variance_threshold
- schedule_baseline_management
- cost_variance_threshold
- cost_baseline_management
- attached_baselines

### 6. Change Management Plan
Fields/attributes:
- project_title
- date_prepared
- change_management_approach
- schedule_change_definition
- budget_change_definition
- scope_change_definition
- project_document_change_definition
- change_control_board: name, role, responsibility, authority
- change_request_submittal_process
- change_request_tracking_process
- change_request_review_process
- change_request_disposition_process
- related_forms

### 7. Project Roadmap
Fields/attributes:
- project_title
- roadmap_start_date
- roadmap_end_date
- life_cycle_phases
- phase_start_date
- phase_end_date
- major_deliverables_or_events
- significant_milestones
- review_points
- development_approach
- timeline_notes

### 8. Scope Management Plan
Fields/attributes:
- project_title
- date_prepared
- wbs_approach
- wbs_dictionary_approach
- scope_baseline_maintenance
- deliverable_acceptance_process
- scope_and_requirements_integration
- project_management_and_business_analysis_integration

### 9. Requirements Management Plan
Fields/attributes:
- project_title
- date_prepared
- requirements_collection_approach
- requirements_analysis_approach
- requirements_categories
- requirements_documentation_approach
- requirements_prioritization_approach
- requirements_metrics
- traceability_structure
- tracking_approach
- reporting_approach
- validation_approach
- configuration_management_approach

### 10. Requirements Documentation
Fields/attributes:
- project_title
- date_prepared
- requirement_id
- requirement_description
- stakeholder
- category
- priority
- acceptance_criteria
- test_or_verification_method
- phase_or_release
- status
- owner
- source

### 11. Requirements Traceability Matrix
Fields/attributes:
- project_title
- date_prepared
- requirement_id
- requirement
- source
- priority
- category
- business_objective
- deliverable
- verification_method
- validation_method
- related_wbs_id
- related_test_case_id
- related_acceptance_record_id

### 12. Inter-Requirements Traceability Matrix
Fields/attributes:
- project_title
- date_prepared
- business_requirement_id
- business_requirement
- business_requirement_priority
- business_requirement_source
- technical_requirement_id
- technical_requirement
- technical_requirement_priority
- technical_requirement_source
- relationship_type

### 13. Project Scope Statement
Fields/attributes:
- project_title
- date_prepared
- project_scope_description
- project_deliverables
- product_acceptance_criteria
- project_exclusions
- project_constraints
- project_assumptions

### 14. Work Breakdown Structure
Fields/attributes:
- project_title
- date_prepared
- wbs_id
- wbs_level
- wbs_element_name
- parent_wbs_id
- deliverable_name
- work_package_name
- control_account
- responsible_owner

### 15. WBS Dictionary
Fields/attributes:
- project_title
- date_prepared
- wbs_id
- wbs_name
- description_of_work
- deliverables
- acceptance_criteria
- assumptions
- constraints
- responsible_organization
- schedule_milestones
- associated_schedule_activities
- resources_required
- cost_estimate
- quality_requirements
- references
- agreement_information

### 16. Schedule Management Plan
Fields/attributes:
- project_title
- date_prepared
- scheduling_methodology
- scheduling_tool
- level_of_accuracy
- units_of_measure
- variance_thresholds
- schedule_reporting_and_format
- rules_of_performance_measurement
- schedule_model_maintenance
- release_and_iteration_length_if_agile

### 17. Activity List
Fields/attributes:
- project_title
- date_prepared
- activity_id
- activity_name
- description_of_work
- wbs_id
- responsible_person
- activity_type

### 18. Activity Attributes
Fields/attributes:
- project_title
- date_prepared
- activity_id
- activity_name
- description_of_work
- predecessor_activities
- successor_activities
- logical_relationships
- leads_and_lags
- imposed_dates
- constraints
- assumptions
- resource_requirements_and_skill_levels
- location_of_performance
- type_of_effort
- planned_release_or_iteration

### 19. Milestone List
Fields/attributes:
- project_title
- date_prepared
- milestone_id
- milestone_name
- milestone_description
- milestone_type
- mandatory_or_optional
- due_date
- owner
- related_deliverable

### 20. Network Diagram
Fields/attributes:
- project_title
- date_prepared
- activity_id
- activity_name
- predecessor_activity_id
- successor_activity_id
- dependency_type
- lead_lag
- dependency_notes
- diagram_attachment

### 21. Duration Estimates
Fields/attributes:
- project_title
- date_prepared
- activity_id
- activity_name
- duration_estimate
- duration_units
- basis_of_estimate
- range
- confidence_level
- assumptions
- constraints

### 22. Duration Estimating Worksheet
Fields/attributes:
- project_title
- date_prepared
- activity_id
- activity_name
- optimistic_duration
- most_likely_duration
- pessimistic_duration
- calculated_expected_duration
- standard_deviation
- estimating_method
- basis_of_estimate

### 23. Project Schedule
Fields/attributes:
- project_title
- date_prepared
- activity_id
- activity_name
- start_date
- finish_date
- duration
- predecessor
- successor
- assigned_resources
- milestone_flag
- critical_path_flag
- baseline_start
- baseline_finish
- percent_complete

### 24. Cost Management Plan
Fields/attributes:
- project_title
- date_prepared
- units_of_measure
- level_of_precision
- level_of_accuracy
- organizational_procedure_links
- control_thresholds
- rules_of_performance_measurement
- cost_reporting_information_and_format
- additional_details

### 25. Cost Estimates
Fields/attributes:
- project_title
- date_prepared
- cost_estimate_id
- wbs_id
- activity_id
- cost_category
- resource_name
- estimated_quantity
- unit_cost
- total_cost
- basis_of_estimate
- assumptions
- constraints
- confidence_level

### 26. Cost Estimating Worksheet
Fields/attributes:
- project_title
- date_prepared
- activity_id
- activity_name
- labor_cost
- material_cost
- equipment_cost
- service_cost
- facility_cost
- contingency
- total_estimated_cost
- basis_of_estimate

### 27. Bottom-Up Cost Estimating Worksheet
Fields/attributes:
- project_title
- date_prepared
- wbs_id
- work_package
- activity_id
- activity_name
- resource_type
- quantity
- unit_cost
- estimated_cost
- subtotal
- contingency
- total

### 28. Cost Baseline
Fields/attributes:
- project_title
- date_prepared
- wbs_id
- control_account
- work_package
- time_period
- planned_cost
- cumulative_planned_cost
- contingency_reserve
- management_reserve
- approved_budget

### 29. Quality Management Plan
Fields/attributes:
- project_title
- date_prepared
- quality_standards
- quality_objectives
- quality_roles_and_responsibilities
- project_deliverables_and_processes_subject_to_quality_review
- quality_control_activities
- quality_assurance_activities
- quality_tools
- quality_reporting
- continuous_improvement_approach

### 30. Quality Metrics
Fields/attributes:
- project_title
- date_prepared
- metric_id
- metric_name
- metric_description
- measurement_method
- target_value
- tolerance
- frequency
- owner
- reporting_format

### 31. Responsibility Assignment Matrix
Fields/attributes:
- project_title
- date_prepared
- wbs_id_or_deliverable
- activity_or_work_package
- role_or_resource
- responsibility_type
- raci_value
- comments

### 32. Resource Management Plan
Fields/attributes:
- project_title
- date_prepared
- resource_identification_approach
- acquiring_resources_approach
- roles_and_responsibilities
- project_organization_chart
- project_team_resource_management
- training_strategy
- team_development_approach
- resource_control_approach
- recognition_plan
- release_plan

### 33. Team Charter
Fields/attributes:
- project_title
- date_prepared
- team_values_and_principles
- meeting_guidelines
- communication_guidelines
- decision_making_process
- conflict_resolution_process
- other_agreements
- team_member_signatures

### 34. Resource Requirements
Fields/attributes:
- project_title
- date_prepared
- requirement_id
- type_of_resource
- resource_description
- quantity
- skill_level
- source
- needed_from_date
- needed_to_date
- location
- basis_of_estimate
- constraints
- risks

### 35. Resource Breakdown Structure
Fields/attributes:
- project_title
- date_prepared
- resource_category
- resource_type
- resource_name
- hierarchy_level
- parent_resource_category
- quantity
- notes

### 36. Communications Management Plan
Fields/attributes:
- project_title
- date_prepared
- stakeholder_or_audience
- communication_information_needs
- communication_method
- frequency
- sender_owner
- receiver
- format
- escalation_process
- technology_used
- confidentiality_level

### 37. Risk Management Plan
Fields/attributes:
- project_title
- date_prepared
- risk_strategy
- methodology
- roles_and_responsibilities
- funding
- timing
- risk_categories
- stakeholder_risk_appetite
- definitions_of_probability_and_impact
- probability_and_impact_matrix
- reporting_formats
- tracking_process

### 38. Risk Register
Fields/attributes:
- project_title
- date_prepared
- risk_id
- risk_title
- risk_description
- risk_category
- cause
- risk_event
- effect
- probability
- impact
- risk_score
- priority
- risk_owner
- risk_response_strategy
- response_actions
- trigger_conditions
- contingency_plan
- residual_risk
- secondary_risk
- status
- review_date

### 39. Risk Report
Fields/attributes:
- project_title
- date_prepared
- overall_project_risk
- top_risks
- risk_exposure_summary
- risk_distribution_by_category
- risk_trends
- risk_response_status
- risk_audit_summary
- recommendations
- escalation_items

### 40. Probability and Impact Assessment
Fields/attributes:
- project_title
- date_prepared
- risk_id
- risk_description
- probability_rating
- impact_rating
- impact_area
- risk_score
- rationale
- assessor
- assessment_date

### 41. Probability and Impact Matrix
Fields/attributes:
- project_title
- date_prepared
- probability_scale
- impact_scale
- matrix_cell_score
- risk_priority_zone
- scoring_rules
- color_zone
- escalation_threshold

### 42. Risk Data Sheet
Fields/attributes:
- project_title
- date_prepared
- risk_id
- risk_description
- risk_category
- cause
- probability
- impact
- owner
- response_strategy
- response_plan
- fallback_plan
- contingency_reserve
- trigger
- status
- lessons_learned

### 43. Procurement Management Plan
Fields/attributes:
- project_title
- date_prepared
- procurement_strategy
- procurement_definition
- procurement_documents
- contract_types
- procurement_risks
- independent_estimates
- source_selection_criteria
- make_or_buy_decisions
- vendor_management_approach
- contract_change_control
- procurement_performance_metrics

### 44. Procurement Strategy
Fields/attributes:
- project_title
- date_prepared
- procurement_item
- procurement_objective
- delivery_method
- contract_payment_type
- procurement_phases
- make_or_buy_decision
- sourcing_approach
- supplier_selection_method
- constraints
- assumptions

### 45. Source Selection Criteria
Fields/attributes:
- project_title
- date_prepared
- criterion_id
- criterion_name
- criterion_description
- weighting
- scoring_method
- minimum_score
- evaluator
- comments

### 46. Stakeholder Engagement Plan
Fields/attributes:
- project_title
- date_prepared
- stakeholder_name_or_group
- current_engagement_level
- desired_engagement_level
- engagement_gap
- stakeholder_engagement_approach
- communication_strategy
- owner
- review_frequency

---

## 4.3 Executing Forms

### 47. Issue Log
Fields/attributes:
- project_title
- date_prepared
- issue_id
- issue_type
- issue_description
- priority
- impact_on_objectives
- responsible_party
- status
- resolution_date
- final_resolution
- comments
- related_risk_id
- related_change_request_id

### 48. Decision Log
Fields/attributes:
- project_title
- date_prepared
- decision_id
- decision_description
- decision_maker
- decision_date
- alternatives_considered
- rationale
- impact
- action_required
- owner
- due_date
- status
- comments

### 49. Change Request
Fields/attributes:
- project_title
- date_prepared
- change_request_id
- requester
- request_date
- change_description
- reason_for_change
- change_type
- impact_on_scope
- impact_on_schedule
- impact_on_cost
- impact_on_quality
- impact_on_resources
- impact_on_risk
- alternatives
- recommendation
- disposition
- approval_status
- approver
- approval_date

### 50. Change Log
Fields/attributes:
- project_title
- date_prepared
- change_id
- change_request_id
- change_description
- change_type
- requester
- date_submitted
- status
- disposition
- approval_date
- implementation_date
- comments

### 51. Lessons Learned Register
Fields/attributes:
- project_title
- date_prepared
- lesson_id
- category
- situation
- impact
- recommendation
- action_owner
- action_due_date
- status
- phase
- knowledge_area
- comments

### 52. Quality Audit
Fields/attributes:
- project_title
- date_prepared
- audit_id
- audit_area
- audit_objective
- audit_criteria
- auditor
- audit_date
- findings
- nonconformities
- recommendations
- corrective_actions
- responsible_owner
- due_date
- status

### 53. Team Performance Assessment
Fields/attributes:
- project_title
- date_prepared
- assessment_id
- team_or_member
- assessment_period
- performance_criteria
- strengths
- improvement_areas
- morale
- collaboration
- communication
- conflict_management
- training_needs
- action_plan

---

## 4.4 Monitoring and Controlling Forms

### 54. Team Member Status Report
Fields/attributes:
- project_title
- reporting_period
- team_member_name
- work_completed
- work_planned_next_period
- issues
- risks
- changes_requested
- hours_worked
- percent_complete
- support_needed
- comments

### 55. Project Status Report
Fields/attributes:
- project_title
- reporting_period
- date_prepared
- prepared_by
- overall_status
- scope_status
- schedule_status
- cost_status
- quality_status
- resource_status
- risk_status
- accomplishments_this_period
- planned_work_next_period
- milestones_status
- budget_summary
- top_issues
- top_risks
- decisions_needed
- change_requests_status
- escalation_required

### 56. Variance Analysis
Fields/attributes:
- project_title
- date_prepared
- variance_id
- baseline_type
- baseline_value
- actual_value
- variance_amount
- variance_percentage
- cause_of_variance
- impact
- corrective_action
- preventive_action
- owner
- due_date
- status

### 57. Earned Value Analysis
Fields/attributes:
- project_title
- date_prepared
- measurement_date
- planned_value_pv
- earned_value_ev
- actual_cost_ac
- schedule_variance_sv
- cost_variance_cv
- schedule_performance_index_spi
- cost_performance_index_cpi
- estimate_at_completion_eac
- estimate_to_complete_etc
- variance_at_completion_vac
- to_complete_performance_index_tcpi
- interpretation
- corrective_actions

### 58. Risk Audit
Fields/attributes:
- project_title
- date_prepared
- audit_id
- risk_id
- risk_owner
- risk_response_reviewed
- effectiveness_of_response
- residual_risk_status
- new_risks_identified
- recommendations
- audit_findings
- action_owner
- due_date
- status

### 59. Contractor Status Report
Fields/attributes:
- project_title
- reporting_period
- contractor_name
- contract_id
- work_completed
- work_planned_next_period
- deliverables_status
- schedule_status
- cost_status
- quality_status
- issues
- risks
- change_requests
- invoices_submitted
- support_needed
- comments

### 60. Procurement Audit
Fields/attributes:
- project_title
- date_prepared
- audit_id
- procurement_item
- vendor_or_supplier
- contract_id
- procurement_process_reviewed
- compliance_findings
- performance_findings
- issues_identified
- lessons_learned
- recommendations
- corrective_actions
- owner
- status

### 61. Contract Closeout Report
Fields/attributes:
- project_title
- date_prepared
- contract_id
- contractor_name
- contract_description
- deliverables_completed
- acceptance_status
- final_cost
- claims_or_disputes
- open_items
- lessons_learned
- documentation_archived
- closeout_approval
- approval_date

### 62. Product Acceptance Form
Fields/attributes:
- project_title
- date_prepared
- deliverable_id
- deliverable_name
- product_or_service_description
- acceptance_criteria
- verification_method
- validation_result
- defects_or_open_items
- accepted_by
- acceptance_date
- conditional_acceptance_notes
- rejection_reason
- signature

---

## 4.5 Closing Forms

### 63. Lessons Learned Summary
Fields/attributes:
- project_title
- date_prepared
- summary_id
- project_phase
- category
- what_went_well
- what_did_not_go_well
- root_cause
- impact
- recommendation
- future_project_guidance
- owner
- archived_location

### 64. Project or Phase Closeout
Fields/attributes:
- project_title
- date_prepared
- closeout_type
- phase_or_project_name
- final_deliverables
- acceptance_status
- open_issues
- open_risks
- open_changes
- final_budget_status
- final_schedule_status
- final_scope_status
- benefits_transition
- operational_handover
- documentation_archived
- resources_released
- contracts_closed
- lessons_learned_completed
- closeout_approval
- approver
- approval_date

---

## 4.6 Agile Forms

### 65. Product Vision
Fields/attributes:
- project_title
- date_prepared
- product_name
- target_customer
- customer_need
- product_description
- key_benefits
- business_goals
- success_metrics
- assumptions
- constraints
- vision_owner

### 66. Product Backlog
Fields/attributes:
- project_title
- date_prepared
- backlog_item_id
- epic_or_feature
- user_story
- description
- priority
- business_value
- effort_estimate
- acceptance_criteria
- status
- sprint_or_release
- owner
- dependencies

### 67. Release Plan
Fields/attributes:
- project_title
- date_prepared
- release_id
- release_name
- release_goal
- release_date
- included_backlog_items
- features
- dependencies
- risks
- acceptance_criteria
- release_owner
- status

### 68. Retrospective
Fields/attributes:
- project_title
- date_prepared
- iteration_or_sprint
- participants
- what_went_well
- what_could_be_improved
- action_items
- action_owner
- due_date
- status
- lessons_learned_link

---

## 5. Supabase Database Requirements

### 5.1 Core Tables
Create migrations for the following minimum tables:

```sql
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  project_code text unique,
  project_title text not null,
  description text,
  methodology text check (methodology in ('predictive','agile','hybrid')) default 'hybrid',
  status text default 'active',
  start_date date,
  target_end_date date,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.form_templates (
  id uuid primary key default gen_random_uuid(),
  template_code text unique not null,
  template_name text not null,
  process_group text not null,
  description text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.form_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.form_templates(id) on delete cascade,
  version_number int not null,
  schema_json jsonb not null,
  is_current boolean default false,
  created_at timestamptz default now(),
  unique(template_id, version_number)
);

create table if not exists public.form_instances (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  template_id uuid not null references public.form_templates(id),
  template_version_id uuid references public.form_template_versions(id),
  title text,
  status text default 'draft' check (status in ('draft','in_review','approved','rejected','archived')),
  current_version int default 1,
  owner_id uuid references auth.users(id),
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.form_instance_values (
  id uuid primary key default gen_random_uuid(),
  form_instance_id uuid not null references public.form_instances(id) on delete cascade,
  field_key text not null,
  value jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(form_instance_id, field_key)
);

create table if not exists public.form_instance_rows (
  id uuid primary key default gen_random_uuid(),
  form_instance_id uuid not null references public.form_instances(id) on delete cascade,
  section_key text not null,
  row_index int not null,
  row_data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.form_attachments (
  id uuid primary key default gen_random_uuid(),
  form_instance_id uuid not null references public.form_instances(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz default now()
);

create table if not exists public.form_approvals (
  id uuid primary key default gen_random_uuid(),
  form_instance_id uuid not null references public.form_instances(id) on delete cascade,
  approver_id uuid references auth.users(id),
  approver_name text,
  approval_role text,
  decision text check (decision in ('pending','approved','rejected','delegated')) default 'pending',
  comments text,
  decided_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.form_audit_log (
  id uuid primary key default gen_random_uuid(),
  form_instance_id uuid references public.form_instances(id) on delete cascade,
  action text not null,
  changed_by uuid references auth.users(id),
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz default now()
);
```

### 5.2 Normalized Register Tables
Create additional normalized tables for operational dashboards:

- `stakeholders`
- `requirements`
- `risks`
- `issues`
- `decisions`
- `change_requests`
- `lessons_learned`
- `deliverables`
- `wbs_items`
- `activities`
- `milestones`
- `resources`
- `cost_estimates`
- `quality_metrics`
- `procurements`
- `contracts`
- `status_reports`
- `agile_backlog_items`

Each table must include:

```sql
id uuid primary key default gen_random_uuid(),
project_id uuid not null references public.projects(id) on delete cascade,
source_form_instance_id uuid references public.form_instances(id),
created_by uuid references auth.users(id),
created_at timestamptz default now(),
updated_at timestamptz default now()
```

Add domain-specific fields matching the form attributes listed above.

---

## 6. Form Template JSON Schema Requirement
Each form template version must store its schema in JSONB using this pattern:

```json
{
  "template_code": "project_charter",
  "template_name": "Project Charter",
  "process_group": "Initiating",
  "sections": [
    {
      "section_key": "general_information",
      "section_title": "General Information",
      "fields": [
        { "key": "project_title", "label": "Project Title", "type": "text", "required": true },
        { "key": "project_sponsor", "label": "Project Sponsor", "type": "text", "required": true },
        { "key": "date_prepared", "label": "Date Prepared", "type": "date", "required": true }
      ]
    },
    {
      "section_key": "summary_milestones",
      "section_title": "Summary Milestones",
      "type": "table",
      "fields": [
        { "key": "milestone", "label": "Milestone", "type": "text", "required": true },
        { "key": "due_date", "label": "Due Date", "type": "date", "required": false }
      ]
    }
  ]
}
```

Create seed files for all templates listed in Section 4.

---

## 7. React + Tailwind Frontend Requirements
Build the following UI:

### 7.1 Pages
- `/projects`
- `/projects/:projectId/dashboard`
- `/projects/:projectId/forms`
- `/projects/:projectId/forms/:templateCode/new`
- `/projects/:projectId/forms/:formInstanceId/edit`
- `/projects/:projectId/forms/:formInstanceId/view`
- `/projects/:projectId/registers/risks`
- `/projects/:projectId/registers/issues`
- `/projects/:projectId/registers/changes`
- `/projects/:projectId/registers/requirements`
- `/projects/:projectId/reports/status`
- `/admin/form-templates`

### 7.2 Components
- `FormTemplateGallery`
- `DynamicFormRenderer`
- `DynamicTableSection`
- `FormFieldRenderer`
- `ApprovalWorkflowPanel`
- `AttachmentUploader`
- `FormVersionHistory`
- `RelatedRecordsPanel`
- `ProjectDashboardCards`
- `RegisterDataTable`
- `ExportMenu`
- `AuditTimeline`

### 7.3 UI/UX Rules
- Use Tailwind responsive layouts.
- Use cards for form sections.
- Use sticky save/submit buttons.
- Add autosave for draft forms.
- Show validation messages per field.
- Allow repeating rows for logs, registers, matrices, milestone lists, WBS items, backlog items, and cost worksheets.
- Allow users to export a form as PDF, Word-compatible HTML, CSV, and JSON.

---

## 8. Role-Based Access Control
Implement the following roles:

- System Admin
- PMO Admin
- Project Executive/Sponsor
- Project Manager
- Team Manager/Lead
- Team Member
- Project Assurance/Quality Assurance
- Procurement Manager
- Finance/Cost Controller
- Stakeholder/Customer Viewer

Access requirements:

- Admins can manage templates.
- Project Managers can create and edit most project forms.
- Sponsors can approve charters, baselines, major changes, and closeout forms.
- Team Members can submit status reports and update assigned issues/actions.
- QA can update quality audits and quality metrics.
- Procurement roles can update procurement and contract forms.
- Viewer roles can read approved forms only.

Use Supabase RLS policies on all project and form tables.

---

## 9. Approval Workflow
Each form instance must support:

- Draft
- Submitted for Review
- Returned for Correction
- Approved
- Rejected
- Archived

Approval rules:

- Project Charter requires Sponsor approval.
- Change Request requires Change Control Board approval.
- Product Acceptance requires Customer or Sponsor approval.
- Project or Phase Closeout requires Sponsor/PMO approval.
- Baselines require Project Manager and Sponsor approval.

---

## 10. Dashboard and Reporting Requirements
Build dashboard widgets that summarize:

- Total forms by status
- Overdue actions
- Open assumptions and constraints
- Stakeholder engagement gaps
- Requirements by priority and status
- Scope change requests
- Open issues by priority
- Risk exposure by category and score
- Schedule variance
- Cost variance
- Quality audit findings
- Open procurement actions
- Product acceptance status
- Lessons learned by category
- Agile backlog by priority/status

---

## 11. Relationships Between Forms
Implement relationship linking so that:

- Requirements can link to stakeholders, WBS deliverables, tests, acceptance records, and backlog items.
- Risks can link to assumptions, issues, change requests, risk audits, and lessons learned.
- Issues can link to decisions, changes, risks, owners, and lessons learned.
- Change requests can link to scope, schedule, cost, quality, risk, and procurement impacts.
- WBS items can link to activities, cost estimates, resource requirements, quality metrics, and deliverables.
- Deliverables can link to acceptance criteria, product acceptance forms, and closeout records.

Use a generic relationship table:

```sql
create table if not exists public.record_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  target_type text not null,
  target_id uuid not null,
  relationship_type text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
```

---

## 12. Validation Rules
Implement validation at both frontend and backend levels:

- Required fields must not be empty.
- Date fields must be valid dates.
- Due dates cannot be earlier than created dates unless explicitly allowed.
- Probability and impact values must follow configured scales.
- Risk score must be calculated from probability and impact.
- Earned value calculations must be calculated automatically where possible.
- Approved forms must become read-only unless revised through a new version.
- Change requests must capture impact on scope, schedule, cost, quality, resource, and risk before approval.

---

## 13. Calculations to Include
Add calculation support for:

- Risk score = probability × impact
- Schedule variance = earned value − planned value
- Cost variance = earned value − actual cost
- SPI = earned value ÷ planned value
- CPI = earned value ÷ actual cost
- EAC, ETC, VAC, and TCPI where sufficient inputs exist
- Duration expected value for three-point estimates
- Cost totals and subtotals for estimating worksheets
- Dashboard rollups by status, owner, priority, and due date

---

## 14. Implementation Deliverables
Generate the following files:

1. Supabase migration files for all database tables.
2. Seed file containing all form template schemas.
3. TypeScript types for templates, form instances, fields, approvals, and registers.
4. React pages and components listed above.
5. Supabase client service functions:
   - createFormInstance
   - updateFormInstance
   - submitFormForApproval
   - approveForm
   - rejectForm
   - archiveForm
   - createFormVersion
   - getFormsByProject
   - getFormDashboardSummary
6. RLS policies.
7. Basic unit tests for form validation and calculations.
8. README explaining how to add a new form template.

---

## 15. Acceptance Criteria
The module is complete when:

- All 68 form templates listed above exist in the database seed file.
- A user can create a project and add any form to that project.
- Each form displays the correct fields and repeating table sections.
- The PMIS can store form values, table rows, approvals, attachments, comments, and version history.
- Key forms such as risk register, issue log, change request, requirements documentation, and stakeholder register sync to normalized register tables.
- Dashboards show live counts and alerts.
- RLS prevents unauthorized access.
- Approved forms are locked and can only be changed by creating a new version.
- Forms can be exported.
- The system is responsive on desktop, tablet, and mobile.

---

## 16. Important Build Notes
- Do not hard-code forms directly into React components.
- Treat form templates as database-driven configuration.
- Keep the form engine reusable.
- Use TypeScript where possible.
- Use Supabase RPC functions or service functions for complex updates.
- Use JSONB for flexible form values, but use normalized tables for reporting-critical registers.
- Build with future PRINCE2, Process Guide, Agile, and custom organizational templates in mind.

